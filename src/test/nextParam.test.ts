import { describe, it, expect } from "vitest";
import { safeNext } from "@/lib/safeNext";

describe("safeNext — allowed same-site destinations", () => {
  it.each([
    ["/app/progress", "/app/progress"],
    ["/app/onboarding", "/app/onboarding"],
    ["/app/progress?tab=weight", "/app/progress?tab=weight"],
    ["/app/day/3#notes", "/app/day/3#notes"],
    ["%2Fapp%2Fprogress", "/app/progress"],
  ])("preserves %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});

describe("safeNext — rejects open-redirect and malformed destinations", () => {
  it.each([
    "https://evil.com",
    "http://evil.com/app",
    "//evil.com",
    "\\\\evil.com",
    "/\\evil.com",
    "%2F%2Fevil.com",
    "javascript:alert(1)",
    "/javascript:alert(1)",
    "data:text/html,<script>",
    "app/progress",
    "",
    "   ",
    "%E0%A4%A",
  ])("rejects %s", (input) => {
    expect(safeNext(input)).toBe("");
  });

  it("returns the caller fallback", () => {
    expect(safeNext("https://evil.com", "/app")).toBe("/app");
    expect(safeNext(null, "/app")).toBe("/app");
    expect(safeNext(undefined, "/app")).toBe("/app");
  });
});
