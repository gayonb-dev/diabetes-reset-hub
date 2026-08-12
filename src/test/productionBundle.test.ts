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
});
