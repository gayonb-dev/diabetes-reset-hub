import { describe, it, expect } from "vitest";
import { evaluateMembership, type MembershipFacts, GRACE_MS } from "../../supabase/functions/_shared/membershipLifecycle.ts";
import { evaluateMembership as previous } from "./fixtures/preReviewMembershipLifecycle.ts";

const NOW = Date.parse("2026-11-12T01:18:00Z");
const DAY = 86400000;
const cases: [string, MembershipFacts | null][] = [
  ["no subscription", null],
  ["active", { status: "active" }],
  ["trial", { status: "trialing" }],
  ["cancellation before end", { status: "active", cancelAtPeriodEnd: true, currentPeriodEnd: NOW + DAY }],
  ["cancellation at end", { status: "active", cancelAtPeriodEnd: true, currentPeriodEnd: NOW }],
  ["cancelled within period", { status: "cancelled", currentPeriodEnd: NOW + DAY }],
  ["cancelled after period", { status: "cancelled", currentPeriodEnd: NOW - 1 }],
  ["past due grace", { status: "past_due", graceStartedAt: NOW - DAY }],
  ["past due grace boundary", { status: "past_due", graceStartedAt: NOW - GRACE_MS }],
  ["unpaid grace", { status: "unpaid", graceStartedAt: NOW - DAY }],
  ["unpaid no marker", { status: "unpaid" }],
  ["incomplete", { status: "incomplete" }],
  ["paused", { status: "paused" }],
  ["deletion", { status: "active", deletionRestricted: true }],
  ["dispute", { status: "active", disputeHold: { open: true } }],
  ["inquiry", { status: "active", disputeHold: { open: true, reviewOnly: true } }],
  ["ended dispute period", { status: "active", disputeHold: { open: true, entitlementEnd: NOW } }],
  ["refund", { status: "active", paidPeriods: [{ status: "refunded", periodStart: NOW - DAY, periodEnd: NOW + DAY }] }],
  ["partial refund", { status: "active", paidPeriods: [{ status: "partially_refunded", periodStart: NOW - DAY, periodEnd: NOW + DAY }] }],
];

describe("prior/current isolated ordinary-member compatibility", () => {
  it.each(cases)("preserves %s for identical inputs", (_label, facts) => {
    expect(evaluateMembership(facts, NOW)).toEqual(previous(facts, NOW));
  });
  it("reviewer grants cannot override dispute suspension", () => {
    const result = evaluateMembership({ complimentary: "active", disputeHold: { open: true } }, NOW);
    expect(result.state).toBe("suspended_dispute");
    expect(result.allowRead).toBe(false);
  });
});