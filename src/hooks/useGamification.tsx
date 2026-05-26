import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface StreakState {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  total_xp: number;
  level: number;
}

export interface BadgeRow {
  slug: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  earned_at: string | null;
}

const defaultStreak: StreakState = {
  current_streak: 0,
  longest_streak: 0,
  last_active_date: null,
  total_xp: 0,
  level: 1,
};

export function useGamification() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakState>(defaultStreak);
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: s }, { data: all }, { data: mine }] = await Promise.all([
      supabase
        .from("user_streaks")
        .select("current_streak, longest_streak, last_active_date, total_xp, level")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("badges").select("slug, name, description, icon, tier, sort_order").order("sort_order"),
      supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", user.id),
    ]);
    if (s) setStreak({ ...defaultStreak, ...s });
    if (all) {
      const earnedMap = new Map<string, string>();
      // Need badge_id → earned_at mapping; cross-reference via a second fetch by ids
      // Simpler: refetch with join
      const { data: joined } = await supabase
        .from("user_badges")
        .select("earned_at, badges(slug)")
        .eq("user_id", user.id);
      (joined ?? []).forEach((r: { earned_at: string; badges: { slug: string } | null }) => {
        if (r.badges?.slug) earnedMap.set(r.badges.slug, r.earned_at);
      });
      setBadges(
        all.map((b) => ({
          slug: b.slug,
          name: b.name,
          description: b.description,
          icon: b.icon,
          tier: b.tier,
          earned_at: earnedMap.get(b.slug) ?? null,
        })),
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const recordAction = useCallback(
    async (action: string) => {
      if (!user) return null;
      try {
        const { data } = await supabase.functions.invoke("gamify-action", { body: { action } });
        await refresh();
        return data as { streak: StreakState; xp: { total_xp: number; level: number }; newBadge: string | null } | null;
      } catch (e) {
        console.error("recordAction failed", e);
        return null;
      }
    },
    [user, refresh],
  );

  return { streak, badges, loading, refresh, recordAction };
}
