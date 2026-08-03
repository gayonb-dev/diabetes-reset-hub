import { useMemo } from "react";
import { formatHour, scheduleForProfile, type FastingProfileLike, type FastingWindow } from "@/lib/mealTiming";

/**
 * Horizontal timeline of today's eating window with meal and snack markers,
 * all positioned from the meal-timing engine. No hardcoded times.
 */
export default function FastingTimeline({
  profile,
  window: win,
  now = new Date(),
}: {
  profile: FastingProfileLike | null | undefined;
  window: FastingWindow | null;
  now?: Date;
}) {
  const items = useMemo(() => scheduleForProfile(profile), [profile]);

  // The bar spans the member's day: from an hour before the first item to an
  // hour after the window closes (or after the last item when not fasting).
  const first = items.length ? items[0].hour : 8;
  const last = items.length ? items[items.length - 1].hour : 20;
  const barStart = Math.max(0, Math.min(first, win?.startHour ?? first) - 1);
  const barEnd = Math.min(24, Math.max(last, win?.endHour ?? last) + 1);
  const span = Math.max(1, barEnd - barStart);
  const pct = (h: number) => ((h - barStart) / span) * 100;

  const nowHour = now.getHours() + now.getMinutes() / 60;
  const nowVisible = nowHour >= barStart && nowHour <= barEnd;

  const eatStart = win ? win.startHour : first;
  const eatEnd = win ? win.endHour : last;

  return (
    <div className="pt-2 pb-1">
      <div className="relative h-3 rounded-full bg-muted">
        {/* Eating window fill */}
        <div
          className="absolute inset-y-0 rounded-full bg-primary/25"
          style={{ left: `${pct(eatStart)}%`, width: `${pct(eatEnd) - pct(eatStart)}%` }}
        />
        {/* Markers */}
        {items.map((i) => (
          <div
            key={`${i.kind}-${i.label}`}
            className="absolute -top-1"
            style={{ left: `${pct(i.hour)}%`, transform: "translateX(-50%)" }}
          >
            <div
              className={
                i.kind === "meal"
                  ? "h-5 w-5 rounded-full border-2 border-background bg-primary"
                  : "h-3.5 w-3.5 mt-[3px] rounded-full border-2 border-background bg-accent"
              }
            />
          </div>
        ))}
        {/* Now indicator */}
        {nowVisible && (
          <div
            className="absolute -top-2 h-7 w-[2px] bg-foreground/70"
            style={{ left: `${pct(nowHour)}%` }}
            aria-label="Now"
          />
        )}
      </div>

      {/* Labels below the bar */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {items.map((i) => (
          <div key={`lbl-${i.kind}-${i.label}`} className="flex items-center gap-1.5">
            <span
              className={
                i.kind === "meal"
                  ? "h-2.5 w-2.5 rounded-full bg-primary shrink-0"
                  : "h-2.5 w-2.5 rounded-full bg-accent shrink-0"
              }
            />
            <span className="text-[11px] text-muted-foreground">{i.label}</span>
            <span className="text-[11px] font-medium tabular-nums">{formatHour(i.hour)}</span>
          </div>
        ))}
        {win && (
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40 shrink-0" />
            <span className="text-[11px] text-muted-foreground">Fast begins</span>
            <span className="text-[11px] font-medium tabular-nums">{formatHour(win.endHour % 24)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
