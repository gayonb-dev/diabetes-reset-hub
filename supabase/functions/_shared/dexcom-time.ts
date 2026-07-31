// Defensive timestamp helpers shared by dexcom-auth and dexcom-sync.
// Dexcom's v3 EGV payloads have shipped systemTime in several shapes over time
// ("2026-07-31T04:10:00", "...Z", "...+00:00"). Blindly appending "Z" produces
// an invalid Date and toISOString() then throws "Invalid time value".

/** Matches a trailing UTC marker or numeric offset: Z, z, +HH:MM, -HHMM. */
const HAS_ZONE = /(?:[Zz]|[+-]\d{2}:?\d{2})$/;

/**
 * Parse a Dexcom timestamp defensively.
 * Returns null instead of an Invalid Date so callers can skip/fallback.
 */
export function parseDexcomTime(s: unknown): Date | null {
  if (typeof s !== "string") return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  const normalized = HAS_ZONE.test(trimmed) ? trimmed : `${trimmed}Z`;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return null;
  return d;
}

/** parseDexcomTime + toISOString, or null when unparseable. */
export function toIsoOrNull(s: unknown): string | null {
  const d = parseDexcomTime(s);
  return d ? d.toISOString() : null;
}

/**
 * Coerce an OAuth `expires_in` to a usable number of seconds.
 * Missing / non-numeric / string-typed values would otherwise produce NaN
 * and make new Date(NaN).toISOString() throw the same "Invalid time value".
 */
export function safeExpiresInSeconds(raw: unknown, tag: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    console.warn(`[${tag}] invalid expires_in`, JSON.stringify(raw), typeof raw);
    return 3600;
  }
  return n;
}
