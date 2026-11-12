import type { DataClient } from "./dataClient.ts";
export { isBusinessMember } from "./reviewerRules.ts";
export interface ReviewerClient extends DataClient {
  auth: { admin: { listUsers(options: { page: number; perPage: number }): Promise<{
    data: { users: { id: string; email?: string }[] }; error: unknown;
  }> } };
}

// All grants identify review populations, including pending, expired and revoked.
// A failed classification must stop the job rather than contact a reviewer.
export async function reviewerIds(admin: ReviewerClient): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.from("complimentary_access")
      .select("user_id").range(offset, offset + 999);
    if (error) throw new Error("reviewer_population_unavailable");
    for (const row of data ?? []) {
      if (typeof row.user_id !== "string") throw new Error("reviewer_population_invalid");
      ids.add(row.user_id);
    }
    if ((data?.length ?? 0) < 1000) return ids;
  }
}

export async function isClinicalReviewer(admin: ReviewerClient, userId: string): Promise<boolean> {
  const { data, error } = await admin.from("complimentary_access")
    .select("id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("reviewer_population_unavailable");
  return data !== null;
}

export async function reviewerEmails(admin: ReviewerClient, reviewers: Set<string>): Promise<Set<string>> {
  const emails = new Set<string>();
  if (reviewers.size === 0) return emails;
  const remaining = new Set(reviewers);
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error("reviewer_identity_unavailable");
    for (const user of data.users) {
      if (!remaining.has(user.id)) continue;
      if (user.email) emails.add(user.email.trim().toLowerCase());
      remaining.delete(user.id);
    }
    if (remaining.size === 0) return emails;
    if (data.users.length < 200) break;
  }
  throw new Error("reviewer_identity_unavailable");
}