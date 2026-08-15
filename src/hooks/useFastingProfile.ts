import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import {
  canFast as canFastFn,
  effectiveTarget,
  getFastingWindow,
  scheduleForProfile,
  type FastingEligibility,
  type FastingProfileLike,
} from "@/lib/mealTiming";

export interface FastingProfile extends FastingProfileLike {
  medication_class: string | null;
  fasting_exclusions: Record<string, boolean>;
  low_bs_card_seen_at: string | null;
}

const DEFAULTS: FastingProfile = {
  medication_class: null,
  fasting_eligibility: "unscreened",
  doctor_confirmed_at: null,
  fasting_exclusions: {},
  bedtime_hour: 22,
  fasting_target: 0,
  fasting_started_on: null,
  window_start_hour: 8,
  low_bs_card_seen_at: null,
};

export function useFastingProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FastingProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const sb = supabase as unknown as SupabaseClient;
    const { data } = await sb
      .from("profiles")
      .select(
        "medication_class, fasting_eligibility, doctor_confirmed_at, fasting_exclusions, bedtime_hour, fasting_target, fasting_started_on, window_start_hour, low_bs_card_seen_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();
    setProfile({ ...DEFAULTS, ...(data || {}) } as FastingProfile);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (patch: Partial<FastingProfile>) => {
      if (!user) return { error: new Error("Not signed in") };
      const sb = supabase as unknown as SupabaseClient;
      const { error } = await sb.from("profiles").update(patch).eq("user_id", user.id);
      if (!error) setProfile((p) => ({ ...(p || DEFAULTS), ...patch }) as FastingProfile);
      return { error };
    },
    [user],
  );

  const eligibility = (profile?.fasting_eligibility ?? "unscreened") as FastingEligibility;

  return {
    profile,
    loading,
    reload: load,
    save,
    eligibility,
    /** false for unscreened, not_eligible, and unconfirmed needs_doctor */
    canFast: canFastFn(profile),
    needsScreening: eligibility === "unscreened",
    target: effectiveTarget(profile),
    storedTarget: (profile?.fasting_target ?? 0) as number,
    window: getFastingWindow(profile),
    schedule: scheduleForProfile(profile),
  };
}
