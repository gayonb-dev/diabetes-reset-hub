// Week-start preference helpers.
// 0 = Sunday (default), 1 = Monday. Stored on profiles.week_start_day.

export type WeekStartDay = 0 | 1;

export const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

/** Weekday keys ordered for the member's chosen week start. */
export function orderedDayKeys(weekStart: WeekStartDay): WeekdayKey[] {
  return [...WEEKDAY_KEYS.slice(weekStart), ...WEEKDAY_KEYS.slice(0, weekStart)];
}

/** Short labels (Sun, Mon, …) in the member's order. */
export function orderedDayLabels(weekStart: WeekStartDay): string[] {
  return orderedDayKeys(weekStart).map((k) => k.slice(0, 1).toUpperCase() + k.slice(1, 3));
}

/** Local-midnight Date of the first day of the week containing `d`. */
export function startOfWeek(d: Date, weekStart: WeekStartDay): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (out.getDay() - weekStart + 7) % 7;
  out.setDate(out.getDate() - diff);
  return out;
}

/** 0-based column index of a date within its week grid. */
export function dayIndexInWeek(day: number, weekStart: WeekStartDay): number {
  return (day - weekStart + 7) % 7;
}
