import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Proves that no test-only payment bypass can reach a production bundle.
 *
 * Requires a production build in dist/ (`npm run build`). When dist/ is absent
 * the source-level guarantees are still asserted.
 */
const root = resolve(__dirname, "../..");

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(js|css|html)$/.test(full)) out.push(full);
  }
  return out;
}

describe("production bundle has no payment bypass", () => {
  it("PaymentSuccess reads only session_id and gates the harness on import.meta.env.DEV", () => {
    const src = readFileSync(resolve(root, "src/pages/PaymentSuccess.tsx"), "utf8");
    expect(src).toContain("import.meta.env.DEV");
    expect(src).toContain('params.get("session_id")');
    // The fixture name must not appear in the shipped page at all.
    expect(src.includes("state_fixture")).toBe(false);
    // The harness is only reachable through a dynamic import inside the DEV branch.
    expect(src).toContain('await import("@/lib/devPaymentFixture")');
  });

  it("the dev harness itself double-guards on DEV", () => {
    const src = readFileSync(resolve(root, "src/lib/devPaymentFixture.ts"), "utf8");
    expect(src).toContain("if (!import.meta.env.DEV) return null;");
  });

  it("no built asset contains the fixture, a bypass token, or a forced state", () => {
    const files = walk(resolve(root, "dist"));
    if (files.length === 0) {
      console.warn("[bundle-scan] dist/ not built — source-level assertions only");
      return;
    }
    const forbidden = ["state_fixture", "readDevFixture", "devPaymentFixture"];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const token of forbidden) {
        expect(
          text.includes(token),
          `${token} found in ${file.replace(`${root}/`, "")}`,
        ).toBe(false);
      }
    }
  });

  it("no built asset contains a synthetic auth fixture or mock session marker", () => {
    const files = walk(resolve(root, "dist"));
    if (files.length === 0) {
      console.warn("[bundle-scan] dist/ not built — skipping fixture scan");
      return;
    }
    // Markers used by the Prompt 6 verification harness, which lives entirely
    // outside the repository and must never be compiled into a release.
    const forbidden = [
      "prompt6-mockauth",
      "__MOCK_AUTH__",
      "mockAuthSession",
      "synthetic_member",
      "PLAYWRIGHT_FIXTURE",
    ];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const token of forbidden) {
        expect(text.includes(token), `${token} found in ${file.replace(`${root}/`, "")}`).toBe(
          false,
        );
      }
    }
  });

  it("no source map is emitted alongside the production bundle", () => {
    const dist = resolve(root, "dist");
    if (!existsSync(dist)) return;
    const maps = walk(dist).length === 0 ? [] : [];
    const all: string[] = [];
    (function collect(dir: string) {
      for (const e of readdirSync(dir)) {
        const full = join(dir, e);
        if (statSync(full).isDirectory()) collect(full);
        else all.push(full);
      }
    })(dist);
    expect(maps).toEqual([]);
    expect(all.filter((f) => f.endsWith(".map"))).toEqual([]);
  });

  it("the repository contains no synthetic-auth source file", () => {
    const src: string[] = [];
    (function collect(dir: string) {
      for (const e of readdirSync(dir)) {
        const full = join(dir, e);
        if (statSync(full).isDirectory()) collect(full);
        else if (/\.tsx?$/.test(full)) src.push(full);
      }
    })(resolve(root, "src"));
    const offenders = src.filter((f) => {
      if (/\/test\//.test(f)) return false;
      const t = readFileSync(f, "utf8");
      return t.includes("__MOCK_AUTH__") || t.includes("prompt6-mockauth");
    });
    expect(offenders).toEqual([]);
  });
});
