import { describe, it, expect } from "vitest";
import { levelFromDay, nextLevel, LEVELS } from "../lib/levels";

describe("Levels Library", () => {
  describe("levelFromDay", () => {
    it("should return level 1 (The Beginner) for day 0 or negative days", () => {
      expect(levelFromDay(0).level).toBe(1);
      expect(levelFromDay(-5).level).toBe(1);
    });

    it("should return level 1 for day 13 (below Level 2 threshold of 14)", () => {
      expect(levelFromDay(13).level).toBe(1);
    });

    it("should return level 2 (The Builder) on exactly day 14", () => {
      const level = levelFromDay(14);
      expect(level.level).toBe(2);
      expect(level.name).toBe("The Builder");
    });

    it("should return level 8 (The Champion) on day 365", () => {
      const level = levelFromDay(365);
      expect(level.level).toBe(8);
      expect(level.name).toBe("The Champion");
    });

    it("should return level 10 (The Transformer) for days beyond the highest threshold", () => {
      const level = levelFromDay(600);
      expect(level.level).toBe(10);
      expect(level.name).toBe("The Transformer");
    });
  });

  describe("nextLevel", () => {
    it("should return level 2 for level 1", () => {
      const next = nextLevel(1);
      expect(next).not.toBeNull();
      expect(next?.level).toBe(2);
    });

    it("should return level 10 for level 9", () => {
      const next = nextLevel(9);
      expect(next).not.toBeNull();
      expect(next?.level).toBe(10);
    });

    it("should return null for the maximum level (10)", () => {
      const next = nextLevel(10);
      expect(next).toBeNull();
    });

    it("should return null for non-existent levels", () => {
      const next = nextLevel(100);
      expect(next).toBeNull();
    });
  });
});
