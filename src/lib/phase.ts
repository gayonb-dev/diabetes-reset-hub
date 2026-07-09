// Program phase map — DRM 180-day, 5-phase spec (Section 7).
// Single source of truth for Dashboard, JourneyTrack, HabitLogging.

export interface PhaseInfo {
  index: number;   // 1..5
  name: string;    // "Phase 1 — Reset"
  start: number;   // first day of phase (inclusive)
  end: number;     // last day of phase (inclusive)
  total: number;   // days in phase
}

export const PHASES: PhaseInfo[] = [
  { index: 1, name: "Phase 1 — Reset",         start: 1,   end: 14,  total: 14 },
  { index: 2, name: "Phase 2 — Momentum",      start: 15,  end: 28,  total: 14 },
  { index: 3, name: "Phase 3 — Reversal",      start: 29,  end: 60,  total: 32 },
  { index: 4, name: "Phase 4 — Recalibration", start: 61,  end: 120, total: 60 },
  { index: 5, name: "Phase 5 — Freedom",       start: 121, end: 180, total: 60 },
];

export const PHASE_TOTAL = PHASES.length;
export const PROGRAM_TOTAL_DAYS = 180;

export function phaseFor(day: number): PhaseInfo {
  const clamped = Math.max(1, day);
  for (const p of PHASES) {
    if (clamped >= p.start && clamped <= p.end) return p;
  }
  return PHASES[PHASES.length - 1];
}

export function dayInPhase(day: number): number {
  const p = phaseFor(day);
  return Math.min(Math.max(day - p.start + 1, 1), p.total);
}
