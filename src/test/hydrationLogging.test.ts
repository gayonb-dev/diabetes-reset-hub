import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { waterLoggedLabel, waterAwardIdempotencyKey } from "@/lib/hydration";
import { calendarDayKey } from "@/lib/calendarDay";

/**
 * Batch 1 closeout correction, hydration (appendix C10/H1).
 *
 * DRM publishes no universal fluid target. Member surfaces show only what was
 * logged; the once-daily "logged water" award is idempotent per member calendar
 * day and represents logging, never achieving a medical target.
 */

// ---------------------------------------------------------------- label ----

describe("hydration labels", () => {
  it("shows only the amount logged today", () => {
    expect(waterLoggedLabel(0)).toBe("0 fl oz logged today (≈ 0 mL)");
    expect(waterLoggedLabel(32)).toBe("32 fl oz logged today (≈ 946 mL)");
    expect(waterLoggedLabel(32)).not.toMatch(/\/|%|target/i);
  });
});

// -------------------------------------------------- target-semantics scan ---

const ROOTS = ["src", "supabase/functions"];
const SCAN_EXCLUDE = ["src/test/"];

/**
 * Rejects hydration TARGET semantics only. Logged amounts, quick-add buttons,
 * recipe quantities, file positions and unrelated uses of 64 stay legal.
 */
