// B4, canonical billing vocabulary, webhook idempotency and ordering.
//
// ADDITIVE ONLY. Nothing here rewrites an existing `orders` or `subscriptions`
// row. Stripe's raw vocabulary is preserved on those tables exactly as it
// arrives; this module produces the *canonical* projection that the ledger
// (`public.billing_events`) and the canonical views expose.
//
// The three canonical dimensions are deliberately kept separate, because
// collapsing them is what produced the original ambiguity:
//
//   order_status            -> did money move for a one-off purchase?
//   subscription_status     -> what is the recurring relationship's state?
//   subscription_conditions -> qualifiers that are NOT states
//                              (cancel_at_period_end, in_trial, in_grace)
//
// A subscription that is `active` with `cancel_at_period_end = true` is still
// active. It is not "cancelled". That distinction is the whole point.
//
// This file is intentionally free of Deno globals, network calls and database
// calls so it can be unit-tested directly under Vitest.

// ---------------------------------------------------------------------------
// Canonical vocabulary
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "refunded",
  "partially_refunded",
  "failed",
  "cancelled",
] as const;
export type CanonicalOrderStatus = (typeof ORDER_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "cancelled",
  "incomplete",
  "incomplete_expired",
  "paused",
  "none",
] as const;
export type CanonicalSubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface SubscriptionConditions {
  /** Stripe will not renew at the end of the paid period. Still active until then. */
  cancel_at_period_end: boolean;
  /** Inside the introductory period. */
  in_trial: boolean;
  /** Payment has failed but the member retains access under the grace window. */
  in_grace: boolean;
}

export const NO_CONDITIONS: SubscriptionConditions = {
  cancel_at_period_end: false,
  in_trial: false,
  in_grace: false,
};

/**
 * Maps a raw Stripe (or legacy local) order/payment status onto the canonical
 * order vocabulary. Unknown values map to `pending`, never to `paid`, an
 * unrecognised status must never be read as "money arrived".
 */
export function canonicalOrderStatus(raw: unknown): CanonicalOrderStatus {
  const v = String(raw ?? "").trim().toLowerCase();
  switch (v) {
    case "paid":
    case "completed":
    case "complete":
    case "succeeded":
      return "paid";
    case "refunded":
      return "refunded";
    case "partially_refunded":
      return "partially_refunded";
    case "failed":
    case "payment_failed":
    case "requires_payment_method":
      return "failed";
    case "cancelled":
    case "canceled":
    case "expired":
      return "cancelled";
    case "pending":
    case "unpaid":
    case "created":
    case "open":
    case "processing":
    case "":
      return "pending";
    default:
      return "pending";
  }
}

/**
 * Maps a raw Stripe subscription status onto the canonical vocabulary.
 * Unknown values map to `none` (no proven entitlement), never to `active`.
 */
export function canonicalSubscriptionStatus(raw: unknown): CanonicalSubscriptionStatus {
  const v = String(raw ?? "").trim().toLowerCase();
  switch (v) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "unpaid":
      return "unpaid";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "incomplete":
      return "incomplete";
    case "incomplete_expired":
      return "incomplete_expired";
    case "paused":
      return "paused";
    default:
      return "none";
  }
}

/** True only for statuses where Stripe considers the relationship live. */
export function isLiveSubscriptionStatus(s: CanonicalSubscriptionStatus): boolean {
  return s === "active" || s === "trialing" || s === "past_due";
}

export function subscriptionConditions(input: {
  cancelAtPeriodEnd?: boolean | null;
  trialEnd?: string | number | Date | null;
  graceStartedAt?: string | number | Date | null;
  status?: unknown;
  nowMs?: number;
}): SubscriptionConditions {
  const now = input.nowMs ?? Date.now();
  const trialEndMs = toMs(input.trialEnd);
  const status = canonicalSubscriptionStatus(input.status);
  return {
    cancel_at_period_end: input.cancelAtPeriodEnd === true,
    in_trial: status === "trialing" || (trialEndMs !== null && trialEndMs > now),
    in_grace:
      (status === "past_due" || status === "unpaid") && toMs(input.graceStartedAt) !== null,
  };
}

export function toMs(value: string | number | Date | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    // Stripe sends seconds; anything below this threshold is a second-precision
    // epoch rather than a millisecond one.
    return value < 100_000_000_000 ? value * 1000 : value;
  }
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? null : parsed;
}

// ---------------------------------------------------------------------------
// Idempotency and ordering
// ---------------------------------------------------------------------------

