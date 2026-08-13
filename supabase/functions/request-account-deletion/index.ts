// P3: member account deletion request -> deletion lifecycle state machine.
//
// Requires a verified JWT AND a single-use reauth ticket bound to "delete".
// The job is created already identity-verified (the ticket IS the verification)
// and moves straight to access_blocked, which atomically sets
// profiles.deletion_pending and engages the RLS lifecycle lock.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsFor, preflight, json, requireAllowedOrigin } from "../_shared/cors.ts";
import { sha256Hex, verifiedUserId } from "../_shared/session.ts";
import { buildProcessorItems } from "../_shared/processors.ts";
import { collectBillingEvidence } from "../_shared/billingEvidence.ts";
import { stripeDeletionEnabled } from "../_shared/config.ts";
import { guardRequest, LIMITS } from "../_shared/abuseGuard.ts";


Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const originBlocked = requireAllowedOrigin(req);
  if (originBlocked) return originBlocked;
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json(req, { error: "invalid_json" }, 400); }

  const userId = await verifiedUserId(admin, req);
  if (!userId) return json(req, { error: "unauthenticated" }, 401);

  // Part 7. Temporary throttle only — erasure is a right, so this pauses a
  // burst of repeated clicks and expires on its own. It is never a denial.
  const delGuard = await guardRequest(admin, req, {
    scope: "request-account-deletion",
    userId,
    rightsEndpoint: true,
    ...LIMITS.rights,
  });
  if (!delGuard.allowed) return json(req, delGuard.body, 429);

  const ticket = req.headers.get("x-reauth-ticket") ?? body.ticket;
  if (typeof ticket !== "string" || !ticket) {
    return json(req, { error: "reauth_ticket_required" }, 401);
  }

  // Non-consuming validity/action check first, so an invalid or wrong-scoped
  // ticket is still rejected as such and never masked by the 503 below.
  const ticketHash = await sha256Hex(ticket);
  {
    const { data: t } = await admin.from("reauth_tickets")
      .select("id").eq("token_hash", ticketHash).eq("user_id", userId)
      .eq("action", "delete").is("consumed_at", null).gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!t) return json(req, { error: "invalid_or_expired_ticket" }, 401);
  }

  // ---- Pre-job precondition, BEFORE the ticket is consumed ----
  // Destructive deletion may not begin while a payment-processor relationship
  // is unresolved and cancellation is unavailable. Nothing is changed here: no
  // Stripe request, no ticket consumption, no job, no lock, no deletion. The
  // member keeps full use of the app so billing can be resolved.
  const cancellationEnabled = await stripeDeletionEnabled(admin);
  if (!cancellationEnabled) {
    const { data: userRow } = await admin.auth.admin.getUserById(userId);
    const evidence = await collectBillingEvidence(admin, userId, userRow?.user?.email ?? null);
    if (!evidence.neverBilled) {
      console.log("deletion refused pre-job", JSON.stringify({
        user_id: userId, indeterminate: evidence.indeterminate, reasons: evidence.reasons,
      }));
      return json(req, {
        error: "deletion_temporarily_unavailable",
        message:
          "Account deletion is temporarily unavailable while your billing relationship is " +
          "resolved. Your account is unchanged and fully usable. You can review or cancel " +
          "your membership in Billing, or contact support and we will complete the request.",
        retryable: true,
      }, 503);
    }
  }

  const { data: consumed, error: cErr } = await admin.rpc("consume_reauth_ticket", {
    p_token_hash: ticketHash,
    p_user_id: userId,
    p_action: "delete",
  });
  if (cErr || consumed !== true) return json(req, { error: "invalid_or_expired_ticket" }, 401);


  const { data: existing } = await admin
    .from("deletion_jobs")
    .select("id, state")
    .eq("user_id", userId)
    .not("state", "in", '("completed","reversed")')
    .maybeSingle();

  if (existing) {
    return json(req, { ok: true, job: existing, note: "A deletion job is already active." });
  }

  const now = new Date().toISOString();
  const { data: job, error } = await admin
    .from("deletion_jobs")
    .insert({
      user_id: userId,
      state: "access_blocked",
      identity_verified_at: now,
      processor_items: await buildProcessorItems(admin, userId),
      notes: "Created via verified reauth ticket.",
    })
    .select("id, state, requested_at, access_blocked_at")
    .single();

  if (error) {
    console.error("deletion job create failed", error.message);
    return json(req, { error: "deletion_request_failed" }, 500);
  }

  return json(req, {
    ok: true,
    job,
    access_blocked: true,
    message:
      "Your account is now locked while deletion is carried out. Auth removal and processor reconciliation are tracked separately and are not claimed complete until verified.",
  });
});
