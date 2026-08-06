import { describe, it, expect } from "vitest";
import { bloodSugarTone } from "@/pages/app/Dashboard";
import { classifyGlucose, glucoseTone, GLUCOSE_STATUS_LABEL, GlucoseReadingType } from "@/lib/glucose";

/**
 * Regression guard: the dashboard quick stat used to treat anything under
 * 100 mg/dL as "normal", so a saved 55 rendered green. It must now delegate
 * entirely to the shared classifier.
 */
describe("Dashboard blood sugar tone delegates to the shared classifier", () => {
  it("a saved 55 mg/dL is not shown as normal", () => {
    expect(bloodSugarTone(55, "fasting")).toBe("warning");
    expect(bloodSugarTone(55, "fasting")).not.toBe("normal");
    expect(GLUCOSE_STATUS_LABEL[classifyGlucose(55, "fasting")]).toBe("Low");
  });

  it("a 45 mg/dL reading is danger, not normal", () => {
    expect(bloodSugarTone(45, "fasting")).toBe("danger");
  });

  it('95 fasting is in range', () => {
    expect(bloodSugarTone(95, "fasting")).toBe("normal");
    expect(GLUCOSE_STATUS_LABEL[classifyGlucose(95, "fasting")]).toBe("In range");
  });

  it("matches the classifier across every reading type and boundary", () => {
    const types: GlucoseReadingType[] = ["fasting", "post_meal", "bedtime", "other", "cgm"];
    for (const t of types) {
      for (const v of [30, 53, 54, 69, 70, 99, 100, 125, 126, 139, 140, 180, 199, 200, 300]) {
        expect(bloodSugarTone(v, t)).toBe(glucoseTone(classifyGlucose(v, t)));
      }
    }
  });
});
