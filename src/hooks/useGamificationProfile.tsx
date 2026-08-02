import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { levelFromDay } from "@/lib/levels";

export interface StreakHistoryEntry {
  start: string; // ISO date
  end: string;
  length: number;
  ended_reason?: "broken" | "active" | "freeze_used";
}

export interface GamificationProfile {
  loading: boolean;
  streak_count: number;
  longest_streak: number;
  streak_freeze_available: boolean;
  level: number;
  level_earned_at: string | null;
  reset_points: number;
  helpful_points: number;
  badges_earned: string[];
  community_badges_earned: string[];
  last_ring_close_at: string | null;
  streak_history: StreakHistoryEntry[];
  phase_1_extension_active: boolean;
  current_program_phase: number;
}

const empty: GamificationProfile = {
  loading: true,
  streak_count: 0,
  longest_streak: 0,
  streak_freeze_available: false,
  level: 1,
  level_earned_at: null,
  reset_points: 0,
  helpful_points: 0,
  badges_earned: [],
  community_badges_earned: [],
  last_ring_close_at: null,
  streak_history: [],
  phase_1_extension_active: false,
  current_program_phase: 1,
};

export function useGamificationProfile(currentProgramDay: number) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<GamificationProfile>(empty);
  const [leveledUpTo, setLeveledUpTo] = useState<number | null>(null);
  const [freezeJustUsed, setFreezeJustUsed] = useState<{ streakLen: number } | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("visitor_profiles")
      .select(
        "streak_count, streak_freeze_available, level, level_earned_at, reset_points, helpful_points, badges_earned, community_badges_earned, last_ring_close_at, streak_history, phase_1_extension_active, current_program_phase",
      )
      .eq("user_id", user.id)
      .maybeSingle();
    const { data: streakRow } = await supabase
      .from("user_streaks")
      .select("longest_streak")
      .eq("user_id", user.id)
      .maybeSingle();
    const storedLongest = streakRow?.longest_streak ?? 0;
    if (!data) {
      setProfile({ ...empty, loading: false, longest_streak: storedLongest });
      return;
    }
    setProfile({
      loading: false,
      streak_count: data.streak_count ?? 0,
      longest_streak: storedLongest,
      streak_freeze_available: data.streak_freeze_available ?? false,
      level: data.level ?? 1,
      level_earned_at: data.level_earned_at ?? null,
      reset_points: data.reset_points ?? 0,
      helpful_points: data.helpful_points ?? 0,
      badges_earned: (data.badges_earned as unknown as string[]) ?? [],
      community_badges_earned: (data.community_badges_earned as unknown as string[]) ?? [],
      last_ring_close_at: data.last_ring_close_at ?? null,
      streak_history: (data.streak_history as unknown as StreakHistoryEntry[]) ?? [],
      phase_1_extension_active: data.phase_1_extension_active ?? false,
      current_program_phase: data.current_program_phase ?? 1,
    });
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Level-up sync: level is EARNED, derived from the number of completed days
  // (distinct dates with a member_daily_progress row at status='completed'),
  // not elapsed calendar days. The stored visitor_profiles.level is the only
  // value ever rendered; the computed level can raise it but never demote it.
  useEffect(() => {
    if (!user || profile.loading) return;

    (async () => {
      const { data: rows } = await supabase
        .from("member_daily_progress")
        .select("day_number, completed_at")
        .eq("member_id", user.id)
        .eq("status", "completed");

      const completedDays = new Set(
        (rows ?? []).map((r) => (r.completed_at ? String(r.completed_at).slice(0, 10) : `day-${r.day_number}`)),
      ).size;

      const target = levelFromDay(completedDays);
      if (target.level <= profile.level) return;

      await supabase
        .from("visitor_profiles")
        .update({ level: target.level, level_earned_at: new Date().toISOString() })
        .eq("user_id", user.id);

      const seenKey = `drm:level-up-seen:${target.level}`;
      if (!sessionStorage.getItem(seenKey)) {
        sessionStorage.setItem(seenKey, "1");
        setLeveledUpTo(target.level);
      }
      refresh();
    })();
  }, [user, profile.loading, profile.level, currentProgramDay, refresh]);


  return {
    ...profile,
    refresh,
    leveledUpTo,
    dismissLevelUp: () => setLeveledUpTo(null),
    freezeJustUsed,
    dismissFreezeUsed: () => setFreezeJustUsed(null),
    _setFreezeJustUsed: setFreezeJustUsed,
  };
}
