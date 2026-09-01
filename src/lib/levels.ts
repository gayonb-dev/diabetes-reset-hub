// Level system per Section 11, levels unlock by program day, not points.
// Names and messages are the approved S3 content-appendix table.

export interface LevelInfo {
  level: number;
  name: string;
  dayThreshold: number;
  message: string;
}

export const LEVELS: LevelInfo[] = [
  { level: 1, name: "The Starter", dayThreshold: 0, message: "You began." },
  { level: 2, name: "The Builder", dayThreshold: 14, message: "Your routine is taking shape." },
  { level: 3, name: "The Momentum Maker", dayThreshold: 45, message: "You keep returning." },
  { level: 4, name: "The Pattern Finder", dayThreshold: 90, message: "You are learning from your routine." },
  { level: 5, name: "The Steady Navigator", dayThreshold: 135, message: "You are choosing what helps." },
  { level: 6, name: "The Consistency Keeper", dayThreshold: 180, message: "You built six months of practice." },
  { level: 7, name: "The Sustainer", dayThreshold: 270, message: "You are carrying useful routines forward." },
  { level: 8, name: "The Champion", dayThreshold: 365, message: "One full year of showing up." },
  { level: 9, name: "The Guide", dayThreshold: 450, message: "Your experience can help you ask better questions." },
  { level: 10, name: "The Long-Game Leader", dayThreshold: 540, message: "You have practiced for the long term." },
];

export function levelFromDay(day: number): LevelInfo {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (day >= l.dayThreshold) current = l;
  }
  return current;
}

export function nextLevel(level: number): LevelInfo | null {
  return LEVELS.find((l) => l.level === level + 1) ?? null;
}
