/**
 * Strict server-side mirror of `src/lib/safeNext.ts`.
 *
 * A leading "/" is NOT sufficient. Everything that could leave the origin is
 * rejected: absolute URLs, protocol-relative values, backslash and mixed
 * slash/backslash forms, single- and double-encoded slash/backslash bypasses,
 * any scheme (`javascript:`, `data:`, ...), malformed percent-encoding, empty
 * values and control characters.
 *
 * Anything invalid falls back to the default member destination.
 */

export const DEFAULT_NEXT = "/app";

export function safeNextServer(raw: unknown, fallback: string = DEFAULT_NEXT): string {
  if (typeof raw !== "string") return fallback;

  let value = raw.trim();
  if (!value) return fallback;

  // Backslashes — literal or encoded at any depth — are never legitimate here.
  if (value.includes("\\") || /%(25)*5c/i.test(value)) return fallback;


  // Decode up to twice so double-encoded bypasses (%252f, %255c) are inspected.
  for (let i = 0; i < 2; i++) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(value);
    } catch {
      return fallback;
    }
    if (decoded === value) break;
    value = decoded;
  }

  // Browsers treat backslashes like forward slashes.
  const normalised = value.replace(/\\/g, "/");

  if (!normalised.startsWith("/")) return fallback;
  if (normalised.startsWith("//")) return fallback;
  // deno-lint-ignore no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(normalised)) return fallback;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(normalised)) return fallback;

  return normalised;
}
