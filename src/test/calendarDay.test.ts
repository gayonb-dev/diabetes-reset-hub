import { describe, expect, it } from "vitest";
import {
  FALLBACK_TIMEZONE,
  addCalendarDays,
  calendarDayKey,
  calendarDaysBetween,
  calendarHour,
  isValidTimeZone,
  programDayFor,
  resolveTimeZone,
  toDayKey,
} from "@/lib/calendarDay";

describe("timezone resolution", () => {
  it("accepts valid IANA zones", () => {
    expect(isValidTimeZone("America/Jamaica")).toBe(true);
    expect(isValidTimeZone("Europe/London")).toBe(true);
  });

  it("falls back for invalid, empty and missing zones", () => {
    for (const bad of ["", "  ", "Not/AZone", null, undefined]) {
      expect(resolveTimeZone(bad as string | null)).toBe(FALLBACK_TIMEZONE);
    }
    expect(resolveTimeZone("America/Jamaica")).toBe("America/Jamaica");
  });
});

describe("calendar day boundaries", () => {
  // 2026-08-16T03:30:00Z
  const instant = new Date("2026-08-16T03:30:00.000Z");

  it("is already the next day in UTC-facing zones ahead of local midnight", () => {
    expect(calendarDayKey(instant, "Europe/London")).toBe("2026-08-16");
  });

  it("is still the previous day west of UTC", () => {
    expect(calendarDayKey(instant, "America/Jamaica")).toBe("2026-08-15");
    expect(calendarDayKey(instant, "America/New_York")).toBe("2026-08-15");
  });

  it("reports local hour, not UTC hour", () => {
    expect(calendarHour(instant, "America/Jamaica")).toBe(22);
    expect(calendarHour(instant, "Europe/London")).toBe(4);
  });

  it("treats local midnight as hour 0", () => {
    // 05:00Z = 00:00 in Jamaica (UTC-5, no DST)
    expect(calendarHour(new Date("2026-08-16T05:00:00.000Z"), "America/Jamaica")).toBe(0);
    expect(calendarDayKey(new Date("2026-08-16T05:00:00.000Z"), "America/Jamaica")).toBe("2026-08-16");
  });

  it("handles a DST spring-forward day in New York", () => {
    // 2026-03-08 is the US spring-forward date.
    expect(calendarDayKey(new Date("2026-03-08T06:30:00.000Z"), "America/New_York")).toBe("2026-03-08");
    expect(calendarHour(new Date("2026-03-08T06:30:00.000Z"), "America/New_York")).toBe(1);
    expect(calendarHour(new Date("2026-03-08T07:30:00.000Z"), "America/New_York")).toBe(3);
  });

  it("handles a DST fall-back day in New York", () => {
    expect(calendarDayKey(new Date("2026-11-01T05:30:00.000Z"), "America/New_York")).toBe("2026-11-01");
  });

  it("handles zones ahead of UTC across the date line", () => {
    expect(calendarDayKey(new Date("2026-08-15T20:00:00.000Z"), "Pacific/Auckland")).toBe("2026-08-16");
  });
});

describe("day arithmetic", () => {
  it("counts whole days across a month and a DST change", () => {
    expect(calendarDaysBetween("2026-08-15", "2026-08-16")).toBe(1);
    expect(calendarDaysBetween("2026-02-28", "2026-03-01")).toBe(1);
    expect(calendarDaysBetween("2026-03-07", "2026-03-09")).toBe(2);
    expect(calendarDaysBetween("2026-08-16", "2026-08-15")).toBe(-1);
  });

  it("adds and subtracts days", () => {
    expect(addCalendarDays("2026-08-16", -1)).toBe("2026-08-15");
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("normalises timestamps to day keys", () => {
    expect(toDayKey("2026-08-16T11:00:00.000Z")).toBe("2026-08-16");
    expect(toDayKey("2026-08-16")).toBe("2026-08-16");
    expect(toDayKey(null)).toBeNull();
    expect(toDayKey("nonsense")).toBeNull();
  });
});

describe("program day", () => {
  const instant = new Date("2026-08-16T03:30:00.000Z");

  it("differs between Jamaica and London at the same instant", () => {
    expect(programDayFor("2026-08-01", instant, "America/Jamaica")).toBe(15);
    expect(programDayFor("2026-08-01", instant, "Europe/London")).toBe(16);
  });

  it("is day 1 on the local start date", () => {
    expect(programDayFor("2026-08-15", instant, "America/Jamaica")).toBe(1);
  });

  it("never returns less than 1 for future or missing start dates", () => {
    expect(programDayFor("2026-09-01", instant, "America/Jamaica")).toBe(1);
    expect(programDayFor(null, instant, "America/Jamaica")).toBe(1);
  });

  it("uses the fallback zone when the stored zone is invalid", () => {
    expect(programDayFor("2026-08-01", instant, "Bad/Zone")).toBe(
      programDayFor("2026-08-01", instant, FALLBACK_TIMEZONE),
    );
  });

  it("reaches day 180 and beyond without clamping", () => {
    expect(programDayFor("2026-01-01", new Date("2026-06-29T17:00:00.000Z"), "America/Jamaica")).toBe(180);
    expect(programDayFor("2026-01-01", new Date("2026-06-30T17:00:00.000Z"), "America/Jamaica")).toBe(181);
  });
});
