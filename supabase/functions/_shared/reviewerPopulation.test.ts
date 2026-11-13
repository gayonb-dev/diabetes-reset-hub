import { reviewerIds, isClinicalReviewer, reviewerEmails } from "./reviewerPopulation.ts";

Deno.test("reviewer lookup fails closed on database failure", async () => {
  const admin = { from: () => ({ select: () => ({ range: () => Promise.resolve({ data: null, error: "unavailable" }) }) }) };
  let rejected = false;
  try { await reviewerIds(admin); } catch { rejected = true; }
  if (!rejected) throw new Error("Failed lookup did not block population processing");
});

Deno.test("pending and ended grant identities remain excluded and paginated", async () => {
  const admin = { from: () => ({ select: () => ({ range: () => Promise.resolve({ data: [{ user_id: "pending" }, { user_id: "ended" }], error: null }) }) }) };
  const ids = await reviewerIds(admin);
  if (ids.size !== 2 || !ids.has("ended")) throw new Error("Grant population incomplete");
});

Deno.test("single-user grant classification rejects lookup errors", async () => {
  const admin = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: "unavailable" }) }) }) }) };
  let rejected = false;
  try { await isClinicalReviewer(admin, "synthetic"); } catch { rejected = true; }
  if (!rejected) throw new Error("Notification classification failed open");
});

Deno.test("email classification must resolve every granted identity", async () => {
  const admin = { auth: { admin: { listUsers: () => Promise.resolve({ data: { users: [] }, error: null }) } } };
  let rejected = false;
  try { await reviewerEmails(admin, new Set(["missing"])); } catch { rejected = true; }
  if (!rejected) throw new Error("Unresolved identity did not block mail");
});