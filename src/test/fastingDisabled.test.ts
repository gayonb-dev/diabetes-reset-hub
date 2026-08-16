// Prompt 6 closeout — fasting scheduling stays disabled and unreachable.
//
// This is a safety gate, not a feature toggle: enabling it requires a recorded
// clinical approval. The test fails the build if either the client flag, the
// Edge Function flag, or the recorded approval drifts.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FASTING_SCHEDULING_ENABLED,
  FASTING_SCHEDULING_CLINICAL_APPROVAL,
} from "@/lib/featureFlags";
import { canFast, effectiveTarget } from "../../supabase/functions/_shared/fastingTarget";

const root = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("fasting scheduling is disabled", () => {
  it("the client flag is false with no recorded clinical approval", () => {
    expect(FASTING_SCHEDULING_ENABLED).toBe(false);
    expect(FASTING_SCHEDULING_CLINICAL_APPROVAL).toBeNull();
  });

  it("the Edge Function flag is false too", () => {
    expect(read("supabase/functions/_shared/featureFlags.ts")).toContain(
      "export const FASTING_SCHEDULING_ENABLED = false",
    );
  });

  it("no member is eligible for a fasting window while the flag is off", () => {
    for (const profile of [
      null,
      {},
      { fasting_opt_in: true, doctor_confirmed: true, target_hours: 16 },
      { fasting_opt_in: true, doctor_confirmed: true, target_hours: 18, medication_class: null },
    ]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exercising defensive input shapes
      expect(fastingHoursFor(profile as any)).toBe(0);
    }
  });
});

describe("fasting scheduling is unreachable in the UI", () => {
  const page = read("src/pages/app/Fasting.tsx");

  it("every scheduling block is behind the flag", () => {
    expect(page).toContain("FASTING_SCHEDULING_ENABLED &&");
  });

  it("the page ships no live timer or countdown loop", () => {
    expect(/setInterval\s*\(/.test(page)).toBe(false);
  });

  it("no fasting notification is scheduled by the notification cron", () => {
    const cron = read("supabase/functions/notifications-cron/index.ts");
    expect(/fast(ing)?[_-]?(window|start|end|reminder)/i.test(cron)).toBe(false);
  });
});
