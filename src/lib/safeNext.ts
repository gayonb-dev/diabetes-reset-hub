/**
 * Open-redirect guard for the `next` parameter.
 *
 * Only same-site absolute paths are allowed. Anything that could leave the
 * origin (scheme-relative `//host`, backslash variants, absolute URLs,
 * `javascript:` and friends) falls back to the caller's default.
 */
export function safeNext(raw: string | null | undefined, fallback = ""): string {
  if (typeof raw !== "string") return fallback;

  let value = raw.trim();
  if (!value) return fallback;

  // Decode once so encoded traversal/scheme tricks are inspected too.
  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  // Normalise backslashes, browsers treat them like forward slashes.
  const normalised = value.replace(/\\/g, "/");

  if (!normalised.startsWith("/")) return fallback;
  if (normalised.startsWith("//")) return fallback;
  // eslint-disable-next-line no-control-regex -- control chars must be rejected here
  if (/[\u0000-\u001f\u007f]/.test(normalised)) return fallback;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(normalised)) return fallback;

  return normalised;
}