const HYDRATION_TARGET_PATTERNS: Array<[string, RegExp]> = [
  ["fixed default hydration constant", /DEFAULT_WATER_TARGET(_OZ)?/],
  ["water target variable", /\b(water|hydration)[_A-Za-z]*target[_A-Za-z]*\b/i],
  ["fixed ounce target phrase", /\b\d{2,3}\s*(oz|ounces)\b[^.\n]{0,20}\b(target|goal|daily minimum|per day)\b/i],
  ["target phrase before ounces", /\b(target|goal|daily minimum)\b[^.\n]{0,20}\b\d{2,3}\s*(oz|ounces)\b/i],
  ["progress-against-target water string", /oz\s*\/\s*\$?\{?\s*\d*\s*\w*\s*\}?\s*oz/i],
  ["body-weight hydration formula", /half your body weight in ounces|body weight in pounds\s*(÷|\/)\s*2|weight\s*[*x×]\s*0?\.5[^\n]{0,40}(oz|ounces)|ounces? per (pound|lb)/i],
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

function scan(text: string): string[] {
  const hits: string[] = [];
  text.split("\n").forEach((line, i) => {
    for (const [label, re] of HYDRATION_TARGET_PATTERNS) {
      if (re.test(line)) hits.push(`${i + 1} [${label}] ${line.trim().slice(0, 120)}`);
    }
  });
  return hits;
}

describe("hydration target regression scan", () => {
  it("finds no hydration target semantics in active source", () => {
    const files = ROOTS.flatMap((r) => walk(r)).filter(
      (f) => !SCAN_EXCLUDE.some((x) => f.startsWith(x)) && !/\.test\.tsx?$/.test(f),
    );
    const hits: string[] = [];
    for (const file of files) {
      scan(readFileSync(file, "utf8")).forEach((h) => hits.push(`${file}:${h}`));
    }
    expect(hits).toEqual([]);
  });

  it("rejects target phrasing", () => {
    expect(scan("const DEFAULT_WATER_TARGET_OZ = 64;")).not.toEqual([]);
    expect(scan("const waterTarget = 64;")).not.toEqual([]);
    expect(scan("Aim for a 64 oz daily target")).not.toEqual([]);
    expect(scan("status={`${oz}oz / 64oz`}")).not.toEqual([]);
    expect(scan("Drink half your body weight in ounces")).not.toEqual([]);
    expect(scan("const oz = weight * 0.5; // ounces")).not.toEqual([]);
  });

  it("allows logged amounts and unrelated uses of 64", () => {
    expect(scan("return `${oz} oz logged today`;")).toEqual([]);
    expect(scan("{[8, 12, 16].map((oz) => ...)} // +8oz quick add")).toEqual([]);
    expect(scan("const BATCH_SIZE = 64;")).toEqual([]);
    expect(scan("recipe: '64 oz of stock, simmered'")).toEqual([]);
    expect(scan("// see HabitLogging.tsx:64")).toEqual([]);
    expect(scan("const hash = base64Encode(buf);")).toEqual([]);
  });
});

// --------------------------------------------------- award idempotency -----

/** Faithful stand-in for points_ledger's UNIQUE (user_id, idempotency_key). */
class FakeLedger {
  rows: Array<{ user: string; key: string; points: number }> = [];
  /** Mirrors award_points: ON CONFLICT DO NOTHING RETURNING. */
  award(user: string, key: string, points: number): { inserted: boolean; total: number } {
    const exists = this.rows.some((r) => r.user === user && r.key === key);
    if (!exists) this.rows.push({ user, key, points });
    return {
      inserted: !exists,
      total: this.rows.filter((r) => r.user === user).reduce((s, r) => s + r.points, 0),
    };
  }
  countFor(user: string, key: string) {
    return this.rows.filter((r) => r.user === user && r.key === key).length;
  }
}

const MEMBER = "11111111-1111-1111-1111-111111111111";
const TZ = "America/Jamaica";
const KEY = (at: Date) => waterAwardIdempotencyKey(calendarDayKey(at, TZ));

describe("once-daily logged-water award", () => {
  it("awards on the first water entry of the day", () => {
    const ledger = new FakeLedger();
    const key = KEY(new Date("2026-08-22T14:00:00Z"));
    expect(ledger.award(MEMBER, key, 5).inserted).toBe(true);
    expect(ledger.countFor(MEMBER, key)).toBe(1);
  });

  it("awards once across a refresh/reload replay", () => {
    const ledger = new FakeLedger();
    const at = new Date("2026-08-22T14:00:00Z");
    ledger.award(MEMBER, KEY(at), 5); // session 1
    const replay = ledger.award(MEMBER, KEY(at), 5); // fresh page load, ref reset
    expect(replay.inserted).toBe(false);
    expect(ledger.countFor(MEMBER, KEY(at))).toBe(1);
  });

  it("awards once for two rapid concurrent entries", () => {
    const ledger = new FakeLedger();
    const key = KEY(new Date("2026-08-22T14:00:00Z"));
    const results = [ledger.award(MEMBER, key, 5), ledger.award(MEMBER, key, 5)];
    expect(results.filter((r) => r.inserted)).toHaveLength(1);
    expect(ledger.countFor(MEMBER, key)).toBe(1);
  });

  it("awards nothing extra for a later same-day entry", () => {
    const ledger = new FakeLedger();
    const morning = new Date("2026-08-22T12:00:00Z");
    const evening = new Date("2026-08-22T23:00:00Z"); // still Aug 22 in Jamaica
    ledger.award(MEMBER, KEY(morning), 5);
    expect(ledger.award(MEMBER, KEY(evening), 5).inserted).toBe(false);
    expect(ledger.rows).toHaveLength(1);
  });

  it("starts a new award after the member's local midnight", () => {
    const ledger = new FakeLedger();
    ledger.award(MEMBER, KEY(new Date("2026-08-22T23:00:00Z")), 5);
    const nextDay = ledger.award(MEMBER, KEY(new Date("2026-08-23T14:00:00Z")), 5);
    expect(nextDay.inserted).toBe(true);
    expect(ledger.rows).toHaveLength(2);
  });

  it("keys are member-and-day scoped", () => {
    const at = new Date("2026-08-22T14:00:00Z");
    expect(KEY(at)).toBe("log_water:2026-08-22");
    const ledger = new FakeLedger();
    ledger.award(MEMBER, KEY(at), 5);
    expect(ledger.award("22222222-2222-2222-2222-222222222222", KEY(at), 5).inserted).toBe(true);
  });
});
