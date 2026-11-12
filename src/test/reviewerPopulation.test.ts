import { describe, it, expect } from "vitest";
import { isBusinessMember } from "../../supabase/functions/_shared/reviewerPopulation.ts";

describe("reviewer business population", () => {
  it("excludes every grant identity regardless of activation or expiry", () => {
    const reviewers = new Set(["pending", "active", "expired", "revoked"]);
    for (const id of reviewers) expect(isBusinessMember(id, reviewers)).toBe(false);
  });
  it("preserves ordinary members and unbound visitor populations", () => {
    expect(isBusinessMember("paid-member", new Set(["reviewer"]))).toBe(true);
    expect(isBusinessMember(null, new Set(["reviewer"]))).toBe(true);
  });
});