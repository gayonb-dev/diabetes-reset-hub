// B5 — the client's view of membership state.
//
// This re-exports the SAME evaluator the server uses. There is deliberately no
// second implementation: two copies of a lifecycle rule drift, and the drift
// always shows up as a member who can see a page the server then refuses to
// serve (or worse, the reverse).
//
// The client copy is PRESENTATION ONLY. It decides what to show and what to
// explain. It cannot grant anything: every protected write is independently
// gated in the database by `public.membership_write_allowed()`, which mirrors
// this logic in SQL.

export {
  evaluateMembership,
  GRACE_DAYS,
  GRACE_MS,
  type AccessState,
  type AccessReason,
  type MembershipEvaluation,
  type MembershipFacts,
} from "../../supabase/functions/_shared/membershipLifecycle";

import { evaluateMembership, type MembershipEvaluation } from "../../supabase/functions/_shared/membershipLifecycle";

/** Shape of the local `subscriptions` row as the client reads it. */
export interface SubscriptionRow {
  status: string;
  cancel_at_period_end?: boolean | null;
  current_period_end?: string | null;
  trial_end_date?: string | null;
  grace_started_at?: string | null;
}

export function evaluateSubscriptionRow(
  row: SubscriptionRow | null | undefined,
  nowMs: number = Date.now(),
): MembershipEvaluation {
  if (!row) return evaluateMembership(null, nowMs);
  return evaluateMembership(
    {
      status: row.status,
      cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
      currentPeriodEnd: row.current_period_end ?? null,
      trialEnd: row.trial_end_date ?? null,
      graceStartedAt: row.grace_started_at ?? null,
    },
    nowMs,
  );
}

/**
 * Honest, non-alarming member-facing wording for each state. Nothing here
 * claims a payment succeeded, and nothing threatens immediate loss of access
 * while access in fact continues.
 */
export function membershipNotice(
  ev: MembershipEvaluation,
): { tone: "info" | "warning" | "blocked"; title: string; body: string } | null {
  switch (ev.reason) {
    case "payment_failed_in_grace": {
      const d = ev.graceDaysRemaining;
      return {
        tone: "warning",
        title: "We couldn't take your last payment",
        body:
          `Your access continues${d > 0 ? ` for ${d} more day${d === 1 ? "" : "s"}` : ""} while you update your card. ` +
          "Update your payment method and everything carries on as normal.",
      };
    }
    case "grace_expired":
      return {
        tone: "blocked",
        title: "Your membership is paused",
        body:
          "We couldn't take payment, so your programme is on hold. Update your payment method to pick up exactly where you left off — nothing has been deleted.",
      };
    case "period_ended":
      return {
        tone: "blocked",
        title: "Your membership has ended",
        body:
          "Your paid period is over. You can restart at any time, and your history is still here.",
      };
    case "cancelling_at_period_end":
      return {
        tone: "info",
        title: "Your membership is set to end",
        body: "You keep full access until the end of the current period. You can reactivate any time before then.",
      };
    case "incomplete":
      return {
        tone: "blocked",
        title: "Your membership isn't set up yet",
        body: "The first payment hasn't completed. Finish checkout to unlock your programme.",
      };
    default:
      return null;
  }
}
