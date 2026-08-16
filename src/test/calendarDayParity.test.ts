import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The edge-function mirror must stay generated from the client module, so a
// member's calendar day can never differ between client and server.
const client = readFileSync(resolve(process.cwd(), "src/lib/calendarDay.ts"), "utf8");
const mirror = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/calendarDay.ts"),
  "utf8",
);

const stripHeader = (src: string) => src.split("\n").slice(2).join("\n");

describe("calendar-day client/server parity", () => {
  it("mirrors the canonical module body byte-for-byte", () => {
    expect(stripHeader(mirror)).toBe(stripHeader(client));
  });

  it("marks the mirror as generated", () => {
    expect(mirror.startsWith("// MIRROR of src/lib/calendarDay.ts")).toBe(true);
  });
});
