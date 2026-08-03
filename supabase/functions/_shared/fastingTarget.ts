// SINGLE SOURCE OF TRUTH for the fasting eligibility gate, the ramp, and the
// eating-window length. This exact file is compiled into BOTH the browser
// bundle (re-exported by src/lib/mealTiming.ts) and the Deno edge functions
// (imported by generate-meal-plan). There is no second copy to drift.
//
// Dependency-free TypeScript only — no Deno APIs, no npm imports, no DOM.

export type FastingEligibility =
  | "unscreened"
  | "eligible"
  | "needs_doctor"
  | "not_eligible";

export type FastingTarget = 0 | 1 | 2 | 3;

export interface FastingProfileLike {
  fasting_eligibility?: string | null;
  doctor_confirmed_at?: string | null;
  fasting_target?: number | null;
  fasting_started_on?: string | null;
  window_start_hour?: number | null;
  bedtime_hour?: number | null;
}

export const TARGET_LABEL: Record<FastingTarget, string> = {
  0: "Not fasting",
  1: "12:12",
  2: "14:10",
  3: "16:8",
};

/** Eating-window hours for a target. Target 0 (not fasting) defaults to 12. */
export function eatingHoursForTarget(target: FastingTarget): number {
  if (target === 3) return 8;
  if (target === 2) return 10;
  return 12;
}

/**
 * Eligibility gate. Evaluated BEFORE any target value anywhere in the app —
 * eligibility always overrides target, never the other way around.
 * `unscreened` members have not answered the safety questions yet, so they
 * cannot fast until they do.
 */
export function canFast(p: FastingProfileLike | null | undefined): boolean {
  const e = (p?.fasting_eligibility ?? "unscreened") as FastingEligibility;
  if (e === "eligible") return true;
  if (e === "needs_doctor") return !!p?.doctor_confirmed_at;
  return false; // unscreened, not_eligible, or anything unknown
}

function daysSince(startISO: string | null | undefined, today: Date): number {
  if (!startISO) return 0;
  const start = new Date(`${startISO.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((t.getTime() - start.getTime()) / 86400000));
}

/**
 * The target actually in force today, after the eligibility gate and the ramp.
 * Standard ramp: week one is always 12:12, chosen target from day 8.
 * needs_doctor (confirmed): 12:12 for two weeks, 14:10 for two weeks, then target.
 */
export function effectiveTarget(
  p: FastingProfileLike | null | undefined,
  today: Date = new Date(),
): FastingTarget {
  if (!canFast(p)) return 0;
  const stored = Math.min(3, Math.max(0, Math.round(p?.fasting_target ?? 0))) as FastingTarget;
  if (stored === 0) return 0;

  const day = daysSince(p?.fasting_started_on, today); // 0-indexed
  const gradual = (p?.fasting_eligibility ?? "") === "needs_doctor";

  if (gradual) {
    if (day < 14) return 1;
    if (day < 28) return Math.min(2, stored) as FastingTarget;
    return stored;
  }
  if (day < 7) return 1;
  return stored;
}

export function clampWindowStart(h: number): number {
  return Math.min(11, Math.max(6, Math.round(h)));
}
