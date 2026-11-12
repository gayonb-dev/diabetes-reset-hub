export function isBusinessMember(userId: string | null | undefined, reviewers: Set<string>): boolean {
  return !userId || !reviewers.has(userId);
}