export type EventDecision =
  /** This exact Stripe event ID was already claimed. Do nothing, return 200. */
  | { action: "skip_duplicate"; reason: string }
  /**
   * A NEWER event for this object has already been applied. The payload in
   * hand is stale, so its contents must never be written. Re-retrieve the
   * object from Stripe and apply the authoritative current state instead.
   */
  | { action: "refetch_current"; reason: string }
  /** Newest event seen for this object. Safe to apply the payload directly. */
  | { action: "apply"; reason: string };

export interface EventOrderingFacts {
  /** Stripe event ID (`evt_...`). */
  eventId: string;
  /** `event.created`, seconds or ISO. */
  eventCreated: string | number | Date | null;
  /** The Stripe object this event mutates (`sub_...`, `cs_...`, `in_...`). */
  objectId: string | null;
  /** True when `claim_billing_event` reported the ID was already present. */
  alreadyClaimed: boolean;
  /**
   * `stripe_created` of the newest event ALREADY APPLIED for this object,
   * or null when this is the first.
   */
  lastAppliedCreated: string | number | Date | null;
}

/**
 * Decides how a received webhook event must be handled.
 *
 * Stripe does not guarantee delivery order, and retries mean the same event
 * can arrive many times. Two protections, in this order:
 *
 *  1. Idempotency, a `stripe_event_id` is claimed exactly once (unique index),
 *     so a redelivery is a no-op rather than a second mutation.
 *  2. Ordering, if an older event overtakes a newer one, applying its payload
 *     would roll state backwards (classic symptom: a cancelled member flipping
 *     back to active). Instead of applying stale contents, the caller
 *     re-retrieves the object from Stripe.
 *
 * An event with no resolvable timestamp is treated as potentially stale and
 * routed to a refetch rather than trusted.
 */
export function decideEventApplication(facts: EventOrderingFacts): EventDecision {
  if (facts.alreadyClaimed) {
    return { action: "skip_duplicate", reason: "stripe_event_id already processed" };
  }

  const incoming = toMs(facts.eventCreated);
  const applied = toMs(facts.lastAppliedCreated);

  if (applied === null) {
    if (incoming === null) {
      return { action: "refetch_current", reason: "event timestamp unreadable" };
    }
    return { action: "apply", reason: "first event for this object" };
  }

  if (incoming === null) {
    return { action: "refetch_current", reason: "event timestamp unreadable" };
  }

  if (incoming < applied) {
    return {
      action: "refetch_current",
      reason: "event is older than the last applied event for this object",
    };
  }

  if (incoming === applied && facts.objectId) {
    // Same-second events are ambiguous. Stripe emits several transitions
    // within one second routinely, so trust the API rather than the ordering.
    return { action: "refetch_current", reason: "event ties the last applied event" };
  }

  return { action: "apply", reason: "newest event for this object" };
}

/** Extracts the mutated object's ID for the event types the lifecycle needs. */
export function eventObjectId(eventType: string, object: Record<string, unknown>): string | null {
  const id = typeof object?.id === "string" ? object.id : null;
  if (eventType.startsWith("customer.subscription.")) return id;
  if (eventType.startsWith("invoice.")) {
    const sub = object?.subscription;
    return typeof sub === "string" ? sub : id;
  }
  if (eventType.startsWith("checkout.session.")) {
    const sub = object?.subscription;
    return typeof sub === "string" ? sub : id;
  }
  if (eventType.startsWith("charge.") || eventType.startsWith("payment_intent.")) return id;
  return id;
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------
//
// Full-vs-partial is decided from Stripe's CURRENT aggregate `amount_refunded`
// on the charge, never from a single refund object. Several partial refunds
// that add up to the charge total are a full refund. A refund that has not
// succeeded never changes the order status: "a refund was requested" is not
// "money went back".

export type RefundDisposition = "full" | "partial" | "none" | "review";

export interface RefundOutcome {
  disposition: RefundDisposition;
  /** Canonical order status to write, or null to leave the order untouched. */
  orderStatus: CanonicalOrderStatus | null;
  /** Owner review required (partial refunds, and anything unrecognised). */
  reviewRequired: boolean;
  /** Aggregate refunded amount, in the smallest currency unit. */
  amountRefunded: number;
  reason: string;
}

export interface RefundFacts {
  /** Status of the refund object, when the event carried one. */
  refundStatus?: unknown;
  /** Charge total, smallest currency unit. */
  amount?: number | null;
  /** Charge aggregate `amount_refunded`, smallest currency unit. */
  amountRefunded?: number | null;
  /** Charge-level `refunded` boolean, when present. */
  chargeRefunded?: boolean | null;
}

function n(v: unknown): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) && x >= 0 ? x : 0;
}

