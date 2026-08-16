// Server-side proof that the mirrored calendar-day service produces the same
// member calendar day as the client module.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  addCalendarDays,
  calendarDayKey,
  calendarHour,
  FALLBACK_TIMEZONE,
  programDayFor,
  resolveTimeZone,
} from "./calendarDay.ts";

const instant = new Date("2026-08-16T03:30:00.000Z");

Deno.test("member local day differs by zone at one instant", () => {
  assertEquals(calendarDayKey(instant, "America/Jamaica"), "2026-08-15");
  assertEquals(calendarDayKey(instant, "Europe/London"), "2026-08-16");
});

Deno.test("local hour drives notification windows", () => {
  assertEquals(calendarHour(instant, "America/Jamaica"), 22);
  assertEquals(calendarHour(new Date("2026-08-16T05:00:00.000Z"), "America/Jamaica"), 0);
});

Deno.test("invalid zones fall back", () => {
  assertEquals(resolveTimeZone("Bad/Zone"), FALLBACK_TIMEZONE);
  assertEquals(resolveTimeZone(null), FALLBACK_TIMEZONE);
});

Deno.test("program day and yesterday key", () => {
  assertEquals(programDayFor("2026-08-01", instant, "America/Jamaica"), 15);
  assertEquals(programDayFor("2026-08-01", instant, "Europe/London"), 16);
  assertEquals(addCalendarDays(calendarDayKey(instant, "America/Jamaica"), -1), "2026-08-14");
});
