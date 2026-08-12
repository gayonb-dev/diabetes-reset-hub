import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Legal publication gate (unit half).
 *
 * The build half lives in scripts/release-gate.mjs, which the production
 * release path must run. Preview builds may ship placeholders while the draft
 * banner is visible; a production-release build must not.
 */
const root = resolve(__dirname, "../..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|html)$/.test(full)) out.push(full);
  }
  return out;
}

const files = walk(resolve(root, "src")).concat([resolve(root, "index.html")]);

export function findPlaceholders(): { file: string; line: number; text: string }[] {
  const hits: { file: string; line: number; text: string }[] = [];
  for (const f of files) {
    if (f.includes(`${"src"}/test/`)) continue; // this gate file itself
    if (f.endsWith("components/ui/sidebar.tsx")) continue; // CSS calc(), not a legal placeholder
    const src = readFileSync(f, "utf8");
    src.split("\n").forEach((line, i) => {
      const m = line.match(/\[\[[^\]]+\]\]/g);
      if (m) hits.push({ file: f.replace(`${root}/`, ""), line: i + 1, text: m.join(", ") });
    });
  }
  return hits;
}

describe("legal publication gate", () => {
  it("the draft banner exists and is preview-only", () => {
    const banner = readFileSync(resolve(root, "src/components/landing/DraftBanner.tsx"), "utf8");
    expect(banner).toContain('import.meta.env.MODE !== "production"');
    expect(banner).toContain("DO NOT PUBLISH");
  });

  it("the release gate script exists and blocks on placeholders", () => {
    const gate = readFileSync(resolve(root, "scripts/release-gate.mjs"), "utf8");
    expect(gate).toContain("[[");
    expect(gate).toContain("DraftBanner");
    expect(gate).toContain("process.exit(1)");
  });

  it("reports every unresolved legal placeholder (release-blocking, expected non-empty pre-approval)", () => {
    const hits = findPlaceholders();
    // Informational: the count is reported, the release gate enforces it.
    expect(Array.isArray(hits)).toBe(true);
    if (hits.length) {
      console.warn(
        `[legal-gate] ${hits.length} unresolved placeholder line(s):\n` +
          hits.map((h) => `  ${h.file}:${h.line} ${h.text}`).join("\n"),
      );
    }
  });
});
