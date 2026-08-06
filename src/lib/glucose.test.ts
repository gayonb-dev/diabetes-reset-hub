import { describe, it, expect } from "vitest";
import {
  classifyGlucose,
  classifyGlucoseFromUnit,
  glucoseTone,
  isPlausible,
  isFutureTimestamp,
  GLUCOSE_STATUS_LABEL,
  GlucoseReadingType,
} from "@/lib/glucose";

const TYPES: GlucoseReadingType[] = ["fasting", "post_meal", "bedtime", "other", "cgm"];

describe("low-safety thresholds apply first for every reading type", () => {
  for (const t of TYPES) {
    it(`${t}: 53 urgent_low, 54 low, 69 low, 70 in_range`, () => {
      expect(classifyGlucose(53, t)).toBe("urgent_low");
      expect(classifyGlucose(53.9, t)).toBe("urgent_low");
      expect(classifyGlucose(54, t)).toBe("low");
      expect(classifyGlucose(69, t)).toBe("low");
      expect(classifyGlucose(69.9, t)).toBe("low");
      expect(classifyGlucose(70, t)).toBe("in_range");
    });
  }
});

describe("context-specific ranges at and above 70", () => {
  it("fasting", () => {
    expect(classifyGlucose(99, "fasting")).toBe("in_range");
    expect(classifyGlucose(100, "fasting")).toBe("elevated");
    expect(classifyGlucose(125, "fasting")).toBe("elevated");
    expect(classifyGlucose(126, "fasting")).toBe("high");
  });
  it("post_meal", () => {
    expect(classifyGlucose(139, "post_meal")).toBe("in_range");
    expect(classifyGlucose(140, "post_meal")).toBe("elevated");
    expect(classifyGlucose(199, "post_meal")).toBe("elevated");
    expect(classifyGlucose(200, "post_meal")).toBe("high");
  });
  it("bedtime", () => {
    expect(classifyGlucose(119, "bedtime")).toBe("in_range");
    expect(classifyGlucose(120, "bedtime")).toBe("elevated");
    expect(classifyGlucose(179, "bedtime")).toBe("elevated");
    expect(classifyGlucose(180, "bedtime")).toBe("high");
  });
  it("other and cgm share the post-meal style range", () => {
    for (const t of ["other", "cgm"] as GlucoseReadingType[]) {
      expect(classifyGlucose(139, t)).toBe("in_range");
      expect(classifyGlucose(140, t)).toBe("elevated");
      expect(classifyGlucose(200, t)).toBe("high");
    }
  });
  it("no new urgent-high threshold is introduced at 250", () => {
    expect(classifyGlucose(250, "fasting")).toBe("high");
    expect(classifyGlucose(600, "fasting")).toBe("high");
  });
});

describe("mmol/L values convert before classification", () => {
  it("2.9 urgent_low, 3.0 low, 3.8 low, 3.9 in_range", () => {
    expect(classifyGlucoseFromUnit(2.9, "mmoll", "fasting")).toBe("urgent_low");
    expect(classifyGlucoseFromUnit(3.0, "mmoll", "fasting")).toBe("low");
    expect(classifyGlucoseFromUnit(3.8, "mmoll", "fasting")).toBe("low");
    expect(classifyGlucoseFromUnit(3.9, "mmoll", "fasting")).toBe("in_range");
  });
  it("mg/dL passthrough is unchanged", () => {
    expect(classifyGlucoseFromUnit(95, "mgdl", "fasting")).toBe("in_range");
  });
});

describe("tones and labels", () => {
  it("maps statuses to tones", () => {
    expect(glucoseTone("urgent_low")).toBe("danger");
    expect(glucoseTone("low")).toBe("warning");
    expect(glucoseTone("in_range")).toBe("normal");
    expect(glucoseTone("elevated")).toBe("warning");
    expect(glucoseTone("high")).toBe("danger");
  });
  it('never labels a reading "Normal"', () => {
    expect(Object.values(GLUCOSE_STATUS_LABEL)).not.toContain("Normal");
    expect(GLUCOSE_STATUS_LABEL.in_range).toBe("In range");
  });
});

describe("validation", () => {
  it("rejects implausible values outside 20-600", () => {
    expect(isPlausible(19)).toBe(false);
    expect(isPlausible(20)).toBe(true);
    expect(isPlausible(600)).toBe(true);
    expect(isPlausible(601)).toBe(false);
    expect(isPlausible(null)).toBe(false);
  });
  it("detects future timestamps", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    expect(isFutureTimestamp("2026-01-01T12:00:01Z", now)).toBe(true);
    expect(isFutureTimestamp("2026-01-01T11:59:59Z", now)).toBe(false);
  });
});
