import { describe, it, expect } from "vitest";
import {
  buildSchedule,
  canFast,
  effectiveTarget,
  getFastingWindow,
  scheduleForProfile,
  hasSnacks,
  type FastingProfileLike,
} from "./mealTiming";

const base = (over: Partial<FastingProfileLike> = {}): FastingProfileLike => ({
  fasting_eligibility: "eligible",
  doctor_confirmed_at: null,
  fasting_target: 0,
  fasting_started_on: null,
  window_start_hour: 8,
  bedtime_hour: 22,
  ...over,
});

describe("eligibility gate", () => {
  it("unscreened members cannot fast", () => {
    expect(canFast(base({ fasting_eligibility: "unscreened" }))).toBe(false);
    expect(canFast(null)).toBe(false);
  });

  it("needs_doctor cannot fast, scheduling is disabled release-wide", () => {
    expect(canFast(base({ fasting_eligibility: "needs_doctor" }))).toBe(false);
    // Even a doctor-confirmed member cannot fast while FASTING_SCHEDULING_ENABLED is false.
    expect(
      canFast(base({ fasting_eligibility: "needs_doctor", doctor_confirmed_at: "2026-01-01T00:00:00Z" })),
    ).toBe(false);
  });

  it("not_eligible produces no fasting window for ANY target value", () => {
    for (const target of [0, 1, 2, 3]) {
      const p = base({
        fasting_eligibility: "not_eligible",
        fasting_target: target,
        // target was chosen long before the exclusion was reported
        fasting_started_on: "2020-01-01",
      });
      expect(effectiveTarget(p, new Date("2026-08-02T12:00:00"))).toBe(0);
      expect(getFastingWindow(p, new Date("2026-08-02T12:00:00"))).toBeNull();
      expect(canFast(p)).toBe(false);
    }
  });
});

describe("ramp", () => {
  it("no ramp is reachable while fasting scheduling is disabled", () => {
    const p = base({ fasting_target: 3, fasting_started_on: "2026-08-01" });
    expect(effectiveTarget(p, new Date("2026-08-03T12:00:00"))).toBe(0);
    expect(effectiveTarget(p, new Date("2026-08-09T12:00:00"))).toBe(0);
    expect(getFastingWindow(p, new Date("2026-08-09T12:00:00"))).toBeNull();
  });

  it("needs_doctor members get no schedule while scheduling is disabled", () => {
    const p = base({
      fasting_eligibility: "needs_doctor",
      doctor_confirmed_at: "2026-08-01T00:00:00Z",
      fasting_target: 3,
      fasting_started_on: "2026-08-01",
    });
    expect(effectiveTarget(p, new Date("2026-08-10T12:00:00"))).toBe(0);
    expect(effectiveTarget(p, new Date("2026-08-20T12:00:00"))).toBe(0);
    expect(effectiveTarget(p, new Date("2026-09-05T12:00:00"))).toBe(0);
    expect(getFastingWindow(p, new Date("2026-09-05T12:00:00"))).toBeNull();
  });
});

describe("buildSchedule", () => {
  it("16:8 gives three meals at 4-hour spacing and zero snacks", () => {
    const s = buildSchedule({ windowStartHour: 8, windowHours: 8, bedtimeHour: 22 });
    const meals = s.filter((i) => i.kind === "meal");
    expect(meals.map((m) => m.hour)).toEqual([8, 12, 16]);
    expect(s.filter((i) => i.kind === "snack")).toHaveLength(0);
  });

  it("non-fasting 12h window gives three meals with snacks only where a gap exceeds 5h", () => {
    const s = scheduleForProfile(base({ fasting_target: 0 }));
    const meals = s.filter((i) => i.kind === "meal");
    expect(meals).toHaveLength(3);
    for (const snack of s.filter((i) => i.kind === "snack")) {
      const before = meals.filter((m) => m.hour < snack.hour).pop()!;
      const after = meals.find((m) => m.hour > snack.hour)!;
      expect(after.hour - before.hour).toBeGreaterThan(5);
      expect(snack.hour).toBeCloseTo((before.hour + after.hour) / 2, 5);
    }
    expect(hasSnacks(s)).toBe(true);
  });

  it("last meal lands at least 3 hours before bedtime", () => {
    const s = buildSchedule({ windowStartHour: 11, windowHours: 12, bedtimeHour: 21 });
    const meals = s.filter((i) => i.kind === "meal");
    expect(meals[meals.length - 1].hour).toBeLessThanOrEqual(18);
  });

  it("meals stay 4–5 hours apart for fasting windows", () => {
    const s = buildSchedule({ windowStartHour: 9, windowHours: 10, bedtimeHour: 22 });
    const meals = s.filter((i) => i.kind === "meal");
    for (let i = 1; i < meals.length; i++) {
      const gap = meals[i].hour - meals[i - 1].hour;
      expect(gap).toBeGreaterThanOrEqual(4);
      expect(gap).toBeLessThanOrEqual(5);
    }
  });
});
