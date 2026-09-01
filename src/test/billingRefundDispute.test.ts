// Prompt 5 closeout, refund and dispute lifecycle.
//
// Synthetic fixtures only. No Stripe object is touched, no member row exists
// here: these exercise the pure mappers and the shared evaluator that the
// webhook and the SQL gate both follow.

import { describe, expect, it } from "vitest";
import {
  canonicalDisputeOutcome,
  canonicalRefundOutcome,
  decideEventApplication,
  eventObjectId,
} from "../../supabase/functions/_shared/billingCanonical";
import {
  evaluateMembership,
  refundRevokesEntitlement,
  type PaidPeriod,
} from "../../supabase/functions/_shared/membershipLifecycle";

const NOW = Date.parse("2026-08-13T12:00:00Z");
const day = 86_400_000;

function period(status: string, startOffsetDays: number, endOffsetDays: number): PaidPeriod {
  return {
    status,
    periodStart: new Date(NOW + startOffsetDays * day).toISOString(),
    periodEnd: new Date(NOW + endOffsetDays * day).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Refund mapping
// ---------------------------------------------------------------------------

describe("canonicalRefundOutcome", () => {
  it("marks a full refund as refunded", () => {
    const o = canonicalRefundOutcome({ amount: 2700, amountRefunded: 2700, refundStatus: "succeeded" });
    expect(o.disposition).toBe("full");
    expect(o.orderStatus).toBe("refunded");
    expect(o.reviewRequired).toBe(false);
  });

  it("marks a partial refund as partially_refunded and raises owner review", () => {
    const o = canonicalRefundOutcome({ amount: 6700, amountRefunded: 2000, refundStatus: "succeeded" });
    expect(o.disposition).toBe("partial");
    expect(o.orderStatus).toBe("partially_refunded");
    expect(o.reviewRequired).toBe(true);
  });

  it("treats several partials that sum to the total as a full refund", () => {
    // Stripe's aggregate after 2000 + 4700 on a 6700 charge.
    const o = canonicalRefundOutcome({ amount: 6700, amountRefunded: 6700, refundStatus: "succeeded" });
    expect(o.orderStatus).toBe("refunded");
  });

  it("never refunds on pending, requires_action, failed or canceled", () => {
    for (const status of ["pending", "requires_action", "failed", "canceled", "cancelled"]) {
      const o = canonicalRefundOutcome({ amount: 2700, amountRefunded: 2700, refundStatus: status });
      expect(o.orderStatus, status).toBeNull();
      expect(o.disposition, status).toBe("none");
    }
  });

  it("fails closed to owner review on an unrecognised refund status", () => {
    const o = canonicalRefundOutcome({ amount: 2700, amountRefunded: 2700, refundStatus: "quantum" });
    expect(o.orderStatus).toBeNull();
    expect(o.reviewRequired).toBe(true);
  });

  it("does not mark anything refunded when the aggregate is zero", () => {
    const o = canonicalRefundOutcome({ amount: 2700, amountRefunded: 0 });
    expect(o.orderStatus).toBeNull();
  });

  it("raises review rather than guessing when the charge amount is unknown", () => {
    const o = canonicalRefundOutcome({ amount: 0, amountRefunded: 2700 });
    expect(o.orderStatus).toBeNull();
    expect(o.reviewRequired).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Entitlement recomputation after a refund
// ---------------------------------------------------------------------------

describe("refundRevokesEntitlement", () => {
  it("revokes when the introductory payment covering now is fully refunded", () => {
    expect(refundRevokesEntitlement([period("refunded", -3, 11)], NOW)).toBe(true);
  });

  it("does not revoke when a later renewal independently covers now", () => {
    const periods = [period("refunded", -40, -10), period("paid", -5, 25)];
    expect(refundRevokesEntitlement(periods, NOW)).toBe(false);
  });

  it("does not revoke when an older renewal outside the current period is refunded", () => {
    const periods = [period("refunded", -90, -60), period("paid", -2, 28)];
    expect(refundRevokesEntitlement(periods, NOW)).toBe(false);
  });

  it("revokes when the currently qualifying renewal is refunded and nothing else covers now", () => {
    const periods = [period("paid", -90, -60), period("refunded", -2, 28)];
    expect(refundRevokesEntitlement(periods, NOW)).toBe(true);
  });

  it("keeps access when two entitlements cover now and only one is refunded", () => {
    const periods = [period("refunded", -2, 28), period("paid", -1, 29)];
    expect(refundRevokesEntitlement(periods, NOW)).toBe(false);
  });

  it("keeps access on a partial refund", () => {
    expect(refundRevokesEntitlement([period("partially_refunded", -2, 28)], NOW)).toBe(false);
  });

  it("is inert when no period covers now", () => {
    expect(refundRevokesEntitlement([period("refunded", -90, -60)], NOW)).toBe(false);
    expect(refundRevokesEntitlement([], NOW)).toBe(false);
    expect(refundRevokesEntitlement(null, NOW)).toBe(false);
  });
});

describe("evaluateMembership with refunds", () => {
  it("blocks a live subscription whose qualifying payment was fully refunded", () => {
    const ev = evaluateMembership(
      {
        status: "active",
        currentPeriodEnd: new Date(NOW + 20 * day).toISOString(),
        paidPeriods: [period("refunded", -3, 27)],
      },
      NOW,
    );
    expect(ev.state).toBe("restricted_billing");
    expect(ev.reason).toBe("payment_refunded");
  });

  it("keeps a live subscription when a later verified paid period covers now", () => {
    const ev = evaluateMembership(
      {
        status: "active",
        currentPeriodEnd: new Date(NOW + 20 * day).toISOString(),
        paidPeriods: [period("refunded", -60, -30), period("paid", -3, 27)],
      },
      NOW,
    );
    expect(ev.state).toBe("allowed");
  });
});

// ---------------------------------------------------------------------------
// Dispute mapping
// ---------------------------------------------------------------------------

describe("canonicalDisputeOutcome", () => {
  it("suspends for formal disputes", () => {
    for (const s of ["needs_response", "under_review"]) {
      const o = canonicalDisputeOutcome(s);
      expect(o.kind, s).toBe("formal");
      expect(o.suspendAccess, s).toBe(true);
      expect(o.reviewOnly, s).toBe(false);
      expect(o.resolveHold, s).toBe(false);
    }
  });

  it("raises review WITHOUT suspending for inquiries and early warnings", () => {
    for (const s of ["warning_needs_response", "warning_under_review"]) {
      const o = canonicalDisputeOutcome(s);
      expect(o.kind, s).toBe("inquiry");
      expect(o.suspendAccess, s).toBe(false);
      expect(o.reviewOnly, s).toBe(true);
      expect(o.reviewRequired, s).toBe(true);
    }
  });

  it("resolves the hold on warning_closed and prevented", () => {
    for (const s of ["warning_closed", "prevented"]) {
      const o = canonicalDisputeOutcome(s);
      expect(o.resolveHold, s).toBe(true);
      expect(o.restoreAllowed, s).toBe(true);
      expect(o.suspendAccess, s).toBe(false);
    }
  });

  it("resolves on won, allowing restore only if entitlement independently qualifies", () => {
    const o = canonicalDisputeOutcome("won");
    expect(o.resolveHold).toBe(true);
    expect(o.restoreAllowed).toBe(true);
  });

  it("never auto-restores on lost", () => {
    const o = canonicalDisputeOutcome("lost");
    expect(o.resolveHold).toBe(true);
    expect(o.restoreAllowed).toBe(false);
    expect(o.reviewRequired).toBe(true);
  });

  it("fails closed to owner review on an unknown status", () => {
    const o = canonicalDisputeOutcome("teleported");
    expect(o.kind).toBe("unknown");
    expect(o.suspendAccess).toBe(false);
    expect(o.resolveHold).toBe(false);
    expect(o.reviewRequired).toBe(true);
  });
});

describe("evaluateMembership with dispute holds", () => {
  const active = {
    status: "active",
    currentPeriodEnd: new Date(NOW + 20 * day).toISOString(),
  };

  it("suspends an otherwise full membership on a formal dispute", () => {
    const ev = evaluateMembership(
      { ...active, disputeHold: { open: true, entitlementEnd: new Date(NOW + 20 * day).toISOString() } },
      NOW,
    );
    expect(ev.state).toBe("suspended_dispute");
    expect(ev.reason).toBe("dispute_hold");
    expect(ev.allowRead).toBe(false);
    expect(ev.allowWrite).toBe(false);
  });

  it("does not suspend on a review-only inquiry hold", () => {
    const ev = evaluateMembership(
      { ...active, disputeHold: { open: true, reviewOnly: true } },
      NOW,
    );
    expect(ev.state).toBe("allowed");
  });

  it("does not suspend once the disputed entitlement has ended", () => {
    const ev = evaluateMembership(
      { ...active, disputeHold: { open: true, entitlementEnd: new Date(NOW - day).toISOString() } },
      NOW,
    );
    expect(ev.state).toBe("allowed");
  });

  it("restores access after the hold resolves only if it independently qualifies", () => {
    const won = canonicalDisputeOutcome("won");
    const restored = evaluateMembership({ ...active, disputeHold: { open: !won.resolveHold } }, NOW);
    expect(restored.state).toBe("allowed");

    const noSub = evaluateMembership(
      { status: "cancelled", currentPeriodEnd: new Date(NOW - day).toISOString(), disputeHold: { open: false } },
      NOW,
    );
    expect(noSub.state).toBe("restricted_billing");
  });

  it("leaves grace and trial semantics untouched when there is no hold", () => {
    expect(evaluateMembership({ status: "trialing" }, NOW).state).toBe("allowed");
    expect(
      evaluateMembership(
        { status: "past_due", graceStartedAt: new Date(NOW - 2 * day).toISOString() },
        NOW,
      ).state,
    ).toBe("grace");
  });
});

// ---------------------------------------------------------------------------
// Delivery: duplicates, ordering, ties, unknown events
// ---------------------------------------------------------------------------

describe("refund and dispute event delivery", () => {
  const base = {
    eventId: "evt_1",
    eventCreated: 1_760_000_000,
    objectId: "ch_1",
    alreadyClaimed: false,
    lastAppliedCreated: null as number | null,
  };

  it("skips a duplicate delivery", () => {
    expect(decideEventApplication({ ...base, alreadyClaimed: true }).action).toBe("skip_duplicate");
  });

  it("refetches instead of applying a reversed (older) delivery", () => {
    expect(
      decideEventApplication({ ...base, eventCreated: 1_759_000_000, lastAppliedCreated: 1_760_000_000 })
        .action,
    ).toBe("refetch_current");
  });

  it("refetches on same-second ties", () => {
    expect(
      decideEventApplication({ ...base, lastAppliedCreated: 1_760_000_000 }).action,
    ).toBe("refetch_current");
  });

  it("refetches when the timestamp is unreadable", () => {
    expect(decideEventApplication({ ...base, eventCreated: null }).action).toBe("refetch_current");
  });

  it("applies the newest delivery", () => {
    expect(
      decideEventApplication({ ...base, eventCreated: 1_761_000_000, lastAppliedCreated: 1_760_000_000 })
        .action,
    ).toBe("apply");
  });

  it("resolves the charge as the ledger object for refund and dispute events", () => {
    expect(eventObjectId("charge.refunded", { id: "ch_1", object: "charge" })).toBe("ch_1");
    expect(eventObjectId("charge.dispute.created", { id: "dp_1", object: "dispute" })).toBe("dp_1");
  });
});
