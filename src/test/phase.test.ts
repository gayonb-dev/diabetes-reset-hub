import { describe, it, expect } from "vitest";
import { phaseFor, dayInPhase, PHASES, PROGRAM_TOTAL_DAYS } from "../lib/phase";

describe("Phase Library", () => {
  describe("phaseFor", () => {
    it("should return Phase 1 for day 1, day 7, day 14", () => {
      expect(phaseFor(1).index).toBe(1);
      expect(phaseFor(7).index).toBe(1);
      expect(phaseFor(14).index).toBe(1);
    });

    it("should return Phase 2 for day 15, day 20, day 28", () => {
      expect(phaseFor(15).index).toBe(2);
      expect(phaseFor(20).index).toBe(2);
      expect(phaseFor(28).index).toBe(2);
    });

    it("should return Phase 3 for day 29, day 45, day 60", () => {
      expect(phaseFor(29).index).toBe(3);
      expect(phaseFor(45).index).toBe(3);
      expect(phaseFor(60).index).toBe(3);
    });

    it("should return Phase 4 for day 61, day 90, day 120", () => {
      expect(phaseFor(61).index).toBe(4);
      expect(phaseFor(90).index).toBe(4);
      expect(phaseFor(120).index).toBe(4);
    });

    it("should return Phase 5 for day 121, day 150, day 180", () => {
      expect(phaseFor(121).index).toBe(5);
      expect(phaseFor(150).index).toBe(5);
      expect(phaseFor(180).index).toBe(5);
    });

    it("should fall back gracefully to the first phase for day 0 or negative days", () => {
      expect(phaseFor(0).index).toBe(1);
      expect(phaseFor(-10).index).toBe(1);
    });

    it("should fall back gracefully to the last phase for days exceeding PROGRAM_TOTAL_DAYS", () => {
      expect(phaseFor(PROGRAM_TOTAL_DAYS + 1).index).toBe(5);
      expect(phaseFor(1000).index).toBe(5);
    });
  });

  describe("dayInPhase", () => {
    it("should return the correct index for Phase 1", () => {
      expect(dayInPhase(1)).toBe(1);
      expect(dayInPhase(7)).toBe(7);
      expect(dayInPhase(14)).toBe(14);
    });

    it("should return the correct index relative to Phase 2 start (day 15)", () => {
      expect(dayInPhase(15)).toBe(1);
      expect(dayInPhase(20)).toBe(6);
      expect(dayInPhase(28)).toBe(14);
    });

    it("should return the correct index relative to Phase 3 start (day 29)", () => {
      expect(dayInPhase(29)).toBe(1);
      expect(dayInPhase(45)).toBe(17);
      expect(dayInPhase(60)).toBe(32);
    });

    it("should return the correct index relative to Phase 4 start (day 61)", () => {
      expect(dayInPhase(61)).toBe(1);
      expect(dayInPhase(120)).toBe(60);
    });

    it("should return the correct index relative to Phase 5 start (day 121)", () => {
      expect(dayInPhase(121)).toBe(1);
      expect(dayInPhase(180)).toBe(60);
    });
  });
});
