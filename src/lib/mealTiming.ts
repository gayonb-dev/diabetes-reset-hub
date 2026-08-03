// Single source of truth for every meal and snack time in the app.
// Pure functions only — no React, no Supabase, fully unit-testable.
//
// The implementation lives in supabase/functions/_shared/fastingTarget.ts so
// that the browser bundle and the generate-meal-plan edge function compile the
// SAME module rather than two copies that can drift. This file is the client
// entry point: it re-exports that module and adds the ramp-description helper,
// which is UI copy and has no server counterpart.

import {
  buildSchedule,
  canFast,
  clampWindowStart,
  eatingHoursForTarget,
  effectiveTarget,
  formatHour,
  getFastingWindow,
  hasSnacks,
  MEAL_TIMING_VERSION,
  NO_SNACK_COPY,
  scheduleForProfile,
  SNACK_TIMING_COPY,
  TARGET_LABEL,
  type BuildScheduleArgs,
  type FastingEligibility,
  type FastingProfileLike,
  type FastingTarget,
  type FastingWindow,
  type ScheduleItem,
} from "../../supabase/functions/_shared/fastingTarget.ts";

export {
  buildSchedule,
  canFast,
  clampWindowStart,
  eatingHoursForTarget,
  effectiveTarget,
  formatHour,
  getFastingWindow,
  hasSnacks,
  MEAL_TIMING_VERSION,
  NO_SNACK_COPY,
  scheduleForProfile,
  SNACK_TIMING_COPY,
  TARGET_LABEL,
};
export type {
  BuildScheduleArgs,
  FastingEligibility,
  FastingProfileLike,
  FastingTarget,
  FastingWindow,
  ScheduleItem,
};



export interface RampStatus {
  /** Target in force today */
  current: FastingTarget;
  /** Target the member chose */
  chosen: FastingTarget;
  /** True while the ramp is still holding the member below their chosen target */
  ramping: boolean;
  /** Days until the next step of the ramp, 0 when not ramping */
  daysUntilNext: number;
  /** Plain sentence describing where they are and what changes when */
  description: string;
}

/**
 * Where the member is in the ramp, and what changes when. Uses the same day
 * arithmetic as effectiveTarget so the two can never disagree.
 */
export function rampStatus(
  p: FastingProfileLike | null | undefined,
  today: Date = new Date(),
): RampStatus {
  const chosen = Math.min(3, Math.max(0, Math.round(p?.fasting_target ?? 0))) as FastingTarget;
  const current = effectiveTarget(p, today);

  if (current === 0 || chosen === 0) {
    return {
      current: 0,
      chosen,
      ramping: false,
      daysUntilNext: 0,
      description: "You're not fasting right now. Three meals across a twelve-hour day.",
    };
  }

  const start = p?.fasting_started_on ? new Date(`${p.fasting_started_on.slice(0, 10)}T00:00:00`) : null;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = start && !Number.isNaN(start.getTime())
    ? Math.max(0, Math.floor((t.getTime() - start.getTime()) / 86400000))
    : 0;
  const gradual = (p?.fasting_eligibility ?? "") === "needs_doctor";

  // Next boundary in the ramp, if any.
  let boundary = 0;
  if (gradual) {
    if (day < 14) boundary = 14;
    else if (day < 28 && chosen > 2) boundary = 28;
  } else if (day < 7) {
    boundary = 7;
  }

  if (current === chosen || boundary === 0) {
    return {
      current,
      chosen,
      ramping: false,
      daysUntilNext: 0,
      description: `You're on ${TARGET_LABEL[current]} — your chosen target. Nothing changes unless you change it.`,
    };
  }

  const daysUntilNext = boundary - day;
  const next = gradual && boundary === 14 ? (Math.min(2, chosen) as FastingTarget) : chosen;
  return {
    current,
    chosen,
    ramping: true,
    daysUntilNext,
    description: `You're on ${TARGET_LABEL[current]} today. Your ${TARGET_LABEL[next]} ${
      next === chosen ? "target" : "step"
    } starts in ${daysUntilNext} day${daysUntilNext === 1 ? "" : "s"}.`,
  };
}
