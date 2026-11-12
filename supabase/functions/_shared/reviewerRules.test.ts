import { isBusinessMember } from "./reviewerRules.ts";

Deno.test("review identities are not business members, ordinary identities remain", () => {
  const reviewers = new Set(["pending", "active", "expired", "revoked"]);
  for (const id of reviewers) {
    if (isBusinessMember(id, reviewers)) throw new Error("Reviewer entered business population");
  }
  if (!isBusinessMember("ordinary", reviewers)) throw new Error("Ordinary member excluded");
});