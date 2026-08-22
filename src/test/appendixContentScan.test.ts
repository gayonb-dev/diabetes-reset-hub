import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Batch 1 clinical appendix — section 11 content gate.
 *
 * Scans active member-facing source for retired claim language. Test files,
 * this scanner, and the safety guards that deliberately name banned terms in
 * order to block them are excluded.
 */

const ROOTS = ["src", "supabase/functions"];
const EXCLUDE_FILES = [
  "src/test/",
  "supabase/functions/_shared/copy.ts", // safety classifier: names terms to block them
  "supabase/functions/generate-meal-plan/index.ts", // prompt forbids the terms explicitly
  "supabase/functions/chat-agent/index.ts", // prompt forbids the terms explicitly
  "supabase/functions/ask-vita/index.ts", // prompt forbids the terms explicitly
  "src/pages/LLMInfo.tsx", // disclaimer text ("does not ... cure")
  "src/lib/featureFlags.ts",
];

const BANNED: Array<[string, RegExp]> = [
  ["reversal claim", /\breversal\b|\breverse (your |the )?(diabetes|a1c)\b/i],
  ["cure claim", /\bcures?\b(?!\s*(is|are)\s*not)/i],
  ["compliance labelling", /\bnon-?compliant\b|\bcompliant days\b|plate compliant/i],
  ["cheat-meal framing", /\bcheat meal\b/i],
  ["body-weight water formula", /half your body weight in ounces|body weight in pounds ÷ 2/i],
  ["diagnostic person label", /\byou are (pre-?diabetic|diabetic)\b/i],
  ["guaranteed outcome", /guaranteed results?|typical results/i],
  ["glucose outcome example", /\d{2,3}\s*(→|->)\s*\d{2,3}\s*mg\/dL/i],
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

describe("Batch 1 appendix content scan", () => {
  it("finds no retired claim language in active source", () => {
    const files = ROOTS.flatMap((r) => walk(r)).filter(
      (f) => !EXCLUDE_FILES.some((x) => f.startsWith(x)) && !/\.test\.tsx?$/.test(f),
    );
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      text.split("\n").forEach((line, i) => {
        for (const [label, re] of BANNED) {
          if (re.test(line)) hits.push(`${file}:${i + 1} [${label}] ${line.trim().slice(0, 120)}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });
});
