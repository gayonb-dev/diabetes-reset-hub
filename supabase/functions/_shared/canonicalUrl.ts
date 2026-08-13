/**
 * B3 — trusted checkout redirects.
 *
 * Stripe success, cancel and portal-return URLs are derived from the
 * server-held canonical domain only. The browser `Origin` header is used for
 * the CORS allowlist decision, never to build a redirect: an approved but
 * non-canonical origin (the `www.` host, a preview host) must still return the
 * member to the canonical site after payment.
 */

const FALLBACK_CANONICAL = "https://diabetesresetmethod.com";

function normalizeOrigin(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:") return null;
    return u.origin.toLowerCase();
  } catch {
    return null;
  }
}

/** The single canonical site origin, from `APP_URL` when it is a valid https origin. */
export function canonicalOrigin(): string {
  return normalizeOrigin(Deno.env.get("APP_URL")) ?? FALLBACK_CANONICAL;
}

/**
 * Build a redirect URL on the canonical origin.
 * `path` must be a same-site absolute path; anything else falls back to "/".
 */
export function canonicalUrl(path: string): string {
  const safe = /^\/[A-Za-z0-9\-._~!$&'()*+,;=:@%/?{}]*$/.test(path) ? path : "/";
  return `${canonicalOrigin()}${safe}`;
}
