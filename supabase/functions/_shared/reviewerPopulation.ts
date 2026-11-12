import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// All grants identify review populations, including pending, expired and revoked.
// A failed classification must stop the job rather than contact a reviewer.
export async function reviewerIds(admin: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.from("complimentary_access")
      .select("user_id").range(offset, offset + 999);
    if (error) throw new Error("reviewer_population_unavailable");
    for (const row of data ?? []) ids.add(row.user_id);
    if ((data?.length ?? 0) < 1000) return ids;
  }
}

export function isBusinessMember(userId: string | null | undefined, reviewers: Set<string>): boolean {
  return !userId || !reviewers.has(userId);
}

export async function isClinicalReviewer(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await admin.from("complimentary_access")
    .select("id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("reviewer_population_unavailable");
  return data !== null;
}