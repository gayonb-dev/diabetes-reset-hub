// B5, membership lifecycle evaluator with a seven-day grace window.
//
// One evaluator, used by the server (edge functions and, via a mirrored SQL
// implementation, row-level security) and by the client for presentation. The
// client copy is presentation only: it can never grant access the server has
// not already granted, because every protected read and write is additionally
// gated in the database.
//
// GRACE SEMANTICS
// ---------------
// Grace begins at the FIRST VERIFIED PAYMENT FAILURE, the moment Stripe tells
// us a charge failed, not when a human noticed, not when the row was last
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

/**
 * The approved canonical access vocabulary. There is no `blocked` state: a
 * member is never simply "blocked", they are restricted for a stated reason,
 * and each reason keeps a different set of surfaces reachable.
 */
export type AccessState =
  /** Everything is paid and current. */
  | "allowed"
  /** Payment failed; inside the seven-day window; access preserved. */
  | "grace"
  /** Programme withheld pending payment, re-subscription or refund recovery. */
  | "restricted_billing"
  /** Account deletion is in progress; the deletion lifecycle governs access. */
  | "restricted_deletion"
  /** A formal card dispute is open against the entitlement funding access. */
  | "suspended_dispute";

/**
 * Historical/internal values that predate the approved vocabulary. Mapped at
 * the read boundary only, nothing writes these names again.
 */
export function mapLegacyAccessState(value: unknown): AccessState {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "full":
      return "allowed";
    case "blocked":
      return "restricted_billing";
    case "allowed":
    case "grace":
    case "restricted_billing":
    case "restricted_deletion":
    case "suspended_dispute":
      return String(value).trim().toLowerCase() as AccessState;
    default:
      return "restricted_billing";
  }
}

/** Areas of the member app an access state may permit. */
export type Surface = "programme" | "billing" | "settings" | "support" | "profile";

/** Every surface, in a stable order. */
export const ALL_SURFACES: Surface[] = [
  "programme",
  "billing",
  "settings",
  "support",
  "profile",
];

/**
 * Account-administration surfaces. Withholding these would obstruct payment
 * recovery, cancellation and data rights, so they stay reachable whenever the
 * member is signed in and billing (not deletion) is the reason for restriction.
 */
export const ACCOUNT_SURFACES: Surface[] = ["billing", "settings", "support", "profile"];

/**
 * Surfaces the deletion lifecycle permits. Deliberately narrower than the
 * billing list: a deletion-pending member gets exactly what Prompt 3 allows
 * and nothing more.
 */
export const DELETION_SURFACES: Surface[] = ["settings", "support"];

export function surfacesFor(state: AccessState): Surface[] {
  switch (state) {
    case "allowed":
    case "grace":
      return ALL_SURFACES;
    case "restricted_deletion":
      return DELETION_SURFACES;
    case "restricted_billing":
    case "suspended_dispute":
    default:
      return ACCOUNT_SURFACES;
  }
}

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
  | "deletion_pending"
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
   * Account deletion is in progress. Prompt 3's deletion lifecycle takes
   * priority over every billing decision and is never widened by one.
   */
  deletionRestricted?: boolean | null;
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
  /**
   * The single source of truth for route access. Nothing outside this module
   * may re-derive a surface list from a status string.
   */
  allowed_surfaces: Surface[];
  /** Convenience: may the member read programme content? */
  allowRead: boolean;
  /** Convenience: may the member create or change their own content? */
  allowWrite: boolean;
}

/** Is `surface` reachable in this evaluation? */
export function surfaceAllowed(ev: MembershipEvaluation, surface: Surface): boolean {
  return ev.allowed_surfaces.includes(surface);
}


/**
 * Evaluates entitlement from local facts only. No Stripe call, so it is safe
 * to run on every request. The local facts are kept current by the webhook.
 */
export function evaluateMembership(
  facts: MembershipFacts | null | undefined,
  nowMs: number = Date.now(),
): MembershipEvaluation {
  if (!facts) return restricted("no_subscription", "none");

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

  // Prompt 3's deletion lifecycle outranks every billing decision, and its
  // surface list is never widened by one.
  if (facts.deletionRestricted === true) {
    return grant("restricted_deletion", "deletion_pending", base);
  }

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
    return grant("restricted_billing", "payment_refunded", base);
  }


  switch (status) {
    case "trialing":
      return grant("allowed", "trialing", base);

    case "active":
      // cancel_at_period_end is a CONDITION, not a cancellation. Access
      // continues until the paid period actually ends.
      if (conditions.cancel_at_period_end && periodEnd !== null && nowMs >= periodEnd) {
        return grant("restricted_billing", "period_ended", base);
      }
      return grant(
        "allowed",
        conditions.cancel_at_period_end ? "cancelling_at_period_end" : "active",
        base,
      );

    case "past_due":
    case "unpaid":
      if (graceStart === null) {
        // Past due, but no verified failure timestamp was recorded, an older
        // row, or a status set by a subscription event rather than an invoice
        // failure. Fall back to the paid period end as the start of the clock,
        // so the member is never dropped on the first webhook.
        if (periodEnd === null) {
          // No marker AND no period end: there is no clock at all, so an open
          // grace window cannot be demonstrated. Granting one here would be an
          // unbounded entitlement that never expires, which is the worse
          // failure. Billing, account and export surfaces stay reachable.
          return grant("restricted_billing", "grace_expired", base);
        }
        if (nowMs >= periodEnd + GRACE_MS) {
          return grant("restricted_billing", "grace_expired", base);
        }
        return grant("grace", "payment_failed_in_grace", base);
      }
      return inGraceWindow
        ? grant("grace", "payment_failed_in_grace", base)
        : grant("restricted_billing", "grace_expired", base);

    case "cancelled":
      // A cancelled subscription keeps access through the period already paid.
      if (periodEnd !== null && nowMs < periodEnd) {
        return grant("allowed", "cancelling_at_period_end", base);
      }
      return grant("restricted_billing", "period_ended", base);

    case "incomplete":
    case "incomplete_expired":
      return grant("restricted_billing", "incomplete", base);

    case "paused":
      return grant("restricted_billing", "never_started", base);

    case "none":
    default:
      return grant("restricted_billing", "no_subscription", base);
  }
}

function grant(
  state: AccessState,
  reason: AccessReason,
  base: Omit<
    MembershipEvaluation,
    "state" | "reason" | "allowRead" | "allowWrite" | "allowed_surfaces"
  >,
): MembershipEvaluation {
  const allowed_surfaces = surfacesFor(state);
  return {
    ...base,
    state,
    reason,
    allowed_surfaces,
    // A restricted member may still reach their account, billing, support and
    // export surfaces, withholding those would obstruct payment recovery and
    // data rights. Restriction applies to programme content and writes.
    allowRead: allowed_surfaces.includes("programme"),
    allowWrite: state === "allowed" || state === "grace",
  };
}

function restricted(
  reason: AccessReason,
  canonicalStatus: CanonicalSubscriptionStatus,
): MembershipEvaluation {
  return grant("restricted_billing", reason, {
    canonicalStatus,
    conditions: { cancel_at_period_end: false, in_trial: false, in_grace: false },
    graceEndsAt: null,
    graceDaysRemaining: 0,
  });
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
