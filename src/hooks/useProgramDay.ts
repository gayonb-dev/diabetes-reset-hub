// Single source of truth for a member's current program day (1-indexed).
// Reads profiles.program_start_date, with a fallback chain of:
//   profiles.program_start_date → subscription.created_at → today.
// Do NOT recompute program day inline anywhere else — use this hook.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function computeDay(iso: string | null | undefined): number {
  if (!iso) return 1;
  const start = new Date(iso);
  const diff = Math.floor(
    (startOfDay(new Date()).getTime() - startOfDay(start).getTime()) / 86400000,
  );
  return Math.max(1, diff + 1);
}

export function useProgramDay(): number {
  const { user, subscription } = useAuth();
  const [startDate, setStartDate] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setStartDate(null);
      setLoaded(true);
      return;
    }
    supabase
      .from("profiles")
      .select("program_start_date")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setStartDate((data?.program_start_date as string | null) ?? null);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!loaded) return computeDay(subscription?.created_at);
  return computeDay(startDate ?? subscription?.created_at);
}
