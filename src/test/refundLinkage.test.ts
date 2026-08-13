// Prompt 5 correction — proof of the trusted refund relationship.
//
// A refund only moves entitlement when the whole chain is demonstrable.
// Everything else becomes an owner-review item and changes nothing.

import { describe, it, expect } from "vitest";
import {
  resolveRefundLinkage,
  type LinkageFacts,
} from "../../supabase/functions/_shared/refundLinkage";

const PROD = "prod_membership";

const facts = (over: Partial<LinkageFacts> = {}): LinkageFacts => ({
  invoiceSubscriptionId: "sub_stripe_1",
  invoiceProductIds: [PROD],
  membershipProductId: PROD,
  order: {
    id: "order-1",
    userId: "user-1",
    subscriptionId: "localsub-1",
    stripeSubscriptionId: "sub_stripe_1",
    periodStart: "2026-08-01T00:00:00Z",
    periodEnd: "2026-09-01T00:00:00Z",
  },
  subscription: {
    id: "localsub-1",
    userId: "user-1",
    stripeSubscriptionId: "sub_stripe_1",
  },
  ...over,
});

describe("trusted refund relationship", () => {
  it("applies when the full chain resolves", () => {
    expect(resolveRefundLinkage(facts())).toEqual({ decision: "apply", reason: "linked" });
  });

  it("reviews when no local order is reachable", () => {
    expect(resolveRefundLinkage(facts({ order: null }))).toEqual({
      decision: "owner_review",
      reason: "order_not_found",
    });
  });

  it("never guesses a member from an unowned order", () => {
    const f = facts();
    f.order!.userId = null;
    expect(resolveRefundLinkage(f).reason).toBe("order_member_unknown");
  });

  it("reviews when the order carries no immutable subscription link", () => {
    const f = facts();
    f.order!.subscriptionId = null;
    expect(resolveRefundLinkage(f).reason).toBe("subscription_not_found");
  });

  it("reviews when the local subscription row is missing or mismatched", () => {
    expect(resolveRefundLinkage(facts({ subscription: null })).reason).toBe(
      "subscription_not_found",
    );
    const f = facts();
    f.subscription!.id = "localsub-other";
    expect(resolveRefundLinkage(f).reason).toBe("subscription_not_found");
  });

  it("reviews when order and subscription belong to different members", () => {
    const f = facts();
    f.subscription!.userId = "user-2";
    expect(resolveRefundLinkage(f).reason).toBe("member_mismatch");
  });

  it("reviews when Stripe's invoice belongs to another subscription", () => {
    expect(resolveRefundLinkage(facts({ invoiceSubscriptionId: "sub_stripe_other" })).reason)
      .toBe("invoice_subscription_mismatch");
  });

  it("reviews when the order's recorded Stripe subscription disagrees", () => {
    const f = facts();
    f.subscription!.stripeSubscriptionId = null;
    f.order!.stripeSubscriptionId = "sub_stripe_stale";
    expect(resolveRefundLinkage(f).reason).toBe("order_subscription_mismatch");
  });

  it("reviews when the payment did not fund the membership product", () => {
    expect(resolveRefundLinkage(facts({ invoiceProductIds: ["prod_other"] })).reason)
      .toBe("product_not_membership");
    expect(resolveRefundLinkage(facts({ invoiceProductIds: [] })).reason)
      .toBe("product_not_membership");
  });

  it("reviews when the funded entitlement period is unknown", () => {
    const a = facts();
    a.order!.periodEnd = null;
    expect(resolveRefundLinkage(a).reason).toBe("entitlement_period_unknown");
    const b = facts();
    b.order!.periodStart = null;
    expect(resolveRefundLinkage(b).reason).toBe("entitlement_period_unknown");
  });

  it("still applies when no membership product is configured", () => {
    expect(
      resolveRefundLinkage(facts({ membershipProductId: null, invoiceProductIds: [] }))
        .decision,
    ).toBe("apply");
  });
});
