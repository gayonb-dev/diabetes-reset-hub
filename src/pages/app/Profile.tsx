import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGamificationProfile } from "@/hooks/useGamificationProfile";
import BadgeGallery from "@/components/gamification/BadgeGallery";
import StreakBadge from "@/components/gamification/StreakBadge";
import LevelBadge from "@/components/gamification/LevelBadge";
import StreakHistoryModal from "@/components/gamification/StreakHistoryModal";
import { Sparkles, Heart } from "lucide-react";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function Profile() {
  const { subscription } = useAuth();
  const currentProgramDay = useMemo(() => {
    const start = subscription?.created_at ? new Date(subscription.created_at) : new Date();
    const diff = Math.floor(
      (startOfDay(new Date()).getTime() - startOfDay(start).getTime()) / 86400000,
    );
    return Math.max(diff + 1, 1);
  }, [subscription]);

  const g = useGamificationProfile(currentProgramDay);
  const [showStreak, setShowStreak] = useState(false);

  return (
    <div className="max-w-[880px] mx-auto space-y-6 animate-fade-in">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="label-caps text-tertiary-fg">Member profile</p>
          <h1 className="font-heading text-3xl font-bold text-foreground">Your reset, in badges.</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StreakBadge
            streak={g.streak_count}
            freezeAvailable={g.streak_freeze_available}
            onClick={() => setShowStreak(true)}
          />
          <LevelBadge level={g.level} />
        </div>
      </header>

      {/* Points row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-accent-muted flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-tertiary-fg">Reset Points</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{g.reset_points}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary-muted flex items-center justify-center">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-tertiary-fg">Helpful Points</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{g.helpful_points}</p>
          </div>
        </div>
      </div>

      <BadgeGallery
        category="program"
        title="Program badges"
        earnedSlugs={g.badges_earned}
      />
      <BadgeGallery
        category="community"
        title="Community badges"
        earnedSlugs={g.community_badges_earned}
      />

      <StreakHistoryModal
        open={showStreak}
        onClose={() => setShowStreak(false)}
        currentStreak={g.streak_count}
        freezeAvailable={g.streak_freeze_available}
        startDate={g.last_ring_close_at}
        history={g.streak_history}
      />
    </div>
  );
}
