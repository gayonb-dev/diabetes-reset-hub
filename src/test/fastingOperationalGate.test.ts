// Final fasting reconciliation gate.
//
// DRM does not prescribe, recommend, schedule or operationalize intermittent
// fasting. These tests fail the build if any operational fasting path returns,
// whatever a stored profile or legacy row says.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  canFast,
  effectiveTarget,
  getFastingWindow,
  scheduleForProfile,
  TARGET_LABEL,
  type FastingProfileLike,
} from "@/lib/mealTiming";
import { rampStatus } from "@/lib/mealTiming";

const root = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
}

/** The strongest formerly enabling profiles, plus malformed input. */
const PROFILES: Array<[string, FastingProfileLike | null | undefined]> = [
  ["eligible with a nonzero target", {
    fasting_eligibility: "eligible",
    fasting_target: 3,
    fasting_started_on: "2020-01-01",
    window_start_hour: 8,
    bedtime_hour: 22,
  }],
  ["doctor-confirmed needs_doctor", {
    fasting_eligibility: "needs_doctor",
    doctor_confirmed_at: "2020-01-01T00:00:00Z",
    fasting_target: 3,
    fasting_started_on: "2020-01-01",
  }],
  ["not_eligible", { fasting_eligibility: "not_eligible", fasting_target: 2 }],
  ["unscreened", { fasting_eligibility: "unscreened", fasting_target: 1 }],
  ["malformed", {
    fasting_eligibility: "totally-unknown-value",
    fasting_target: 99 as unknown as number,
    fasting_started_on: "not-a-date",
    window_start_hour: -5,
    bedtime_hour: 99,
  }],
  ["null", null],
  ["undefined", undefined],
];

describe("no profile can reach a fasting schedule", () => {
  for (const [name, p] of PROFILES) {
    it(`${name}: canFast false, target 0, window null`, () => {
      expect(canFast(p)).toBe(false);
      expect(effectiveTarget(p)).toBe(0);
      expect(getFastingWindow(p)).toBeNull();
      expect(rampStatus(p).ramping).toBe(false);
      expect(rampStatus(p).current).toBe(0);
    });
  }

  it("meal scheduling stays standard for the strongest enabling profile", () => {
    const s = scheduleForProfile(PROFILES[0][1]);
    const meals = s.filter((i) => i.kind === "meal");
    expect(meals).toHaveLength(3);
    // A 12-hour, non-fasting span, not an 8-hour fasting window.
    expect(meals[meals.length - 1].hour - meals[0].hour).toBeGreaterThan(8);
  });

  it("no fasting window label exists to render", () => {
    for (const label of Object.values(TARGET_LABEL)) {
      expect(/\d{1,2}\s*:\s*\d{1,2}/.test(label)).toBe(false);
      expect(label).toBe("Not fasting");
    }
  });
});

describe("no client code can create or drive fasting rows", () => {
  const files = walk(resolve(root, "src")).filter((f) => !/\/test\//.test(f));

  it("no module inserts, updates or upserts if_fasting_log", () => {
    const offenders = files.filter((f) => {
      const src = readFileSync(f, "utf8");
      if (!src.includes("if_fasting_log")) return false;
      // Reads for the data-rights export are allowed; writes are not.
      return /if_fasting_log[\s\S]{0,200}?\.(insert|update|upsert|delete)\(/.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it("no module sets fast_start_at to a non-null value", () => {
    const offenders = files.filter((f) => {
      const src = readFileSync(f, "utf8");
      // Type declarations (`fast_start_at: string | null`) are not writes.
      const allowed = new Set(["null", "string", "Date"]);
      for (const m of src.matchAll(/fast_start_at\s*\??\s*:\s*([A-Za-z0-9_$]+)/g)) {
        if (!allowed.has(m[1])) return true;
      }
      return false;
    });
    expect(offenders).toEqual([]);
  });

  it("the Cheat Meal page writes only cheat_meals with a null fast_start_at", () => {
    const page = read("src/pages/app/CheatMeal.tsx");
    expect(page).toContain("fast_start_at: null");
    expect(page).not.toContain("if_fasting_log");
    expect(page).not.toMatch(/start(ing)? (a |your )?fast/i);
  });

  it("meal slots never branch on a legacy intermittent_fasting plan type", () => {
    const meals = read("src/pages/app/Meals.tsx");
    expect(meals).not.toMatch(/===\s*"intermittent_fasting"/);
  });
});

describe("nothing rewards fasting", () => {
  it("award-badges no longer reads if_fasting_log", () => {
    const fn = read("supabase/functions/award-badges/index.ts");
    expect(fn).not.toMatch(/existsRow\("if_fasting_log"/);
    expect(fn).not.toMatch(/add\("night-faster"/);
    expect(fn).not.toMatch(/add\("cheat-and-fast"/);
  });

  it("the notification cron schedules no fasting message", () => {
    const cron = read("supabase/functions/notifications-cron/index.ts");
    expect(/fast(ing)?[_-]?(window|start|end|reminder)/i.test(cron)).toBe(false);
  });
});

describe("public pages make no DRM outcome claim", () => {
  const sources = ["src/pages/LLMInfo.tsx", "public/llms.txt"];
  const banned =
    /(reduce|reduces|lower|lowers|prevent|prevents|stabiliz|control)\s+[^.\n]{0,40}(glucose|blood sugar|a1c|inflammation)/i;

  for (const file of sources) {
    it(`${file} claims no glucose, A1C or inflammation outcome`, () => {
      const text = read(file);
      const lines = text.split("\n").filter((l) => banned.test(l) && !/makes no claim/i.test(l));
      expect(lines).toEqual([]);
      expect(text).not.toMatch(/faster than long, abstract programs/i);
      expect(text).not.toMatch(/Why It Works/i);
    });
  }
});
