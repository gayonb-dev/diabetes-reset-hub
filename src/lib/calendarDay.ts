// Canonical member calendar-day service (Batch 1, Part B).
//
// One implementation of "what calendar day is it for THIS member?" shared by
// program day, log_date, unlocks, streaks, heatmaps, Today labels and
// member-day notifications. The edge-function copy at
// `supabase/functions/_shared/calendarDay.ts` is a byte-identical mirror of the
// core below (see `src/test/calendarDayParity.test.ts`).
//
// Rules:
//   * Every call takes an explicit instant and an explicit IANA zone.
//   * An invalid, empty or unsupported zone falls back to FALLBACK_TIMEZONE.
//   * Audit/security timestamps stay UTC — do NOT use this module for those.

export const FALLBACK_TIMEZONE = "America/New_York";

/** True when the runtime accepts `tz` as an IANA zone. */
export function isValidTimeZone(tz: string | null | undefined): boolean {
  if (!tz || typeof tz !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The zone to use, applying the documented fallback. */
export function resolveTimeZone(tz: string | null | undefined): string {
  return isValidTimeZone(tz) ? (tz as string) : FALLBACK_TIMEZONE;
}

export interface CalendarDayParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  timeZone: string;
}

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    partsCache.set(tz, f);
  }
  return f;
}

/** Wall-clock parts for `instant` in the member's zone. */
export function calendarDayParts(instant: Date, tz: string | null | undefined): CalendarDayParts {
  const zone = resolveTimeZone(tz);
  const map: Record<string, string> = {};
  for (const p of formatter(zone).formatToParts(instant)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    // Intl renders midnight as "24" in some hour12:false locales.
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    timeZone: zone,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD` for the member's local calendar day. */
export function calendarDayKey(instant: Date, tz: string | null | undefined): string {
  const p = calendarDayParts(instant, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Local hour (0-23) for the member. */
export function calendarHour(instant: Date, tz: string | null | undefined): number {
  return calendarDayParts(instant, tz).hour;
}

function keyToUtcMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

/** Whole calendar days from `fromKey` to `toKey` (may be negative). */
export function calendarDaysBetween(fromKey: string, toKey: string): number {
  return Math.round((keyToUtcMs(toKey) - keyToUtcMs(fromKey)) / 86400000);
}

/** Shift a `YYYY-MM-DD` key by whole calendar days. */
export function addCalendarDays(key: string, delta: number): string {
  const d = new Date(keyToUtcMs(key) + delta * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Normalise any date-ish value to a `YYYY-MM-DD` key, or null. */
export function toDayKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/**
 * 1-indexed program day. Day 1 is the member's local start date.
 * Returns 1 when the start date is missing or in the future.
 */
export function programDayFor(
  startDate: string | null | undefined,
  instant: Date,
  tz: string | null | undefined,
): number {
  const startKey = toDayKey(startDate);
  const todayKey = calendarDayKey(instant, tz);
  if (!startKey) return 1;
  return Math.max(1, calendarDaysBetween(startKey, todayKey) + 1);
}
