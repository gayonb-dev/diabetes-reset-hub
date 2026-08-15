import { describe, it, expect } from "vitest";
import { MORE_GROUPS } from "@/lib/appNav";

/**
 * Prompt 6 A1/A2 — the member app keeps one hierarchy. Primary navigation is
 * Today, Meals, Progress and Ask; everything else lives in exactly one grouped
 * "More" entry. These tests fail if a duplicate or retired destination returns.
 */
describe("member navigation structure", () => {
  const items = MORE_GROUPS.flatMap((g) => g.items);

  it("groups More destinations in the approved order", () => {
    expect(MORE_GROUPS.map((g) => g.title)).toEqual([
      "Learn & tools",
      "Community",
      "Account & help",
    ]);
  });

  it("never duplicates a primary destination inside More", () => {
    const primary = ["/app", "/app/meals", "/app/progress"];
    for (const p of primary) {
      expect(items.filter((i) => i.to === p)).toHaveLength(0);
    }
  });

  it("routes Community to the single Ask surface", () => {
    const community = items.filter((i) => i.label === "Community");
    expect(community).toHaveLength(1);
    expect(community[0].to).toBe("/app/ask");
  });

  it("contains no retired coaching or waitlist destinations", () => {
    const text = JSON.stringify(items.map((i) => [i.to, i.label]));
    expect(text).not.toMatch(/coaching|waitlist|whatsapp/i);
  });

  it("keeps every label unique so nothing reads as two features", () => {
    const labels = items.map((i) => i.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
