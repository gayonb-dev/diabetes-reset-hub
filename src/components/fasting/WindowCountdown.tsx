import { useEffect, useState } from "react";
import { formatHour, type FastingWindow } from "@/lib/mealTiming";

function fmt(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * Counts down to the next window open or close, derived entirely from the
 * member's computed window. Renders nothing when the member isn't fasting.
 */
export default function WindowCountdown({ window: win }: { window: FastingWindow | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!win) return null;

  const d = new Date(now);
  const hourNow = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  const open = hourNow >= win.startHour && hourNow < win.endHour;

  const targetHour = open ? win.endHour : hourNow < win.startHour ? win.startHour : win.startHour + 24;
  const secondsLeft = (targetHour - hourNow) * 3600;

  return (
    <div>
      <p className={`label-caps mb-1 ${open ? "text-status-normal" : "text-accent"}`}>
        {open ? "Fasting begins in" : "Eating window opens in"}
      </p>
      <p className={`countdown-hero tabular-nums ${open ? "text-status-normal" : "text-foreground"}`}>
        {fmt(secondsLeft)}
      </p>
      <p className="text-xs text-secondary-fg mt-2">
        {open
          ? `Your window closes at ${formatHour(win.endHour % 24)}.`
          : `Your window opens at ${formatHour(win.startHour)} and closes at ${formatHour(win.endHour % 24)}.`}
      </p>
    </div>
  );
}
