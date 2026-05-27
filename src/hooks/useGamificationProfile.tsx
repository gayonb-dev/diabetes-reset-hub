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
    if (!data) {
      setProfile({ ...empty, loading: false });
      return;
    }
    setProfile({
      loading: false,
      streak_count: data.streak_count ?? 0,
      streak_freeze_available: data.streak_freeze_available ?? false,
      level: data.level ?? 1,
      level_earned_at: data.level_earned_at ?? null,
      reset_points: data.reset_points ?? 0,
      helpful_points: data.helpful_points ?? 0,
      badges_earned: (data.badges_earned as unknown as string[]) ?? [],
      community_badges_earned: (data.community_badges_earned as unknown as string[]) ?? [],
      last_ring_close_at: data.last_ring_close_at ?? null,
      streak_history: (data.streak_history as StreakHistoryEntry[]) ?? [],
      phase_1_extension_active: data.phase_1_extension_active ?? false,
      current_program_phase: data.current_program_phase ?? 1,
    });
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Level-up sync: when program day crosses a threshold, persist the new level
  // and trigger the celebratory overlay (once per session via sessionStorage).
  useEffect(() => {
    if (!user || profile.loading) return;
    const target = levelFromDay(currentProgramDay);
    if (target.level <= profile.level) return;

    (async () => {
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
