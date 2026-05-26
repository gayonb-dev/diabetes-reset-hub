import { cn } from "@/lib/utils";

interface JourneyTrackProps {
  currentDay: number;
  totalDays: number;
  phaseName?: string;
  phaseIndex?: number;
  phaseTotal?: number;
  className?: string;
}

export function JourneyTrack({
  currentDay,
  totalDays,
  phaseName = "Phase 1 — Reset",
  phaseIndex = 1,
  phaseTotal = 5,
  className,
}: JourneyTrackProps) {
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  return (
    <div className={cn("bg-card border border-border rounded-xl px-4 py-3 shadow-warm", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="label-caps text-tertiary-fg">{phaseName}</span>
        <span className="text-[11px] font-medium text-primary">
          Day {currentDay} of {totalDays}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {days.map((d) => {
          const done = d < currentDay;
          const current = d === currentDay;
          return (
            <span
              key={d}
              aria-label={`Day ${d}${done ? " complete" : current ? " current" : " upcoming"}`}
              className={cn(
                "rounded-full transition-all",
                current
                  ? "w-3 h-3 bg-accent animate-ring-pulse"
                  : done
                    ? "w-2 h-2 bg-primary"
                    : "w-2 h-2 bg-muted",
              )}
            />
          );
        })}
      </div>
      <p className="text-[10px] text-tertiary-fg mt-2">
        Phase {phaseIndex} of {phaseTotal}
      </p>
    </div>
  );
}

export default JourneyTrack;
