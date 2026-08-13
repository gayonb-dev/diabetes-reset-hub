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
  mapLegacyAccessState,
  surfacesFor,
  surfaceAllowed,
  ALL_SURFACES,
  ACCOUNT_SURFACES,
  DELETION_SURFACES,
  GRACE_DAYS,
  GRACE_MS,
  type AccessState,
  type AccessReason,
  type Surface,
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
  extra: { deletionRestricted?: boolean } = {},
): MembershipEvaluation {
  if (!row) {
    return evaluateMembership(
      extra.deletionRestricted ? { deletionRestricted: true } : null,
      nowMs,
    );
  }
  return evaluateMembership(
    {
      status: row.status,
      deletionRestricted: extra.deletionRestricted === true,
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
): { tone: "info" | "warning" | "restricted"; title: string; body: string } | null {
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
        tone: "restricted",
        title: "Your membership is paused",
        body:
          "We couldn't take payment, so your programme is on hold. Update your payment method to pick up exactly where you left off — nothing has been deleted.",
      };
    case "period_ended":
      return {
        tone: "restricted",
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
        tone: "restricted",
        title: "Your membership isn't set up yet",
        body: "The first payment hasn't completed. Finish checkout to unlock your programme.",
      };
    case "dispute_hold":
      return {
        tone: "restricted",
        title: "Your membership is on hold",
        body:
          "Your bank has raised a formal dispute on a payment, so your programme is paused while it's resolved. Your billing, account settings, data export and support are all still available — contact us and we'll help sort it out.",
      };
    case "deletion_pending":
      return {
        tone: "restricted",
        title: "Your account is being closed",
        body:
          "You asked us to delete your account, so your programme is closed while we finish. Your settings and support are still available if you need them.",
      };
    case "payment_refunded":
      return {
        tone: "restricted",
        title: "Your membership is paused",
        body:
          "The payment covering this period was refunded, so your programme is on hold. Nothing has been deleted — restart any time and pick up where you left off.",
      };

    default:
      return null;
  }
}
