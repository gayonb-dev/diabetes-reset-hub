/**
 * Shared server-side user-by-email resolver.
 *
 * Replaces first-page-only `listUsers({ page: 1, perPage: 200 })` lookups: a
 * member whose account sits beyond the first page is still found. Identity is
 * always resolved server-side from the normalized email — a browser-supplied
 * user id is never accepted anywhere in this path.
 *
 * No email address is ever logged.
 */

export const PER_PAGE = 200;
export const MAX_PAGES = 100; // safety limit: up to 20k accounts scanned

export interface AdminListUsersClient {
  auth: {
    admin: {
      listUsers: (params: { page: number; perPage: number }) => Promise<
        { data?: { users?: Array<{ id: string; email?: string | null }> } | null; error?: unknown }
      >;
    };
  };
}

export function normalizeEmail(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

/**
 * Returns the matching user id, or null when no account matches (or the
 * listing failed). Pages until a match is found or pages are exhausted.
 */
export async function findUserByEmail(
  admin: AdminListUsersClient,
  rawEmail: unknown,
): Promise<{ userId: string } | null> {
  const email = normalizeEmail(rawEmail);
  if (!email) return null;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (res?.error) return null;
    const users = res?.data?.users ?? [];
    const match = users.find((u) => normalizeEmail(u.email) === email);
    if (match) return { userId: match.id };
    if (users.length < PER_PAGE) return null; // last page reached
  }
  return null;
}
