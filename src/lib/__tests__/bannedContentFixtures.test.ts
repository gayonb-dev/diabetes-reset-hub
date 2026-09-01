import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * Batch 1 POST-v2, permanent false-negative regression fixtures.
 *
 * These exact strings escaped an earlier content scan and shipped to members.
 * Each one must be detected by scripts/doctor-review/banned.py forever, and the
 * approved neutral replacements must never be flagged.
 */

const SCRIPT_DIR = path.resolve(__dirname, "../../../scripts/doctor-review");

function scan(text: string): string[] {
  const out = execFileSync(
    "python3",
    [
      "-c",
      "import sys,json;sys.path.insert(0,sys.argv[1]);from banned import scan_text;print(json.dumps(scan_text(sys.argv[2])))",
      SCRIPT_DIR,
      text,
    ],
    { encoding: "utf8" },
  );
  return JSON.parse(out);
}

const MUST_FAIL: Array<[string, string]> = [
  ["Water Target", "hydration_target"],
  ["Hit your full water goal before 6 PM today.", "hydration_target"],
  ["Half your water by 2 PM", "hydration_target"],
  ["Full target by evening", "hydration_target"],
  ["All four rings closed", "perfection_mandatory"],
  ["All rings closed today", "perfection_mandatory"],
  ["Log everything", "perfection_mandatory"],
  ["Complete all 3 walks", "forced_progression"],
  ["Workout with one added set, or 3 walks", "forced_progression"],
  ["Stand or move 2 minutes every waking hour", "forced_progression"],
  ["Protein at every meal", "universal_meal_requirement"],
  ["All meals plate-method", "universal_meal_requirement"],
  ["Teach the Snack Window", "snack_window"],
  ["Movement Before the First Meal", "fasting_scheduling"],
  ["Prepare for tomorrow's test and measurement", "a1c_test_prep"],
  ["Your first A1C result anchors everything.", "a1c_test_prep"],
  ["The A1C Countdown Begins", "a1c_test_prep"],
  ["Legs & glutes • Insulin-sensitivity boost", "outcome_claim"],
  ["It moves glucose into your muscles instead of your bloodstream", "outcome_claim"],
  ["Front-loading hydration prevents the evening cravings", "outcome_claim"],
  ["Logged your first compliant meal.", "perfection_mandatory"],
  ["Reverse your diabetes in 90 days", "reversal_cure"],
  ["Add berberine to your stack", "supplement_product"],
  ["Hold the line", "perfection_mandatory"],
];

const MUST_PASS = [
  "Log the water you drink, if that is useful to you",
  "24 oz logged today",
  "Choose and log one useful routine today",
  "One comfortable movement option, if it is safe for you",
  "Include a protein food at one meal if it fits your plan",
  "Try the plate method at one meal",
  "Snacks are optional. If a snack fits your care plan, choose a time and food that work with your hunger, medicines, activity and daily schedule.",
  "If A1C testing is part of your care plan, you can record a result here when you have one.",
  "DRM does not promise remission.",
  "Never start, stop, skip or change medicine because of this app.",
];

describe("banned-content regression fixtures", () => {
  it.each(MUST_FAIL)("flags %s", (text, category) => {
    expect(scan(text)).toContain(category);
  });

  it.each(MUST_PASS)("allows %s", (text) => {
    expect(scan(text)).toEqual([]);
  });
});
