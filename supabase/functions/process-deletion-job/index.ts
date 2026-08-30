// P3: account deletion worker.
//
// Runs the deletion job to completion. It is idempotent and resumable: every
// step can be re-run after a failure without double-deleting or skipping.
// It never claims completion it has not verified:
//   - expected-vs-actual reconciliation decides success, not the absence of an error
//   - a target that deleted nothing while rows existed is a FAILURE, not a no-op
//   - an unverified processor leaves the job WAITING, never completed
//   - the auth identity is removed last, and the lifecycle lock holds until then
//
// Authorization: service-role bearer or the internal function secret. Never a
// member credential.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsFor, preflight, json } from "../_shared/cors.ts";
import { DELETABLE } from "../_shared/inventory.ts";
import { isTerminal, type ProcessorItem } from "../_shared/processors.ts";
import { stripeDeletionEnabled, stripeMode, stripeKeyClassMismatch } from "../_shared/config.ts";
import { collectBillingEvidence, carriedPendingIds } from "../_shared/billingEvidence.ts";

const ACTIVE_STATES = [
  "access_blocked", "in_progress", "waiting_for_processor", "blocked_on_processor",
  "partial", "failed", "reconciled",
];

interface StepResult {
  step: string;
  expected: number;
  deleted: number;
  status: "ok" | "failed" | "skipped";
  error?: string;
}

function authorized(req: Request): boolean {
  const internal = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  const provided = req.headers.get("x-internal-secret");
  if (internal && provided && provided === internal) return true;
  const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return Boolean(bearer && service && bearer === service);
}

