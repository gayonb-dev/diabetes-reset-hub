// Prompt 6 closeout — safe-claims scan over active member and public copy.
//
// Scans real shipped sources (not a copy of them) for outcome, cure and
// clinical-approval language that the approved copy authority forbids.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

const root = resolve(__dirname, "../..");

const SCAN_ROOTS = ["src/pages", "src/components", "src/lib", "supabase/functions/_shared"];
const EXTRA_FILES = ["public/llms.txt", "index.html"];
const SKIP = /(\.test\.tsx?$|\/test\/|node_modules|src\/components\/ui\/)/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP.test(p)) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|txt|html)$/.test(p)) out.push(p);
  }
  return out;
}

const files = [
  ...SCAN_ROOTS.flatMap((d) => walk(resolve(root, d))),
  ...EXTRA_FILES.map((f) => resolve(root, f)),
];

/** Claims that must never appear in shipped copy. */
const BANNED: { label: string; re: RegExp }[] = [
  { label: "reverse/reversal of diabetes", re: /revers(e|al|ing)\s+(your\s+)?(type\s*2\s*)?diabetes/i },
  { label: "cure", re: /\bcures?\s+(your\s+)?(type\s*2\s*)?diabetes\b/i },
  { label: "guaranteed results", re: /guarantee(d|s)?\s+(results|weight\s+loss|a1c|lower)/i },
  { label: "medication reduction promise", re: /(get|come)\s+off\s+(your\s+)?(medication|insulin)/i },
  { label: "clinically proven", re: /clinically\s+(proven|validated|approved)/i },
  { label: "doctor approved", re: /(doctor|physician|clinician)[- ]approved\s+(programme|program|plan|membership|method|content|meal|advice)/i },
  { label: "FDA approved", re: /fda[- ]approved/i },
  { label: "retired 7-Day Reset offer", re: /7[- ]day\s+reset/i },
  { label: "treats or diagnoses", re: /\b(treats?|diagnoses?)\s+(your\s+)?(type\s*2\s*)?diabetes\b/i },
];

describe("safe-claims scan of active sources", () => {
  it("scans a non-trivial number of files", () => {
    expect(files.length).toBeGreaterThan(50);
  });

/** A comment line, or an explicit disclaimer, is not a claim. */
function isNotAClaim(line: string): boolean {
  const t = line.trim();
  if (/^(\/\/|\*|\/\*|--|#)/.test(t)) return true; // source comment
  if (/eslint|safe-claims-allow/.test(t)) return true;
  // negated / forbidding wording: "does not ... reverse", "no reversal claim"
  return /\b(does not|do not|doesn't|don't|never|no|not|cannot|can't|without|forbid|prohibit|must not|may)\b[^.]{0,90}$/i.test(
    t.slice(0, t.search(/revers|cure|guarantee|clinic|doctor|physician|fda|7[- ]day/i) + 1),
  );
}

  for (const { label, re } of BANNED) {
    it(`no shipped source claims: ${label}`, () => {
      const hits: string[] = [];
      for (const f of files) {
        const text = readFileSync(f, "utf8");
        text.split("\n").forEach((line, i) => {
          if (re.test(line) && !isNotAClaim(line)) {
            hits.push(`${relative(root, f)}:${i + 1}: ${line.trim().slice(0, 140)}`);
          }
        });
      }
      expect(hits, hits.join("\n")).toEqual([]);
    });
  }
});

describe("approved pricing truth appears wherever price is stated", () => {
  it("llms.txt states $27 for 14 days then $67/month", () => {
    const t = readFileSync(resolve(root, "public/llms.txt"), "utf8");
    expect(/\$?US?\$?27/.test(t)).toBe(true);
    expect(/\$?US?\$?67/.test(t)).toBe(true);
    expect(/14\s*days/i.test(t)).toBe(true);
  });

  it("no source advertises a price other than 27 or 67 for the membership", () => {
    const bad: string[] = [];
    for (const f of files) {
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (!/membership/i.test(line)) return;
          const m = line.match(/\$\s?(\d{2,4})/g);
          if (!m) return;
          for (const price of m) {
            const n = Number(price.replace(/[^\d]/g, ""));
            if (n !== 27 && n !== 67) bad.push(`${relative(root, f)}:${i + 1}: ${price}`);
          }
        });
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });
});
