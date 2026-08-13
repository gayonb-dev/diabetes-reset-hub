// B5 — membership lifecycle evaluator with a seven-day grace window.
//
// One evaluator, used by the server (edge functions and, via a mirrored SQL
// implementation, row-level security) and by the client for presentation. The
// client copy is presentation only: it can never grant access the server has
// not already granted, because every protected read and write is additionally
// gated in the database.
//
// GRACE SEMANTICS
// ---------------
// Grace begins at the FIRST VERIFIED PAYMENT FAILURE — the moment Stripe tells
// us a charge failed — not when a human noticed, not when the row was last
// touched, and not at the period end. It runs for seven days. During grace the
// member keeps full access and sees an honest notice. After grace expires,
// access is withheld until payment succeeds.
//
// A successful payment clears the grace marker entirely, so an unrelated
// failure months later starts a fresh seven days rather than inheriting an
// exhausted window.
//
// Free of Deno globals so it is directly unit-testable.

import {
  canonicalSubscriptionStatus,
  toMs,
  type CanonicalSubscriptionStatus,
  type SubscriptionConditions,
} from "./billingCanonical.ts";

export const GRACE_DAYS = 7;
export const GRACE_MS = GRACE_DAYS * 24 * 60 * 60 * 1000;

export type AccessState =
  /** Everything is paid and current. */
  | "full"
  /** Payment failed; inside the seven-day window; access preserved. */
  | "grace"
  /** A formal card dispute is open against the entitlement funding access. */
  | "suspended_dispute"
  /** Access withheld pending payment or re-subscription. */
  | "blocked";

export type AccessReason =
  | "active"
  | "trialing"
  | "cancelling_at_period_end"
  | "payment_failed_in_grace"
  | "grace_expired"
  | "period_ended"
  | "never_started"
  | "incomplete"
  | "no_subscription"
  | "dispute_hold"
  | "payment_refunded";

/**
 * One paid period. `status` is the canonical order status, so a fully refunded
 * payment stops qualifying while a partially refunded one keeps qualifying.
 */
export interface PaidPeriod {
  status: unknown;
  periodStart?: string | number | Date | null;
  periodEnd?: string | number | Date | null;
}

export interface DisputeHoldFacts {
  /** An unresolved hold exists. */
  open: boolean;
  /** Inquiry/early warning only: raises review, never suspends access. */
  reviewOnly?: boolean;
  /** End of the entitlement the disputed payment funded, when known. */
  entitlementEnd?: string | number | Date | null;
}

export interface MembershipFacts {
  /** Raw Stripe status from the local row. */
  status?: unknown;
  cancelAtPeriodEnd?: boolean | null;
  currentPeriodEnd?: string | number | Date | null;
  trialEnd?: string | number | Date | null;
  /** First verified payment failure for the CURRENT failure episode. */
  graceStartedAt?: string | number | Date | null;
  /** Unresolved dispute hold, when one exists. */
  disputeHold?: DisputeHoldFacts | null;
  /**
   * Every paid period known for this member. Used to recompute entitlement
   * after a refund: a refunded payment only revokes the entitlement IT funded,
   * and only when no other valid paid period covers the moment.
   */
  paidPeriods?: PaidPeriod[] | null;
}

/** True when a fully refunded period covers `nowMs` and nothing else does. */
export function refundRevokesEntitlement(
  periods: PaidPeriod[] | null | undefined,
  nowMs: number,
): boolean {
  if (!periods || periods.length === 0) return false;
  const covers = (p: PaidPeriod) => {
    const start = toMs(p.periodStart ?? null);
    const end = toMs(p.periodEnd ?? null);
    if (start === null || end === null) return false;
    return nowMs >= start && nowMs < end;
  };
  const covering = periods.filter(covers);
  if (covering.length === 0) return false;
  const status = (p: PaidPeriod) => String(p.status ?? "").trim().toLowerCase();
  const anyRefunded = covering.some((p) => status(p) === "refunded");
  if (!anyRefunded) return false;
  const anyValid = covering.some(
    (p) => status(p) === "paid" || status(p) === "partially_refunded",
  );
  return !anyValid;
}


export interface MembershipEvaluation {
  state: AccessState;
  reason: AccessReason;
  canonicalStatus: CanonicalSubscriptionStatus;
  conditions: SubscriptionConditions;
  /** Epoch ms at which grace expires, when in grace. */
  graceEndsAt: number | null;
  /** Whole days left in grace, floored at 0. Only meaningful while in grace. */
  graceDaysRemaining: number;
  /** Convenience: may the member read member-only content? */
  allowRead: boolean;
  /** Convenience: may the member create or change their own content? */
  allowWrite: boolean;
}

/**
 * Evaluates entitlement from local facts only. No Stripe call, so it is safe
 * to run on every request. The local facts are kept current by the webhook.
 */
