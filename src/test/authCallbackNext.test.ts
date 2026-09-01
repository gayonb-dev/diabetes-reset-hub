import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { safeNext } from "@/lib/safeNext";

/**
 * Prompt 6 evidence correction, GHSA-wrjc-x8rr-h8h6.
 * The magic-link callback is the only navigation sink that consumes a
 * user-controlled `next` value. It must use the strict same-site validator,
 * not a local regex (the old `/^\/(?!\/)/` accepted "/\evil.com").
 */
describe("AuthCallback next validation", () => {
  const src = readFileSync("src/pages/AuthCallback.tsx", "utf8");

  it("uses the shared strict validator", () => {
    expect(src).toMatch(/safeNext(?: as safeNextPath)? } from "@\/lib\/safeNext"/);
    expect(src).toMatch(/safeNextPath\(next, "\/app"\)/);
  });

  it("no longer relies on the permissive local regex", () => {
    expect(src).not.toContain("/^\\/(?!\\/)/");
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "https://evil.com",
    "/javascript:alert(1)",
  ])("rejects %s and falls back to /app", (value) => {
    expect(safeNext(value, "/app")).toBe("/app");
  });

  it("preserves legitimate member destinations", () => {
    expect(safeNext("/app/progress?tab=weight", "/app")).toBe("/app/progress?tab=weight");
  });
});
