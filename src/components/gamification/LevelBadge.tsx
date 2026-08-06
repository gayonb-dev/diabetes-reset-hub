import { LEVELS, levelFromDay } from "@/lib/levels";

interface LevelBadgeProps {
  level: number;
}

export default function LevelBadge({ level }: LevelBadgeProps) {
  const info = levelFromDay(0).level === level ? levelFromDay(0) : null;
  // Map any stored level to its name
  const name = LEVELS.find((x) => x.level === level)?.name ?? "Lifetime Member";

  void info;
  return (
    <span className="bg-primary text-primary-foreground text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full">
      Lv {level}: {name}
    </span>
  );
}