export function evaluateMembership(
  facts: MembershipFacts | null | undefined,
  nowMs: number = Date.now(),
): MembershipEvaluation {
  if (!facts) return blocked("no_subscription", "none", nowMs, facts ?? null);

  const status = canonicalSubscriptionStatus(facts.status);
  const periodEnd = toMs(facts.currentPeriodEnd);
  const graceStart = toMs(facts.graceStartedAt);
  const graceEndsAt = graceStart === null ? null : graceStart + GRACE_MS;
  const inGraceWindow = graceEndsAt !== null && nowMs < graceEndsAt;

  const conditions: SubscriptionConditions = {
    cancel_at_period_end: facts.cancelAtPeriodEnd === true,
    in_trial: status === "trialing",
    in_grace: (status === "past_due" || status === "unpaid") && inGraceWindow,
  };

  const base = {
    canonicalStatus: status,
    conditions,
    graceEndsAt,
    graceDaysRemaining:
      graceEndsAt === null ? 0 : Math.max(0, Math.ceil((graceEndsAt - nowMs) / 86_400_000)),
  };

  // A formal, unresolved dispute against the entitlement funding access
  // suspends the programme. Inquiries and early warnings never do.
  const hold = facts.disputeHold;
  if (hold?.open && hold.reviewOnly !== true) {
    const entEnd = toMs(hold.entitlementEnd ?? null);
    if (entEnd === null || nowMs < entEnd) {
      return grant("suspended_dispute", "dispute_hold", base);
    }
  }

  // A fully refunded payment revokes only the entitlement it funded.
  if (refundRevokesEntitlement(facts.paidPeriods, nowMs)) {
    return grant("blocked", "payment_refunded", base);
  }


  switch (status) {
    case "trialing":
      return grant("full", "trialing", base);

    case "active":
      // cancel_at_period_end is a CONDITION, not a cancellation. Access
      // continues until the paid period actually ends.
      if (conditions.cancel_at_period_end && periodEnd !== null && nowMs >= periodEnd) {
        return grant("blocked", "period_ended", base);
      }
      return grant(
        "full",
        conditions.cancel_at_period_end ? "cancelling_at_period_end" : "active",
        base,
      );

    case "past_due":
    case "unpaid":
      if (graceStart === null) {
        // Past due, but no verified failure timestamp was recorded — an older
        // row, or a status set by a subscription event rather than an invoice
        // failure. Fall back to the paid period end as the start of the clock,
        // so the member is never dropped on the first webhook.
        if (periodEnd === null) {
          // No marker AND no period end: there is no clock at all, so an open
          // grace window cannot be demonstrated. Granting one here would be an
          // unbounded entitlement that never expires, which is the worse
          // failure. Billing, account and export surfaces stay reachable.
          return grant("blocked", "grace_expired", base);
        }
        if (nowMs >= periodEnd + GRACE_MS) {
          return grant("blocked", "grace_expired", base);
        }
        return grant("grace", "payment_failed_in_grace", base);
      }
      return inGraceWindow
        ? grant("grace", "payment_failed_in_grace", base)
        : grant("blocked", "grace_expired", base);

    case "cancelled":
      // A cancelled subscription keeps access through the period already paid.
      if (periodEnd !== null && nowMs < periodEnd) {
        return grant("full", "cancelling_at_period_end", base);
      }
      return grant("blocked", "period_ended", base);

    case "incomplete":
    case "incomplete_expired":
      return grant("blocked", "incomplete", base);

    case "paused":
      return grant("blocked", "never_started", base);

    case "none":
    default:
      return grant("blocked", "no_subscription", base);
  }
}

function grant(
  state: AccessState,
  reason: AccessReason,
  base: Omit<MembershipEvaluation, "state" | "reason" | "allowRead" | "allowWrite">,
): MembershipEvaluation {
  return {
    ...base,
    state,
    reason,
    // A blocked member may still READ their own account, billing and export
    // surfaces — withholding those would obstruct payment recovery and would
    // obstruct data rights. Blocking applies to programme content and writes.
    allowRead: state !== "blocked",
    allowWrite: state !== "blocked",
  };
}

function blocked(
  reason: AccessReason,
  canonicalStatus: CanonicalSubscriptionStatus,
  _nowMs: number,
  _facts: MembershipFacts | null,
): MembershipEvaluation {
  return {
    state: "blocked",
    reason,
    canonicalStatus,
    conditions: { cancel_at_period_end: false, in_trial: false, in_grace: false },
    graceEndsAt: null,
    graceDaysRemaining: 0,
    allowRead: false,
    allowWrite: false,
  };
}

/**
 * Decides the grace marker after a payment event.
 *
 * - First verified failure starts the clock.
 * - Subsequent failures in the same episode do NOT restart it; a member cannot
 *   be given an unbounded window by repeated failed retries.
 * - A success clears it.
 */
export function nextGraceMarker(input: {
  event: "payment_failed" | "payment_succeeded";
  existingGraceStartedAt: string | number | Date | null | undefined;
  eventAt: string | number | Date;
}): string | null {
  if (input.event === "payment_succeeded") return null;
  const existing = toMs(input.existingGraceStartedAt);
  if (existing !== null) return new Date(existing).toISOString();
  const at = toMs(input.eventAt);
  return at === null ? new Date().toISOString() : new Date(at).toISOString();
}
