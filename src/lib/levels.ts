// Level system per Section 11 — levels unlock by program day, not points.

export interface LevelInfo {
  level: number;
  name: string;
  dayThreshold: number;
  message: string;
}

export const LEVELS: LevelInfo[] = [
  { level: 1, name: "The Beginner", dayThreshold: 0, message: "You started. Most people don't." },
  { level: 2, name: "The Builder", dayThreshold: 14, message: "Foundation set." },
  { level: 3, name: "The Momentum Maker", dayThreshold: 45, message: "Your body is responding." },
  { level: 4, name: "The Shifter", dayThreshold: 90, message: "Numbers are changing." },
  { level: 5, name: "The Reverser", dayThreshold: 135, message: "You are in it now." },
  { level: 6, name: "The Reclaimer", dayThreshold: 180, message: "You did this." },
  { level: 7, name: "The Sustainer", dayThreshold: 270, message: "Maintaining what you built." },
  { level: 8, name: "The Champion", dayThreshold: 365, message: "One full year." },
  { level: 9, name: "The Guide", dayThreshold: 450, message: "Others follow your path." },
  { level: 10, name: "The Transformer", dayThreshold: 540, message: "This is who you are now." },
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
