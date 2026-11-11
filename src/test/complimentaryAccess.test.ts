// Clinical-review complimentary access: presentation evaluator rules.
// The server enforces the same order in membership_access_state().
import { describe, it, expect } from "vitest";
import { evaluateSubscriptionRow, surfaceAllowed, membershipNotice, ACCOUNT_SURFACES } from "@/lib/membership";

const NOW = Date.parse("2026-10-01T12:00:00Z");

describe("complimentary clinical-review access", () => {
  it("active grant with no subscription allows the programme", () => {
    const ev = evaluateSubscriptionRow(null, NOW, { complimentary: "active" });
    expect(ev.state).toBe("allowed");
    expect(ev.reason).toBe("complimentary_review");
    expect(surfaceAllowed(ev, "programme")).toBe(true);
  });

  it.each(["expired", "revoked"] as const)("%s grant shows the ended state, not a payment failure", (st) => {
    const ev = evaluateSubscriptionRow(null, NOW, { complimentary: st });
    expect(ev.state).toBe("restricted_billing");
    expect(ev.reason).toBe("complimentary_review_ended");
    expect(surfaceAllowed(ev, "programme")).toBe(false);
    expect(ev.allowed_surfaces).toEqual(ACCOUNT_SURFACES);
    expect(membershipNotice(ev)?.title).toBe("Your complimentary clinical-review access has ended");
  });

  it("pending or absent grants never allow the programme", () => {
    for (const st of ["pending_activation", "absent"] as const) {
      const ev = evaluateSubscriptionRow(null, NOW, { complimentary: st });
      expect(surfaceAllowed(ev, "programme")).toBe(false);
    }
  });

  it("deletion restriction outranks an active grant", () => {
    const ev = evaluateSubscriptionRow(null, NOW, { complimentary: "active", deletionRestricted: true });
    expect(ev.state).toBe("restricted_deletion");
  });

  it("ordinary member without a grant is unchanged", () => {
    expect(evaluateSubscriptionRow(null, NOW).reason).toBe("no_subscription");
    expect(evaluateSubscriptionRow({ status: "active" }, NOW).reason).toBe("active");
  });
});
