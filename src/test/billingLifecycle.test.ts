// B4 / B5 — synthetic-event tests for the canonical billing model, webhook
// idempotency and ordering, and the seven-day grace lifecycle.
//
// Everything here is synthetic. No Stripe object is created, no live event is
// replayed, and no member row is touched. These tests prove the DECISION
// LOGIC. They do not, and cannot, prove that a given event type is actually
// enabled on the live webhook destination — that remains an owner action and
// is reported separately as "implemented, awaiting live-event verification".

import { describe, it, expect } from "vitest";
import {
  canonicalOrderStatus,
  canonicalSubscriptionStatus,
  subscriptionConditions,
  decideEventApplication,
  eventObjectId,
} from "../../supabase/functions/_shared/billingCanonical";
import {
  evaluateMembership,
  nextGraceMarker,
  GRACE_MS,
} from "../../supabase/functions/_shared/membershipLifecycle";

const DAY = 86_400_000;
const NOW = Date.parse("2026-08-12T12:00:00.000Z");

describe("B4 canonical vocabulary", () => {
  it("keeps order status, subscription status and conditions as separate fields", () => {
    // The bug this prevents: cramming "cancelled at period end" into the
    // status field, which then reads as "no access" while access continues.
    const conditions = subscriptionConditions({
      status: "active",
      cancelAtPeriodEnd: true,
      trialEnd: null,
    });
    expect(canonicalSubscriptionStatus("active")).toBe("active");
    expect(conditions.cancel_at_period_end).toBe(true);
    expect(conditions.in_trial).toBe(false);
  });

  it("maps unknown or missing values to an explicit canonical value, never a guess", () => {
    expect(canonicalSubscriptionStatus(undefined)).toBe("none");
    expect(canonicalSubscriptionStatus("something_new_from_stripe")).toBe("unknown");
    expect(canonicalOrderStatus(undefined)).toBe("pending");
    expect(canonicalOrderStatus("refunded")).toBe("refunded");
  });

  it("never reports a paid order from an unpaid Stripe value", () => {
    for (const raw of ["unpaid", "no_payment_required", "open", "", null, undefined]) {
      expect(canonicalOrderStatus(raw)).not.toBe("paid");
    }
    expect(canonicalOrderStatus("paid")).toBe("paid");
  });
});

describe("B4 webhook idempotency and ordering", () => {
  const base = {
    eventId: "evt_1",
    eventCreated: 1_700_000_100,
    objectId: "sub_1",
    alreadyClaimed: false,
    lastAppliedCreated: null as number | null,
  };

  it("skips a redelivered event ID entirely", () => {
    const d = decideEventApplication({ ...base, alreadyClaimed: true });
    expect(d.action).toBe("skip_duplicate");
  });

  it("applies the first event for an object", () => {
    expect(decideEventApplication(base).action).toBe("apply");
  });

  it("applies a strictly newer event", () => {
    const d = decideEventApplication({ ...base, lastAppliedCreated: 1_700_000_000 });
    expect(d.action).toBe("apply");
  });

  it("refetches instead of applying an out-of-order older event", () => {
    // Without this, an older 'active' overtaking a newer 'canceled' would
    // silently resurrect a cancelled membership.
    const d = decideEventApplication({ ...base, lastAppliedCreated: 1_700_000_500 });
    expect(d.action).toBe("refetch_current");
  });

  it("refetches on a same-second tie rather than guessing", () => {
    const d = decideEventApplication({ ...base, lastAppliedCreated: 1_700_000_100 });
    expect(d.action).toBe("refetch_current");
  });

  it("refetches when the event timestamp cannot be read", () => {
    const d = decideEventApplication({
      ...base,
      eventCreated: "not-a-date",
      lastAppliedCreated: 1_700_000_000,
    });
    expect(d.action).toBe("refetch_current");
  });

  it("resolves the subscription as the ordering key for invoice events", () => {
    expect(eventObjectId("invoice.payment_failed", { id: "in_1", subscription: "sub_9" }))
      .toBe("sub_9");
    expect(eventObjectId("customer.subscription.updated", { id: "sub_9" })).toBe("sub_9");
  });
});

describe("B5 seven-day grace lifecycle", () => {
  it("grants access while trialing and while active", () => {
    expect(evaluateMembership({ status: "trialing", currentPeriodEnd: NOW + DAY }, NOW).state)
      .toBe("full");
    expect(evaluateMembership({ status: "active", currentPeriodEnd: NOW + DAY }, NOW).state)
      .toBe("full");
  });

  it("keeps access during grace after a failed payment", () => {
    const ev = evaluateMembership(
      { status: "past_due", currentPeriodEnd: NOW + DAY, graceStartedAt: NOW - 2 * DAY },
      NOW,
    );
    expect(ev.state).toBe("grace");
    expect(ev.reason).toBe("payment_failed_in_grace");
    expect(ev.allowRead).toBe(true);
    expect(ev.allowWrite).toBe(true);
    expect(ev.graceDaysRemaining).toBe(5);
  });

  it("blocks once the seven days have elapsed", () => {
    const ev = evaluateMembership(
      { status: "past_due", graceStartedAt: NOW - (GRACE_MS + 1) },
      NOW,
    );
    expect(ev.state).toBe("blocked");
    expect(ev.reason).toBe("grace_expired");
    expect(ev.allowRead).toBe(false);
  });

  it("treats the exact boundary as expired, not as an extra moment of access", () => {
    const ev = evaluateMembership({ status: "past_due", graceStartedAt: NOW - GRACE_MS }, NOW);
    expect(ev.state).toBe("blocked");
  });

  it("keeps full access when cancelling at period end, until the period ends", () => {
    const before = evaluateMembership(
      { status: "active", cancelAtPeriodEnd: true, currentPeriodEnd: NOW + DAY },
      NOW,
    );
    expect(before.state).toBe("full");
    expect(before.reason).toBe("cancelling_at_period_end");

    const after = evaluateMembership(
      { status: "canceled", cancelAtPeriodEnd: true, currentPeriodEnd: NOW - DAY },
      NOW,
    );
    expect(after.state).toBe("blocked");
  });

  it("blocks when there is no subscription at all", () => {
    expect(evaluateMembership(null, NOW).state).toBe("blocked");
    expect(evaluateMembership(null, NOW).reason).toBe("no_subscription");
  });

  it("blocks an incomplete subscription: no verified payment, no access", () => {
    expect(evaluateMembership({ status: "incomplete" }, NOW).state).toBe("blocked");
  });

  it("starts grace at the FIRST verified failure and never restarts it", () => {
    const first = nextGraceMarker({
      event: "payment_failed",
      existingGraceStartedAt: null,
      eventAt: NOW,
    });
    expect(first).toBe(new Date(NOW).toISOString());

    // A retry three days later must not hand out three extra days.
    const second = nextGraceMarker({
      event: "payment_failed",
      existingGraceStartedAt: first,
      eventAt: NOW + 3 * DAY,
    });
    expect(second).toBe(first);
  });

  it("clears the grace marker on a successful payment", () => {
    expect(
      nextGraceMarker({
        event: "payment_succeeded",
        existingGraceStartedAt: new Date(NOW).toISOString(),
        eventAt: NOW,
      }),
    ).toBeNull();
  });

  it("does not grant grace to a past_due row that has no recorded failure", () => {
    // Grace is earned by a verified failure event, not by a bare status string.
    const ev = evaluateMembership({ status: "past_due", graceStartedAt: null }, NOW);
    expect(ev.state).toBe("blocked");
  });
});
