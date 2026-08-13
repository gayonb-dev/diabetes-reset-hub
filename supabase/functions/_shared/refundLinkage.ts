// Trusted refund relationship.
//
// A refund may only move entitlement when the WHOLE chain is demonstrable:
//
//   refund -> charge -> payment_intent -> invoice/order -> subscription
//          -> entitlement period -> member
//
// The authoritative local link is `orders.subscription_id` (an immutable
// foreign key to `public.subscriptions`). `orders.stripe_subscription_id` is
// retained purely for reconciliation against Stripe and is never the sole
// basis for a decision.
//
// Anything missing, contradictory or ambiguous produces an owner-review item
// and NO entitlement change. Ownership is never resolved by email here: an
// email address is not an immutable identity, and guessing a member is a worse
// failure than leaving a refund for a human to look at.
//
// Free of Deno globals so it is directly unit-testable.

export type LinkageDecision = "apply" | "owner_review";

export type LinkageReason =
  | "linked"
  | "order_not_found"
  | "order_member_unknown"
  | "subscription_not_found"
  | "invoice_subscription_mismatch"
  | "order_subscription_mismatch"
  | "member_mismatch"
  | "product_not_membership"
  | "entitlement_period_unknown";

export interface LinkageOrder {
  id: string;
  userId: string | null;
  /** Immutable local FK to public.subscriptions. Authoritative. */
  subscriptionId: string | null;
  /** Reconciliation only. */
  stripeSubscriptionId: string | null;
  periodStart: string | number | Date | null;
  periodEnd: string | number | Date | null;
}

export interface LinkageSubscription {
  id: string;
  userId: string | null;
  stripeSubscriptionId: string | null;
}

export interface LinkageFacts {
  /** Subscription the CURRENT invoice belongs to, straight from Stripe. */
  invoiceSubscriptionId: string | null;
  /** Product ids on the current invoice's lines, straight from Stripe. */
  invoiceProductIds: string[];
  /** Server-held DRM membership product id, when configured. */
  membershipProductId: string | null;
  order: LinkageOrder | null;
  /** The local subscription row reached from the order's immutable FK. */
  subscription: LinkageSubscription | null;
}

export interface LinkageResult {
  decision: LinkageDecision;
  reason: LinkageReason;
}

const review = (reason: LinkageReason): LinkageResult => ({
  decision: "owner_review",
  reason,
});

export function resolveRefundLinkage(f: LinkageFacts): LinkageResult {
  const order = f.order;
  if (!order) return review("order_not_found");
  if (!order.userId) return review("order_member_unknown");

  // The order must carry an immutable subscription link, and that link must
  // resolve to a real local subscription.
  if (!order.subscriptionId) return review("subscription_not_found");
  const sub = f.subscription;
  if (!sub || sub.id !== order.subscriptionId) return review("subscription_not_found");

  // Order and subscription must belong to the same member.
  if (!sub.userId || sub.userId !== order.userId) return review("member_mismatch");

  // Stripe's current invoice must belong to that same subscription.
  if (!f.invoiceSubscriptionId) return review("subscription_not_found");
  if (sub.stripeSubscriptionId && sub.stripeSubscriptionId !== f.invoiceSubscriptionId) {
    return review("invoice_subscription_mismatch");
  }
  if (
    order.stripeSubscriptionId &&
    order.stripeSubscriptionId !== f.invoiceSubscriptionId
  ) {
    return review("order_subscription_mismatch");
  }

  // The payment must fund the DRM membership, not a one-off or retired product.
  if (f.membershipProductId) {
    if (f.invoiceProductIds.length === 0) return review("product_not_membership");
    if (!f.invoiceProductIds.includes(f.membershipProductId)) {
      return review("product_not_membership");
    }
  }

  // The entitlement period the payment funded must be known.
  if (order.periodStart === null || order.periodStart === undefined) {
    return review("entitlement_period_unknown");
  }
  if (order.periodEnd === null || order.periodEnd === undefined) {
    return review("entitlement_period_unknown");
  }

  return { decision: "apply", reason: "linked" };
}
