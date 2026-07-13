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

/**
 * Returns the member's 1-indexed program day, or `0` while still loading.
 *
 * Callers MUST treat `0` as "not ready" — never as a real day number — and
 * render a loading state instead of any day-gated content. Rendering a
 * locked/pre-Day-29 view on `0` would flash "locked" for a frame on a member
 * who is actually far past that boundary.
 */
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

  // Sentinel: 0 = not ready. Do NOT compute from subscription during load —
  // that would return `1` for members whose subscription row lags the profile
  // read, briefly bouncing Day-29+ users out of gated views (workouts).
  if (!loaded) return 0;
  return computeDay(startDate ?? subscription?.created_at);
}
