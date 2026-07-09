import { Flame, Shield } from "lucide-react";

interface StreakBadgeProps {
  streak: number;
  freezeAvailable: boolean;
  onClick?: () => void;
}

/**
 * Section 11 streak counter — flame gradient + count, all tokenized.
 * Day 7 thickens the font, Day 30 glows, Day 90 shimmers.
 */
export default function StreakBadge({ streak, freezeAvailable, onClick }: StreakBadgeProps) {
  const weightClass = streak >= 7 ? "font-extrabold" : "font-semibold";
  const glow =
    streak >= 90
      ? "drop-shadow(0 0 10px hsl(var(--streak-fire-end) / 0.7))"
      : streak >= 30
      ? "drop-shadow(0 0 8px hsl(var(--streak-fire-end) / 0.6))"
      : "drop-shadow(0 0 4px hsl(var(--streak-fire-end) / 0.35))";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open streak history. ${streak} day streak${freezeAvailable ? ", 1 streak freeze available" : ""}.`}
      className="flex items-center gap-1.5 group focus:outline-none focus:ring-2 focus:ring-accent rounded-md px-1"
    >
      <span className="relative inline-flex items-center" style={{ filter: glow }}>
        <Flame
          className="h-5 w-5 text-streak-fire-start"
          strokeWidth={2.4}
          fill="url(#flameGradient)"
        />
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="flameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--streak-fire-start))" />
              <stop offset="100%" stopColor="hsl(var(--streak-fire-end))" />
            </linearGradient>
          </defs>
        </svg>
      </span>
      <span className={`text-lg ${weightClass} text-accent leading-none tabular-nums`}>
        {streak}
      </span>
      {freezeAvailable && (
        <Shield
          className="h-4 w-4 text-status-normal ml-0.5"
          aria-hidden
          fill="hsl(var(--primary-muted))"
          strokeWidth={2.2}
        />
      )}
    </button>
  );
}
