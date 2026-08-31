import { describe, it, expect } from "vitest";
import {
  ML_PER_US_FL_OZ,
  approxMl,
  flOzToMl,
  mlToFlOz,
  toStoredFlOz,
  formatVolume,
  lbToKg,
  mgdlToMmoll,
} from "@/lib/units";
import { waterLoggedLabel, waterAwardIdempotencyKey } from "@/lib/hydration";

describe("volume helpers", () => {
  it("uses the US fluid ounce, not the Imperial one", () => {
    expect(ML_PER_US_FL_OZ).toBeCloseTo(29.5735, 3);
  });

  it("round-trips between units", () => {
    expect(mlToFlOz(flOzToMl(16))).toBeCloseTo(16, 10);
  });

  it("applies storage rounding exactly once, at submission", () => {
    // 250 mL is ~8.45 fl oz and is stored as 8 fl oz (~237 mL).
    expect(toStoredFlOz(250, "ml")).toBe(8);
    expect(approxMl(8)).toBe(237);
    expect(toStoredFlOz(12, "floz")).toBe(12);
  });

  it("treats amounts that round to zero as nothing saved", () => {
    expect(toStoredFlOz(10, "ml")).toBe(0);
    expect(toStoredFlOz(0, "floz")).toBe(0);
    expect(toStoredFlOz(-5, "floz")).toBe(0);
    expect(toStoredFlOz(Number.NaN, "ml")).toBe(0);
  });

  it("formats without inventing a target", () => {
    const text = formatVolume(24);
    expect(text).toMatch(/24/);
    expect(text).not.toMatch(/target|goal|%|\//i);
  });

  it("leaves other measurement conversions untouched", () => {
    expect(lbToKg(100)).toBeCloseTo(45.359237, 6);
    expect(mgdlToMmoll(180)).toBeCloseTo(9.99, 2);
  });
});

describe("hydration labels", () => {
  it("states only what was logged, in fl oz with an approximate mL", () => {
    expect(waterLoggedLabel(24)).toBe("24 fl oz logged today (≈ 710 mL)");
    expect(waterLoggedLabel(0)).toBe("0 fl oz logged today (≈ 0 mL)");
    expect(waterLoggedLabel(32)).not.toMatch(/target|goal|%|\//i);
  });

  it("awards the logging action once per member calendar day", () => {
    expect(waterAwardIdempotencyKey("2026-08-31")).toBe("log_water:2026-08-31");
    expect(waterAwardIdempotencyKey("2026-08-31")).toBe(
      waterAwardIdempotencyKey("2026-08-31"),
    );
    expect(waterAwardIdempotencyKey("2026-09-01")).not.toBe(
      waterAwardIdempotencyKey("2026-08-31"),
    );
  });
});
