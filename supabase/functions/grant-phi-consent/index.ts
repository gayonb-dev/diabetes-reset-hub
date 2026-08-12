// P2: purpose-keyed consent capture.
//
// Requires ALL of:
//   - a verified subject: an active opaque visitor session, or a valid member JWT
//   - an explicit purpose key from the approved set
//   - the CURRENT notice version, resolved server-side and matched against the
//     version the caller says it displayed
//
// Anything else is rejected. Legacy `phi_consent` rows are never written here
// and never treated as valid consent.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsFor, preflight, json, requireAllowedOrigin } from "../_shared/cors.ts";
import { readSessionToken, resolveVisitorSession, verifiedUserId } from "../_shared/session.ts";
import { noticeVersion, aiHealthEnabled } from "../_shared/config.ts";

const PURPOSE_KEYS = [
  "chat_support",          // non-health membership chat
  "health_ai_processing",  // gated behind the processor/DPA decision
  "health_record_storage",
  "email_updates",
] as const;
type PurposeKey = typeof PURPOSE_KEYS[number];

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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }

  const purpose = body.purpose_key;
  const claimedVersion = body.notice_version;
  const revoke = body.revoke === true;

  if (typeof purpose !== "string" || !PURPOSE_KEYS.includes(purpose as PurposeKey)) {
    return json(req, { error: "unknown_purpose_key", allowed: PURPOSE_KEYS }, 400);
  }
  if (typeof claimedVersion !== "string" || !claimedVersion) {
    return json(req, { error: "notice_version_required" }, 400);
  }

  const current = await noticeVersion(admin);
  if (current === "unset") return json(req, { error: "notice_version_unavailable" }, 503);
  if (claimedVersion !== current) {
    return json(req, { error: "stale_notice_version", current_notice_version: current }, 409);
  }

  // health_ai_processing cannot be granted while the server gate is closed.
  if (purpose === "health_ai_processing" && !(await aiHealthEnabled(admin))) {
    return json(req, { error: "purpose_unavailable", reason: "ai_health_gate_closed" }, 409);
  }

  const userId = await verifiedUserId(admin, req);
  const session = await resolveVisitorSession(admin, readSessionToken(req, body));

  if (!userId && !session) {
    return json(req, { error: "no_verified_subject" }, 401);
  }

  if (revoke) {
    const q = admin.from("consent_records")
      .update({ revoked_at: new Date().toISOString() })
      .eq("purpose_key", purpose)
      .is("revoked_at", null);
    const { error } = userId
      ? await q.eq("user_id", userId)
      : await q.eq("visitor_session_id", session!.id);
    if (error) return json(req, { error: "revoke_failed" }, 500);
    return json(req, { ok: true, revoked: true, purpose_key: purpose });
  }

  const row = userId
    ? {
        subject_kind: "member",
        user_id: userId,
        visitor_session_id: session?.id ?? null,
        visitor_profile_id: session?.visitor_profile_id ?? null,
      }
    : {
        subject_kind: "visitor",
        user_id: null,
        visitor_session_id: session!.id,
        visitor_profile_id: session!.visitor_profile_id,
      };

  const { data, error } = await admin
    .from("consent_records")
    .insert({ ...row, purpose_key: purpose, notice_version: current, source: "server" })
    .select("id, purpose_key, notice_version, granted_at")
    .single();

  if (error) {
    console.error("consent insert failed", error.message);
    return json(req, { error: "consent_write_failed" }, 500);
  }

  return json(req, { ok: true, consent: data });
});
