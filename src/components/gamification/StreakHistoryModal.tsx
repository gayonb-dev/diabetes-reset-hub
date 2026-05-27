import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Flame, Shield, Trophy } from "lucide-react";
import { Vita } from "@/components/vita/Vita";
import { format } from "date-fns";
import type { StreakHistoryEntry } from "@/hooks/useGamificationProfile";

interface StreakHistoryModalProps {
  open: boolean;
  onClose: () => void;
  currentStreak: number;
  freezeAvailable: boolean;
  startDate: string | null;
  history: StreakHistoryEntry[];
}

function fmt(d: string | null) {
  if (!d) return "";
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return d;
  }
}

export default function StreakHistoryModal({
  open,
  onClose,
  currentStreak,
  freezeAvailable,
  startDate,
  history,
}: StreakHistoryModalProps) {
  const longestPast = history.reduce((acc, h) => Math.max(acc, h.length), 0);
  const longest = Math.max(longestPast, currentStreak);
  const personalBest = history
    .slice()
    .sort((a, b) => b.length - a.length)
    .find((h) => h.length >= currentStreak && h.length > 0);

  const totalDays = history.reduce((s, h) => s + h.length, 0) + currentStreak;
  const numStreaks = history.length + (currentStreak > 0 ? 1 : 0);
  const nextFreezeIn = freezeAvailable ? 0 : 14 - (currentStreak % 14 || 14);

  const sorted = [...history].sort(
    (a, b) => new Date(b.end).getTime() - new Date(a.end).getTime(),
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[70vh] overflow-y-auto rounded-t-[20px] p-6">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-bold text-foreground">
            Your streak history
          </DialogTitle>
        </DialogHeader>

        {/* Current streak highlight */}
        <div className="bg-accent-muted border border-accent/40 rounded-2xl p-5 my-3">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-7 w-7 text-accent" fill="#FF8C00" strokeWidth={2.4} />
            <span className="font-heading text-[36px] font-bold text-accent leading-none tabular-nums">
              {currentStreak}
            </span>
          </div>
          <p className="text-[15px] text-secondary-fg">
            {currentStreak === 1 ? "1-day Reversal Streak" : `${currentStreak}-day Reversal Streak`}
          </p>
          {startDate && (
            <p className="text-[13px] text-tertiary-fg">Started {fmt(startDate)}</p>
          )}
          <div className="mt-3 flex items-center gap-2 text-[13px]">
            {freezeAvailable ? (
              <>
                <Shield className="h-4 w-4" style={{ color: "#22C55E" }} fill="#E8F5F1" />
                <span style={{ color: "#22C55E" }} className="font-medium">
                  1 freeze saved
                </span>
              </>
            ) : (
              <span className="text-tertiary-fg">
                No freeze saved — earn one in {nextFreezeIn} day{nextFreezeIn === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        {/* Personal best */}
        {personalBest && personalBest.length > currentStreak && (
          <div className="flex items-center gap-2 py-3 border-t border-border">
            <Trophy className="h-5 w-5 text-accent" />
            <div>
              <p className="text-[18px] font-semibold text-foreground">
                {personalBest.length} days
              </p>
              <p className="text-[12px] text-tertiary-fg">
                Best streak, {fmt(personalBest.start)} – {fmt(personalBest.end)}
              </p>
            </div>
          </div>
        )}

        {/* All-time stats */}
        <div className="grid grid-cols-3 gap-2 py-3 border-t border-border">
          <Stat label="Total days" value={totalDays} />
          <Stat label="Streaks" value={numStreaks} />
          <Stat label="Longest" value={longest} />
        </div>

        {/* History list */}
        <div className="space-y-2 pt-2">
          {sorted.length === 0 ? (
            <div className="flex items-start gap-3 bg-primary-muted rounded-xl p-4">
              <Vita posture="encouraging" size={48} />
              <p className="text-[14px] text-secondary-fg leading-snug">
                <strong className="text-primary">VITA says:</strong> This is your first streak. Keep
                going and this list will fill up.
              </p>
            </div>
          ) : (
            sorted.slice(0, 20).map((h, i) => (
              <div key={i} className="py-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-[15px] font-semibold text-foreground">{h.length} days</p>
                  <p className="text-[13px] text-secondary-fg">
                    {fmt(h.start)} – {fmt(h.end)}
                  </p>
                </div>
                <div className="h-1.5 bg-bg-subtle rounded mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-accent"
                    style={{
                      width: `${longest > 0 ? Math.round((h.length / longest) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-bg-subtle rounded-lg px-3 py-2 text-center">
      <p className="text-[18px] font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-tertiary-fg">{label}</p>
    </div>
  );
}
