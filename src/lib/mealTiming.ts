// Single source of truth for every meal and snack time in the app.
// Pure functions only — no React, no Supabase, fully unit-testable.
//
// The eligibility gate, the ramp, and the window length live in
// supabase/functions/_shared/fastingTarget.ts so that the browser bundle and
// the generate-meal-plan edge function compile the SAME module rather than two
// copies that can drift. Everything below is client/schedule maths on top.

import {
  canFast,
  clampWindowStart,
  eatingHoursForTarget,
  effectiveTarget,
  TARGET_LABEL,
  type FastingEligibility,
  type FastingProfileLike,
  type FastingTarget,
} from "../../supabase/functions/_shared/fastingTarget.ts";

export {
  canFast,
  clampWindowStart,
  eatingHoursForTarget,
  effectiveTarget,
  TARGET_LABEL,
};
export type { FastingEligibility, FastingProfileLike, FastingTarget };

export interface ScheduleItem {
  kind: "meal" | "snack";
  label: string;
  /** Hour of day as a float, e.g. 12.5 = 12:30pm */
  hour: number;
}

export interface FastingWindow {
  /** Eating window length in hours */
  eatingHours: number;
  /** Fasting length in hours */
  fastingHours: number;
  startHour: number;
  endHour: number;
  label: string;
}

/** The fasting window in force today, or null when the member isn't fasting. */
export function getFastingWindow(
  p: FastingProfileLike | null | undefined,
  today: Date = new Date(),
): FastingWindow | null {
  const target = effectiveTarget(p, today);
  if (target === 0) return null;
  const eatingHours = eatingHoursForTarget(target);
  const startHour = clampWindowStart(p?.window_start_hour ?? 8);
  return {
    eatingHours,
    fastingHours: 24 - eatingHours,
    startHour,
    endHour: startHour + eatingHours,
    label: TARGET_LABEL[target],
  };
}

const MEAL_LABELS = ["Meal 1", "Meal 2", "Meal 3", "Meal 4", "Meal 5"];

export interface BuildScheduleArgs {
  windowStartHour: number;
  /** Eating-window length in hours */
  windowHours: number;
  bedtimeHour: number;
}

/**
 * Meals spaced 4–5 hours apart inside the eating window; a snack is inserted
 * only when a gap between two meals exceeds 5 hours, at the midpoint of that
 * gap; the last meal lands at least 3 hours before bedtime.
 */
export function buildSchedule({
  windowStartHour,
  windowHours,
  bedtimeHour,
}: BuildScheduleArgs): ScheduleItem[] {
  const start = clampWindowStart(windowStartHour);
  const latestMeal = bedtimeHour - 3;
  const lastMeal = Math.max(start, Math.min(start + windowHours, latestMeal));
  const span = lastMeal - start;

  const gaps = span <= 0 ? 0 : Math.max(1, Math.round(span / 4.5));
  const spacing = gaps === 0 ? 0 : span / gaps;

  const meals: ScheduleItem[] = [];
  for (let i = 0; i <= gaps; i++) {
    meals.push({
      kind: "meal",
      label: MEAL_LABELS[i] ?? `Meal ${i + 1}`,
      hour: Math.round((start + spacing * i) * 100) / 100,
    });
  }

  const out: ScheduleItem[] = [];
  let snackIndex = 1;
  meals.forEach((m, i) => {
    out.push(m);
    const next = meals[i + 1];
    if (next && next.hour - m.hour > 5) {
      out.push({
        kind: "snack",
        label: `Snack ${snackIndex++}`,
        hour: Math.round(((m.hour + next.hour) / 2) * 100) / 100,
      });
    }
  });
  return out;
}

/** Today's schedule for a member, fasting or not. */
export function scheduleForProfile(
  p: FastingProfileLike | null | undefined,
  today: Date = new Date(),
): ScheduleItem[] {
  const win = getFastingWindow(p, today);
  return buildSchedule({
    windowStartHour: win?.startHour ?? clampWindowStart(p?.window_start_hour ?? 8),
    windowHours: win?.eatingHours ?? 12,
    bedtimeHour: p?.bedtime_hour ?? 22,
  });
}

export function hasSnacks(items: ScheduleItem[]): boolean {
  return items.some((i) => i.kind === "snack");
}

export function formatHour(hour: number): string {
  const h24 = Math.floor(hour);
  const mins = Math.round((hour - h24) * 60);
  const d = new Date();
  d.setHours(h24, mins, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Copy used everywhere snack timing is explained. */
export const SNACK_TIMING_COPY =
  "Snacks work best 3–4 hours after a main meal, and are mainly for bridging gaps longer than 5 hours.";

export const NO_SNACK_COPY =
  "Your meals are spaced closely enough today that a snack isn't needed — snacks mainly bridge gaps longer than five hours. If you're genuinely hungry, the Snack Library is there.";
