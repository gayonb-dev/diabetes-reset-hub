import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  LEGAL,
  LAST_UPDATED_DISPLAY,
  PENDING_UK_REGISTRATION_FIELDS,
  PENDING_UK_REGISTRATION_NOTICE,
} from "@/config/legal";

/**
 * Legal presentation checks. These are informational and MUST NOT block a
 * build or publication: publication is a manual owner decision.
 */
const root = resolve(__dirname, "../..");

describe("legal presentation", () => {
  it("no automated release gate remains", () => {
    expect(existsSync(resolve(root, "scripts/release-gate.mjs"))).toBe(false);
    expect(existsSync(resolve(root, "src/components/landing/DraftBanner.tsx"))).toBe(false);
  });

  it("shows the owner-reviewed date", () => {
    expect(LAST_UPDATED_DISPLAY).toBe("August 12, 2026");
    expect(LEGAL.owner_review_date).toBe("2026-08-12");
    expect(LEGAL.ico_fee_assessment_date).toBe("2026-08-12");
  });

  it("never renders a raw placeholder token for pending UK registration", () => {
    for (const key of PENDING_UK_REGISTRATION_FIELDS) {
      expect(/\[\[.+\]\]/.test(String(LEGAL[key]))).toBe(false);
    }
    expect(PENDING_UK_REGISTRATION_NOTICE).toContain("awaiting completion of its UK company registration");
  });
});