export function canonicalRefundOutcome(facts: RefundFacts): RefundOutcome {
  const amount = n(facts.amount);
  const refunded = n(facts.amountRefunded);
  const raw = String(facts.refundStatus ?? "").trim().toLowerCase();

  // A refund that is not (yet) money returned must not move the order.
  if (raw === "pending" || raw === "requires_action") {
    return {
      disposition: "none",
      orderStatus: null,
      reviewRequired: false,
      amountRefunded: refunded,
      reason: `refund ${raw}; no state change`,
    };
  }
  if (raw === "failed" || raw === "canceled" || raw === "cancelled") {
    return {
      disposition: "none",
      orderStatus: null,
      reviewRequired: false,
      amountRefunded: refunded,
      reason: `refund ${raw}; never treated as refunded`,
    };
  }
  if (raw !== "" && raw !== "succeeded") {
    // Unrecognised refund status: fail closed into owner review rather than
    // guessing that money moved.
    return {
      disposition: "review",
      orderStatus: null,
      reviewRequired: true,
      amountRefunded: refunded,
      reason: `unrecognised refund status "${raw}"; owner review`,
    };
  }

  if (refunded <= 0) {
    return {
      disposition: "none",
      orderStatus: null,
      reviewRequired: false,
      amountRefunded: 0,
      reason: "no refunded amount on the charge",
    };
  }

  if (amount <= 0) {
    // Aggregate present but the charge total is unknown: cannot prove "full".
    return {
      disposition: "review",
      orderStatus: null,
      reviewRequired: true,
      amountRefunded: refunded,
      reason: "charge amount unknown; owner review",
    };
  }

  if (refunded >= amount || facts.chargeRefunded === true) {
    return {
      disposition: "full",
      orderStatus: "refunded",
      reviewRequired: false,
      amountRefunded: refunded,
      reason: "aggregate refund covers the charge",
    };
  }

  return {
    disposition: "partial",
    orderStatus: "partially_refunded",
    reviewRequired: true,
    amountRefunded: refunded,
    reason: "partial refund; entitlement unchanged, owner review raised",
  };
}

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------

export const DISPUTE_STATUSES = [
  "needs_response",
  "under_review",
  "warning_needs_response",
  "warning_under_review",
  "warning_closed",
  "won",
  "lost",
  "prevented",
] as const;
export type StripeDisputeStatus = (typeof DISPUTE_STATUSES)[number];

export type DisputeKind = "formal" | "inquiry" | "resolved" | "unknown";

export interface DisputeOutcome {
  kind: DisputeKind;
  /** Open a hold that suspends programme access for this entitlement. */
  suspendAccess: boolean;
  /** Hold exists for owner visibility only; access is NOT suspended. */
  reviewOnly: boolean;
  /** Resolve any existing hold for this dispute. */
  resolveHold: boolean;
  /** After resolution, access may return IF it independently qualifies. */
  restoreAllowed: boolean;
  reviewRequired: boolean;
  reason: string;
}

export function canonicalDisputeOutcome(rawStatus: unknown): DisputeOutcome {
  const s = String(rawStatus ?? "").trim().toLowerCase();
  switch (s) {
    case "needs_response":
    case "under_review":
      return {
        kind: "formal",
        suspendAccess: true,
        reviewOnly: false,
        resolveHold: false,
        restoreAllowed: false,
        reviewRequired: true,
        reason: `formal dispute (${s})`,
      };
    case "warning_needs_response":
    case "warning_under_review":
      return {
        kind: "inquiry",
        suspendAccess: false,
        reviewOnly: true,
        resolveHold: false,
        restoreAllowed: false,
        reviewRequired: true,
        reason: `inquiry/early warning (${s}); access not suspended`,
      };
    case "warning_closed":
    case "prevented":
      return {
        kind: "resolved",
        suspendAccess: false,
        reviewOnly: false,
        resolveHold: true,
        restoreAllowed: true,
        reviewRequired: false,
        reason: `${s}; hold resolved, entitlement reevaluated independently`,
      };
    case "won":
      return {
        kind: "resolved",
        suspendAccess: false,
        reviewOnly: false,
        resolveHold: true,
        restoreAllowed: true,
        reviewRequired: false,
        reason: "dispute won; access restored only if it independently qualifies",
      };
    case "lost":
      return {
        kind: "resolved",
        suspendAccess: false,
        reviewOnly: false,
        resolveHold: true,
        restoreAllowed: false,
        reviewRequired: true,
        reason: "dispute lost; no automatic restore of the associated entitlement",
      };
    default:
      // Fail closed into owner review: no guess, no new access granted, and no
      // revocation of unrelated access.
      return {
        kind: "unknown",
        suspendAccess: false,
        reviewOnly: true,
        resolveHold: false,
        restoreAllowed: false,
        reviewRequired: true,
        reason: `unrecognised dispute status "${s}"; owner review`,
      };
  }
}
