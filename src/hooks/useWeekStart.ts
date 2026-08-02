import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { WeekStartDay } from "@/lib/weekStart";

/**
 * Reads the member's week-start preference (0 = Sunday, 1 = Monday).
 * Defaults to Sunday while loading or when unset.
 */
export function useWeekStart() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState<WeekStartDay>(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("week_start_day")
      .eq("user_id", user.id)
      .maybeSingle();
    const v = (data as { week_start_day?: number } | null)?.week_start_day;
    setWeekStart(v === 1 ? 1 : 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (value: WeekStartDay) => {
      if (!user) return;
      setWeekStart(value);
      await supabase
        .from("profiles")
        .update({ week_start_day: value } as never)
        .eq("user_id", user.id);
    },
    [user],
  );

  return { weekStart, loading, save, refresh: load };
}
