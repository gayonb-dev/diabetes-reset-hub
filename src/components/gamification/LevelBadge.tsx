import { levelFromDay } from "@/lib/levels";

interface LevelBadgeProps {
  level: number;
}

export default function LevelBadge({ level }: LevelBadgeProps) {
  const info = levelFromDay(0).level === level ? levelFromDay(0) : null;
  // Map any stored level to its name
  const name = ((): string => {
    const map: Record<number, string> = {
      1: "The Beginner",
      2: "The Builder",
      3: "The Momentum Maker",
      4: "The Shifter",
      5: "The Reverser",
      6: "The Reclaimer",
      7: "The Sustainer",
      8: "The Champion",
      9: "The Guide",
      10: "The Transformer",
    };
    return map[level] ?? "Lifetime Member";
  })();

  void info;
  return (
    <span className="bg-primary text-primary-foreground text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full">
      Lv {level}: {name}
    </span>
  );
}