async function countRows(
  admin: SupabaseClient, table: string, column: string, values: string[] | string,
): Promise<number> {
  const q = admin.from(table).select("*", { count: "exact", head: true });
  const { count, error } = Array.isArray(values)
    ? await q.in(column, values)
    : await q.eq(column, values);
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);
  if (!authorized(req)) return json(req, { error: "forbidden" }, 403);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json(req, { error: "invalid_json" }, 400); }

  const jobId = String(body.job_id ?? "");
  if (!jobId) return json(req, { error: "job_id_required" }, 400);
  const dryRun = body.dry_run === true;
  let stopAfter = typeof body.stop_after === "string" ? body.stop_after : null as string | null;

  const { data: job, error: jErr } = await admin
    .from("deletion_jobs").select("*").eq("id", jobId).maybeSingle();
  if (jErr || !job) return json(req, { error: "job_not_found" }, 404);
  if (!job.identity_verified_at) return json(req, { error: "identity_not_verified" }, 409);
  if (!ACTIVE_STATES.includes(job.state)) {
    // Idempotent no-op: report the terminal state rather than re-running.
    return json(req, {
      ok: true, no_op: true, state: job.state,
      receipt: job.receipt ?? null, reconciliation: job.reconciliation ?? null,
    }, 200, { "Cache-Control": "no-store" });
  }

  // subject_ref survives auth deletion so a processed job stays addressable.
  const userId = (job.user_id ?? job.subject_ref) as string;
  const { data: userRow } = await admin.auth.admin.getUserById(userId);
  const email = userRow?.user?.email ?? "";
  const authIdentityPresent = Boolean(userRow?.user);

  const { data: vps } = await admin.from("visitor_profiles").select("id").eq("user_id", userId);
  const vpIds = (vps ?? []).map((v: { id: string }) => v.id);

  // Parent-owned surfaces: resolve member-owned parent keys before deletion.
  const { data: parentTickets } = await admin
    .from("support_tickets").select("id").eq("user_id", userId);
  const ticketIds = (parentTickets ?? []).map((t: { id: string }) => t.id);

  // ==== PRECONDITION: processor cancellation gates destructive deletion ====
  // Nothing below this block runs until the member's billing relationship is
  // resolved. No session is revoked, no row is deleted and the auth identity is
  // untouched, so the account stays usable for billing resolution.
  const preStripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const preCancellationEnabled = await stripeDeletionEnabled(admin);
  const preCarriedIds = carriedPendingIds(job.processor_items);
  const preEvidence = await collectBillingEvidence(admin, userId, email || null);
  const preOutstanding = Array.from(new Set([...preEvidence.pendingIds, ...preCarriedIds]));

  if (!preCancellationEnabled && !preEvidence.neverBilled) {
    // Zero Stripe requests, zero deletions. Honest, non-terminal waiting state.
    const blockedReceipt = {
      job_id: jobId,
      updated_at: new Date().toISOString(),
      local_account_deletion: "not_started",
      processors_pending: ["stripe: billing subscription cancellation"],
      note:
        "Deletion has not started. The billing relationship with the payment processor " +
        "must be cancelled first. No data has been deleted and no cancellation has occurred.",
    };
    if (!dryRun) {
      const items = ((job.processor_items as ProcessorItem[]) ?? []).map((p) =>
        p.processor === "stripe" && /subscription cancellation/i.test(String(p.item ?? ""))
          ? {
            ...p,
            status: "tracked_not_verified" as const,
            pending_ids: preOutstanding,
            basis: preEvidence.indeterminate
              ? "billing evidence could not be fully read; failing closed"
              : preEvidence.reasons.join("; "),
            owner_action:
              "OWNER: enable stripe_deletion_enabled or cancel the billing subscription at " +
              "the processor, then re-run this job.",
          }
          : p
      );
      await admin.from("deletion_jobs").update({
        state: "blocked_on_processor",
        processor_items: items,
        receipt: blockedReceipt,
      }).eq("id", jobId);
    }
    return json(req, {
      ok: true,
      state: "blocked_on_processor",
      local_account_deletion: "not_started",
      steps: [],
      receipt: blockedReceipt,
    }, 200, { "Cache-Control": "no-store" });
  }

  // Cancellation is enabled and ids are outstanding: cancel FIRST, and only
  // continue to destructive deletion once each exact id is confirmed.
  const preCancelled: string[] = [];
  let preCancelError: string | null = null;
  if (preOutstanding.length && !dryRun) {
    const mode0 = await stripeMode(admin);
    const mismatch0 = stripeKeyClassMismatch(mode0, preStripeKey);
    if (mismatch0) {
      preCancelError = `stripe key class disagrees with stripe_mode: ${mismatch0}`;
    } else {
      for (const id of preOutstanding) {
        try {
          const res = await fetch(`https://api.stripe.com/v1/subscriptions/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${preStripeKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          });
          const b = await res.json().catch(() => ({}));
          // A missing object is NOT proof of cancellation: the id may belong to
          // another account or key mode. Only an explicit canceled status counts.
          if (res.status === 200 && b.status === "canceled") preCancelled.push(id);
          else {
            preCancelError =
              `${id}: ${res.status} ${JSON.stringify(b?.error ?? b).slice(0, 200)}`;
            break;
          }
        } catch (e) {
          preCancelError = `${id}: ${(e as Error).message}`;
          break;
        }
      }
    }

    if (preCancelError) {
      // Unverified cancellation is a stop condition, not a partial deletion.
      const stillOutstanding = preOutstanding.filter((i) => !preCancelled.includes(i));
      const blockedReceipt = {
        job_id: jobId,
        updated_at: new Date().toISOString(),
        local_account_deletion: "not_started",
        processors_pending: ["stripe: billing subscription cancellation"],
        note:
          "Cancellation at the payment processor could not be verified. No data has been " +
          "deleted. The request stays open and will resume once cancellation succeeds.",
      };
      const items = ((job.processor_items as ProcessorItem[]) ?? []).map((p) =>
        p.processor === "stripe" && /subscription cancellation/i.test(String(p.item ?? ""))
          ? {
            ...p,
            status: "tracked_not_verified" as const,
            pending_ids: stillOutstanding,
            cancelled_ids: preCancelled,
            basis: preCancelError!,
            owner_action:
              "OWNER: resolve the failed cancellation at the processor, then re-run this job.",
          }
          : p
      );
      await admin.from("deletion_jobs").update({
        state: "blocked_on_processor",
        processor_items: items,
        receipt: blockedReceipt,
      }).eq("id", jobId);
      return json(req, {
        ok: false,
        state: "blocked_on_processor",
        local_account_deletion: "not_started",
        error: "processor_cancellation_unverified",
        steps: [],
        receipt: blockedReceipt,
      }, 200, { "Cache-Control": "no-store" });
    }
  }

  if (!dryRun) {
    await admin.from("deletion_jobs").update({ state: "in_progress" }).eq("id", jobId);
  }


  const steps: StepResult[] = [];
  let hardFailure: string | null = null;

  // ---- step 1: queue shutdown, before any row disappears underneath it ----
  try {
    let stopped = 0;
    if (!dryRun) {
      const { count: s } = await admin.from("visitor_sessions")
        .update({ revoked_at: new Date().toISOString() }, { count: "exact" })
        .eq("user_id", userId).is("revoked_at", null);
      stopped += s ?? 0;
      if (vpIds.length) {
        const { count: s2 } = await admin.from("visitor_sessions")
          .update({ revoked_at: new Date().toISOString() }, { count: "exact" })
          .in("visitor_profile_id", vpIds).is("revoked_at", null);
        stopped += s2 ?? 0;
      }
      await admin.from("meal_plans")
        .update({ generation_status: "cancelled" })
        .eq("member_id", userId).eq("generation_status", "pending");
    }
    steps.push({ step: "queue_shutdown", expected: stopped, deleted: stopped, status: "ok" });
  } catch (e) {
    hardFailure = `queue_shutdown: ${(e as Error).message}`;
    steps.push({ step: "queue_shutdown", expected: 0, deleted: 0, status: "failed", error: hardFailure });
  }

  // ---- step 1b: record the verified processor cancellation outcome ----

  // Cancellation is settled by the precondition block above: execution only
  // reaches here when every outstanding subscription id was confirmed cancelled
  // (or confirmed already absent at the processor), or when local evidence
  // proved the account was never connected to the processor at all. This step
  // only records that verified outcome.
  const cancelledSubs: string[] = [...preCancelled];
  const pendingIds: string[] = preOutstanding;
  const cancellationEnabled = preCancellationEnabled;
  const stripeStatus: StepResult["status"] = dryRun && preOutstanding.length ? "skipped" : "ok";
  const stripeError: string | undefined = undefined;
  steps.push({
    step: "stripe_subscription",
    expected: dryRun ? preOutstanding.length : cancelledSubs.length,
    deleted: cancelledSubs.length,
    status: stripeStatus,
    error: stripeError,
  });


  // ---- step 2: database rows, in dependency order ----
  // Grouped by order, deletions within a group run in parallel. The inventory
  // orders children before parents; same-order tables are independent.

  if (!hardFailure && stopAfter !== "queue_shutdown") {
    const groups = new Map<number, typeof DELETABLE>();
    for (const entry of DELETABLE) {
      if (entry.table === "deletion_jobs") continue;
      const arr = groups.get(entry.order) ?? [];
      arr.push(entry);
      groups.set(entry.order, arr);
    }
    const ordered = Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);

    for (const [, entries] of ordered) {
      if (hardFailure) break;
      const groupSteps = await Promise.all(
        entries.map(async (entry): Promise<StepResult> => {
          const isVp = entry.match === "visitor_profile";
          const isEmail = entry.match === "email" || entry.match === "customer_email";
          const isParent = entry.match === "parent";
          const parentKeys = entry.table === "support_ticket_notes" ? ticketIds : [];
          if (isVp && !vpIds.length) {
            return { step: entry.table, expected: 0, deleted: 0, status: "skipped" };
          }
          if (isEmail && !email) {
            return { step: entry.table, expected: 0, deleted: 0, status: "skipped" };
          }
          if (isParent && !parentKeys.length) {
            return { step: entry.table, expected: 0, deleted: 0, status: "skipped" };
          }

          try {
            let expected: number;
            if (isEmail) {
              const { count } = await admin.from(entry.table)
                .select("*", { count: "exact", head: true }).ilike(entry.column, email);
              expected = count ?? 0;
            } else if (isVp) {
              expected = await countRows(admin, entry.table, entry.column, vpIds);
            } else if (isParent) {
              expected = await countRows(admin, entry.table, entry.column, parentKeys);
            } else {
              expected = await countRows(admin, entry.table, entry.column, userId);
            }

            if (expected === 0) {
              return { step: entry.table, expected: 0, deleted: 0, status: "ok" };
            }
            if (dryRun) {
              return { step: entry.table, expected, deleted: 0, status: "skipped" };
            }

            const del = admin.from(entry.table).delete({ count: "exact" });
            let deleted: number | null = null;
            let error: Error | null = null;
            if (isEmail) {
              const r = await del.ilike(entry.column, email);
              deleted = r.count; error = r.error as Error | null;
            } else if (isVp) {
              const r = await del.in(entry.column, vpIds);
              deleted = r.count; error = r.error as Error | null;
            } else if (isParent) {
              const r = await del.in(entry.column, parentKeys);
              deleted = r.count; error = r.error as Error | null;
            } else {
              const r = await del.eq(entry.column, userId);
              deleted = r.count; error = r.error as Error | null;
            }

            if (error) {
              return { step: entry.table, expected, deleted: 0, status: "failed", error: error.message };
            }

            const actual = deleted ?? 0;
            if (actual === 0) {
              return {
                step: entry.table, expected, deleted: 0, status: "failed",
                error: "no_op_target: rows existed but none were removed",
              };
            }
            return { step: entry.table, expected, deleted: actual, status: "ok" };
          } catch (e) {
            return { step: entry.table, expected: -1, deleted: 0, status: "failed", error: (e as Error).message };
          }
        }),
      );

      for (const s of groupSteps) {
        steps.push(s);
        if (s.status === "failed") {
          hardFailure = `${s.step}: ${s.error}`;
          break;
        }
        if (stopAfter === s.step) {
          stopAfter = "__done__"; // consume it once
          break;
        }
      }
      if (stopAfter === "__done__") break;
    }
  }

  // ---- step 3: storage objects ----
  let storageDeleted = 0;
  let storageStatus: StepResult["status"] = "ok";
  if (!hardFailure && !dryRun) {
    try {
      const { data: buckets } = await admin.storage.listBuckets();
      for (const b of buckets ?? []) {
        const { data: objs } = await admin.storage.from(b.name).list(userId, { limit: 1000 });
        const paths = (objs ?? []).map((o) => `${userId}/${o.name}`);
        if (paths.length) {
          const { error } = await admin.storage.from(b.name).remove(paths);
          if (error) throw new Error(error.message);
          storageDeleted += paths.length;
        }
      }
    } catch (e) {
      storageStatus = "failed";
      hardFailure = `storage: ${(e as Error).message}`;
    }
  }
  steps.push({ step: "storage_objects", expected: storageDeleted, deleted: storageDeleted, status: storageStatus });

  // ---- step 4: reconciliation, expected vs actual ----
  // Only reconcile tables where the deletion step reported fewer rows than
  // expected or a non-ok status; ok exact matches are assumed clean.
  const remaining: Record<string, number> = {};
  if (!dryRun) {
    const reconcileTargets = steps
      .filter((s) => s.status !== "ok" || (s.expected > 0 && s.deleted < s.expected))
      .map((s) => s.step);
    const reconcileSet = new Set(reconcileTargets);

    await Promise.all(
      DELETABLE.map(async (entry) => {
        if (entry.table === "deletion_jobs") return;
        if (!reconcileSet.has(entry.table)) return;
        try {
          const isVp = entry.match === "visitor_profile";
          const isEmail = entry.match === "email" || entry.match === "customer_email";
          if ((isVp && !vpIds.length) || (isEmail && !email)) return;
          let n: number;
          if (isEmail) {
            const { count } = await admin.from(entry.table)
              .select("*", { count: "exact", head: true }).ilike(entry.column, email);
            n = count ?? 0;
          } else {
            n = await countRows(admin, entry.table, entry.column, isVp ? vpIds : userId);
          }
          if (n > 0) remaining[entry.table] = n;
        } catch (e) {
          remaining[`${entry.table}__lookup_failed`] = -1;
          hardFailure ??= `reconcile ${entry.table}: ${(e as Error).message}`;
        }
      }),
    );
  }

  // ---- step 5: auth identity LAST ----
  // "Last" means after every other category AND after every processor is
  // verified. While any processor is unverified the job stays waiting and the
  // login — and therefore the lifecycle lock — is deliberately kept.
  const processorsPre = (job.processor_items as ProcessorItem[]) ?? [];
  // A processor item in a TERMINAL disposition (including an owner-approved
  // retention) does not block local account deletion. Only an unresolved item
  // does — and it never leaves the member without a visible status.
  const unverifiedPre = processorsPre.filter((p) => !isTerminal(p.status));
  let authDeleted = false;
  const dbClean = !hardFailure && Object.keys(remaining).length === 0;
  if (dbClean && !dryRun && authIdentityPresent && !stopAfter && unverifiedPre.length === 0) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      hardFailure = `auth_identity: ${error.message}`;
      steps.push({ step: "auth_identity", expected: 1, deleted: 0, status: "failed", error: error.message });
    } else {
      authDeleted = true;
      steps.push({ step: "auth_identity", expected: 1, deleted: 1, status: "ok" });
    }
  } else {
    steps.push({
      step: "auth_identity",
      expected: authIdentityPresent ? 1 : 0,
      deleted: 0,
      status: "skipped",
      error: unverifiedPre.length > 0 ? "waiting_for_processor" : undefined,
    } as never);
  }

  // ---- step 6: processors. Unverified => waiting, never completed. ----
  // The Stripe item is promoted to verified_deleted only when this run actually
  // observed the processor return `canceled` for each exact subscription id.
  const processors: ProcessorItem[] = (((job.processor_items as ProcessorItem[]) ?? []).map((p) => {
    // Only the Stripe *subscription cancellation* item is resolved here.
    // Financial/customer/checkout records keep their honest disposition.
    const isCancellationItem = p.processor === "stripe" &&
      /subscription cancellation/i.test(String(p.item ?? ""));
    if (!isCancellationItem || dryRun) return p;

    if (stripeStatus === "ok") {
      // A resumed run finds nothing left to cancel; the receipt from the run
      // that actually cancelled is authoritative and is never overwritten.
      if (!cancelledSubs.length && p.status === "verified_cancelled") return p;
      if (!cancelledSubs.length) {
        return {
          ...p,
          status: "not_applicable" as const,
          item: p.item,
          pending_ids: [],
          basis: "no billing subscription remained to cancel",
          verified_at: new Date().toISOString(),
        };
      }
      return {
        ...p,
        status: "verified_cancelled" as const,
        pending_ids: [],
        cancelled_ids: cancelledSubs,
        basis:
          `processor returned canceled for ${cancelledSubs.length} subscription(s): ${cancelledSubs.join(", ")}`,
        verified_at: new Date().toISOString(),
      };
    }
    // Outstanding: keep the exact object ids on the item so a later run — and
    // the member reading the receipt — knows precisely what is still owed.
    return {
      ...p,
      status: "tracked_not_verified" as const,
      pending_ids: pendingIds,
      basis: stripeError ?? p.basis,
      owner_action: p.owner_action ??
        "OWNER: cancel the outstanding billing subscription at the processor, then re-run this job.",
    };
  }));


  const unverified = processors.filter((p) => !isTerminal(p.status));
  const ownerActions = processors.filter((p) => p.owner_action && !isTerminal(p.status));
  const processorNotes = processors;

  // ---- final state ----
  // Local deletion (database, storage, sessions, auth) is tracked separately
  // from unresolved processor actions, so neither is misreported as the other.
  const localComplete = !hardFailure &&
    Object.keys(remaining).length === 0 &&
    (authDeleted || !authIdentityPresent);

  let state: string;
  if (hardFailure) state = "failed";
  else if (Object.keys(remaining).length > 0) state = "partial";
  else if (unverified.length > 0) state = "waiting_for_processor";
  else if (!localComplete) state = "partial";
  else state = "completed";

  // Member-facing receipt. It never carries exact processor object identifiers
  // or internal owner instructions; those stay on the service-role-only job row
  // and are classified as linkable processor data in the data inventory.
  const receipt = state === "completed" || state === "waiting_for_processor"
    ? {
      job_id: jobId,
      finished_at: new Date().toISOString(),
      database_records_removed: steps.reduce((a, s) => a + Math.max(s.deleted, 0), 0),
      storage_objects_removed: storageDeleted,
      auth_identity_removed: authDeleted,
      local_account_deletion: localComplete ? "completed" : "incomplete",
      processors_pending: unverified.map((p) =>
        p.processor === "stripe" && /subscription cancellation/i.test(String(p.item ?? ""))
          ? "Stripe subscription cancellation pending"
          : `${p.processor}: pending`
      ),
      processor_dispositions: processors.map((p) => ({
        processor: p.processor,
        item: p.item,
        status: p.status === "verified_cancelled" ? "verified cancelled" : p.status,
      })),
      note:
        "This receipt contains no personal data and no payment-processor identifiers.",
    }
    : null;


  if (!dryRun) {
    await admin.from("deletion_jobs").update({
      state,
      failure_reason: hardFailure,
      processor_items: processorNotes,
      reconciliation: { steps, remaining, reconciled_at: new Date().toISOString() },
      receipt,
      completed_at: state === "completed" ? new Date().toISOString() : null,
    }).eq("id", jobId);
  }

  return json(req, {
    ok: !hardFailure,
    dry_run: dryRun,
    state,
    steps,
    remaining,
    auth_identity_removed: authDeleted,
    processors_pending: unverified.map((p) => `${p.processor}: ${p.item}`),
    local_account_deletion: localComplete ? "completed" : "incomplete",
    receipt,
    failure_reason: hardFailure,
  }, hardFailure ? 500 : 200, { "Cache-Control": "no-store" });
});
