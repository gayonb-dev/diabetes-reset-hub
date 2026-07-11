import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Cross-hook-instance realtime signal so Dashboard's rings refresh the
// instant HabitLogging (a separate useDailyHabits instance) writes.
const HABITS_CHANGED_EVENT = "drm:habits-changed";
function emitChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(HABITS_CHANGED_EVENT));
  }
}



function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export interface MealLog {
  id?: string;
  meal_type: "breakfast" | "lunch" | "dinner";
  vegetables: boolean;
  protein: boolean;
  complex_carbs: boolean;
  free_text: string | null;
}

export interface SnackLog {
  id?: string;
  slot: "snack_1" | "snack_2";
  snack_name: string | null;
  eaten: boolean;
  eaten_at: string | null;
}

export interface WalkLog {
  id?: string;
  slot: "after_breakfast" | "after_lunch" | "after_dinner";
}

export interface DailyHabits {
  loading: boolean;
  waterOz: number;
  waterStreak: number;
  meals: Record<MealLog["meal_type"], MealLog>;
  snacks: Record<SnackLog["slot"], SnackLog | null>;
  walks: Record<WalkLog["slot"], boolean>;
  mindsetRead: boolean;
  mood: number | null;
  addWater: (oz: number) => Promise<void>;
  saveMeal: (mt: MealLog["meal_type"], patch: Partial<MealLog>) => Promise<void>;
  setSnack: (slot: SnackLog["slot"], patch: Partial<SnackLog>) => Promise<void>;
  toggleWalk: (slot: WalkLog["slot"]) => Promise<void>;
  markMindsetRead: () => Promise<void>;
  setMood: (m: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const blankMeal = (mt: MealLog["meal_type"]): MealLog => ({
  meal_type: mt,
  vegetables: false,
  protein: false,
  complex_carbs: false,
  free_text: null,
});

export function useDailyHabits(): DailyHabits {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [waterOz, setWaterOz] = useState(0);
  const [waterStreak, setWaterStreak] = useState(0);
  const [meals, setMeals] = useState<DailyHabits["meals"]>({
    breakfast: blankMeal("breakfast"),
    lunch: blankMeal("lunch"),
    dinner: blankMeal("dinner"),
  });
  const [snacks, setSnacks] = useState<DailyHabits["snacks"]>({
    snack_1: null,
    snack_2: null,
  });
  const [walks, setWalks] = useState<DailyHabits["walks"]>({
    after_breakfast: false,
    after_lunch: false,
    after_dinner: false,
  });
  const [mindsetRead, setMindsetRead] = useState(false);
  const [mood, setMoodState] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const today = todayISO();

    const [w, ml, sn, pw, mr, mo, wRange] = await Promise.all([
      supabase.from("water_logs").select("ounces").eq("member_id", user.id).eq("log_date", today),
      supabase.from("meal_logs").select("*").eq("member_id", user.id).eq("log_date", today),
      supabase.from("snack_logs").select("*").eq("member_id", user.id).eq("log_date", today),
      supabase.from("post_meal_walks").select("slot").eq("member_id", user.id).eq("log_date", today),
      supabase.from("mindset_reads").select("id").eq("member_id", user.id).eq("log_date", today).maybeSingle(),
      supabase.from("mood_logs").select("mood").eq("member_id", user.id).eq("log_date", today).maybeSingle(),
      supabase.from("water_logs").select("log_date, ounces").eq("member_id", user.id).order("log_date", { ascending: false }).limit(60),
    ]);

    setWaterOz((w.data || []).reduce((acc, r: { ounces: number }) => acc + (r.ounces || 0), 0));

    const meals2 = { ...{ breakfast: blankMeal("breakfast"), lunch: blankMeal("lunch"), dinner: blankMeal("dinner") } };
    for (const m of ml.data || []) meals2[m.meal_type as MealLog["meal_type"]] = m as MealLog;
    setMeals(meals2);

    const sn2: DailyHabits["snacks"] = { snack_1: null, snack_2: null };
    for (const s of sn.data || []) sn2[s.slot as SnackLog["slot"]] = s as SnackLog;
    setSnacks(sn2);

    const walks2 = { after_breakfast: false, after_lunch: false, after_dinner: false };
    for (const r of pw.data || []) walks2[r.slot as WalkLog["slot"]] = true;
    setWalks(walks2);

    setMindsetRead(!!mr.data);
    setMoodState(mo.data?.mood ?? null);

    // water streak: consecutive days from today backward with any water row
    const days = new Set((wRange.data || []).map((r: { log_date: string }) => r.log_date));
    let streak = 0;
    const cursor = new Date();
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    setWaterStreak(streak);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for cross-instance mutations so Dashboard and HabitLogging
  // share ring state without a manual reload.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => { refresh(); };
    window.addEventListener(HABITS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(HABITS_CHANGED_EVENT, handler);
  }, [refresh]);

  const addWater = useCallback(
    async (oz: number) => {
      if (!user) return;
      await supabase.from("water_logs").insert({ member_id: user.id, ounces: oz, log_date: todayISO() });
      await refresh();
      emitChanged();
    },
    [user, refresh],
  );

  const saveMeal = useCallback(
    async (mt: MealLog["meal_type"], patch: Partial<MealLog>) => {
      if (!user) return;
      const merged = { ...meals[mt], ...patch };
      const { data, error } = await supabase
        .from("meal_logs")
        .upsert(
          {
            member_id: user.id,
            log_date: todayISO(),
            meal_type: mt,
            vegetables: merged.vegetables,
            protein: merged.protein,
            complex_carbs: merged.complex_carbs,
            free_text: merged.free_text,
          },
          { onConflict: "member_id,log_date,meal_type" },
        )
        .select()
        .maybeSingle();
      if (!error && data) setMeals((p) => ({ ...p, [mt]: data as MealLog }));
      emitChanged();
    },
    [user, meals],
  );

  const setSnack = useCallback(
    async (slot: SnackLog["slot"], patch: Partial<SnackLog>) => {
      if (!user) return;
      const existing = snacks[slot];
      const merged = {
        slot,
        snack_name: existing?.snack_name ?? null,
        eaten: existing?.eaten ?? true,
        eaten_at: existing?.eaten_at ?? null,
        ...patch,
      };
      const { data } = await supabase
        .from("snack_logs")
        .upsert(
          {
            member_id: user.id,
            log_date: todayISO(),
            slot,
            snack_name: merged.snack_name,
            eaten: merged.eaten,
            eaten_at: merged.eaten_at,
          },
          { onConflict: "member_id,log_date,slot" },
        )
        .select()
        .maybeSingle();
      if (data) setSnacks((p) => ({ ...p, [slot]: data as SnackLog }));
      emitChanged();
    },
    [user, snacks],
  );

  const toggleWalk = useCallback(
    async (slot: WalkLog["slot"]) => {
      if (!user) return;
      if (walks[slot]) {
        await supabase.from("post_meal_walks").delete().eq("member_id", user.id).eq("log_date", todayISO()).eq("slot", slot);
        setWalks((p) => ({ ...p, [slot]: false }));
      } else {
        await supabase.from("post_meal_walks").insert({ member_id: user.id, slot, log_date: todayISO() });
        setWalks((p) => ({ ...p, [slot]: true }));
      }
      emitChanged();
    },
    [user, walks],
  );

  const markMindsetRead = useCallback(async () => {
    if (!user || mindsetRead) return;
    await supabase.from("mindset_reads").upsert(
      { member_id: user.id, log_date: todayISO() },
      { onConflict: "member_id,log_date" },
    );
    setMindsetRead(true);
    emitChanged();
  }, [user, mindsetRead]);

  const setMood = useCallback(
    async (m: number) => {
      if (!user) return;
      await supabase.from("mood_logs").upsert(
        { member_id: user.id, log_date: todayISO(), mood: m },

        { onConflict: "member_id,log_date" },
      );
      setMoodState(m);
    },
    [user],
  );

  return {
    loading,
    waterOz,
    waterStreak,
    meals,
    snacks,
    walks,
    mindsetRead,
    mood,
    addWater,
    saveMeal,
    setSnack,
    toggleWalk,
    markMindsetRead,
    setMood,
    refresh,
  };
}
