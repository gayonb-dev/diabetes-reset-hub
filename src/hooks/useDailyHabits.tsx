import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { addCalendarDays, calendarDayKey } from "@/lib/calendarDay";

// Cross-hook-instance realtime signal so Dashboard's rings refresh the
// instant HabitLogging (a separate useDailyHabits instance) writes.
const HABITS_CHANGED_EVENT = "drm:habits-changed";
function emitChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(HABITS_CHANGED_EVENT));
  }
}



// Member calendar day. Resolved through the canonical timezone-aware service
// so log_date, rings and streaks all roll over at the member's local midnight.

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

/** Honest per-surface write state — no silent failures. */
export type SaveState = "idle" | "saving" | "error";

export interface DailyHabits {
  loading: boolean;
  waterOz: number;
  waterStreak: number;
  meals: Record<MealLog["meal_type"], MealLog>;
  snacks: Record<SnackLog["slot"], SnackLog | null>;
  walks: Record<WalkLog["slot"], boolean>;
  mindsetRead: boolean;
  mood: number | null;
  addWater: (oz: number) => Promise<boolean>;
  saveMeal: (mt: MealLog["meal_type"], patch: Partial<MealLog>) => Promise<void>;
  setSnack: (slot: SnackLog["slot"], patch: Partial<SnackLog>) => Promise<void>;
  toggleWalk: (slot: WalkLog["slot"]) => Promise<void>;
  markMindsetRead: () => Promise<void>;
  setMood: (m: number) => Promise<void>;
  refresh: () => Promise<void>;
  /** Per-meal persistence state, so the UI can show saving / retry honestly. */
  mealSaveState: Record<MealLog["meal_type"], SaveState>;
  retryMeal: (mt: MealLog["meal_type"]) => Promise<void>;
}

const blankMeal = (mt: MealLog["meal_type"]): MealLog => ({
  meal_type: mt,
  vegetables: false,
  protein: false,
  complex_carbs: false,
  free_text: null,
});

export function useDailyHabits(): DailyHabits {
  const { user, timezone } = useAuth();
  // Held in a ref so the many write callbacks below don't need `timezone` in
  // their dependency arrays (it changes at most once, on profile load).
  const tzRef = useRef(timezone);
  tzRef.current = timezone;
  const todayISO = () => calendarDayKey(new Date(), tzRef.current);
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
  const [mealSaveState, setMealSaveState] = useState<Record<MealLog["meal_type"], SaveState>>({
    breakfast: "idle",
    lunch: "idle",
    dinner: "idle",
  });
  // Monotonic write sequence per meal. A response is applied only when it is
  // the newest write for that meal, so out-of-order responses cannot resurrect
  // stale values during rapid typing or tapping.
  const mealSeq = useRef<Record<MealLog["meal_type"], number>>({ breakfast: 0, lunch: 0, dinner: 0 });
  const mealApplied = useRef<Record<MealLog["meal_type"], number>>({ breakfast: 0, lunch: 0, dinner: 0 });
  // Last locally-intended meal values — the source for a retry.
  const mealDraft = useRef<Record<MealLog["meal_type"], MealLog>>({
    breakfast: blankMeal("breakfast"),
    lunch: blankMeal("lunch"),
    dinner: blankMeal("dinner"),
  });

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
    // Never clobber a meal that still has an in-flight or failed local write.
    (Object.keys(meals2) as MealLog["meal_type"][]).forEach((mt) => {
      if (mealSeq.current[mt] !== mealApplied.current[mt]) meals2[mt] = mealDraft.current[mt];
      else mealDraft.current[mt] = meals2[mt];
    });
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
    let cursor = todayISO();
    while (days.has(cursor)) {
      streak++;
      cursor = addCalendarDays(cursor, -1);
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

  /**
   * Logs whole US fluid ounces (the canonical storage unit of
   * public.water_logs.ounces, an integer column). Returns true only once the
   * row is persisted, so callers never show "Saved" for a failed write.
   */
  const addWater = useCallback(
    async (oz: number): Promise<boolean> => {
      if (!user) return false;
      if (!Number.isFinite(oz) || oz <= 0) return false;
      // Optimistic — the amount moves immediately, then reconciles.
      setWaterOz((prev) => prev + oz);
      const { error } = await supabase
        .from("water_logs")
        .insert({ member_id: user.id, ounces: oz, log_date: todayISO() });
      if (error) {
        setWaterOz((prev) => Math.max(0, prev - oz));
        return false;
      }
      await refresh();
      emitChanged();
      return true;
    },
    [user, refresh],
  );


  // Writes only the changed fields, applies the local value immediately and
  // reconciles once the newest response settles.
  const writeMeal = useCallback(
    async (mt: MealLog["meal_type"], patch: Partial<MealLog>) => {
      if (!user) return;
      const merged: MealLog = { ...mealDraft.current[mt], ...patch, meal_type: mt };
      mealDraft.current[mt] = merged;
      const seq = ++mealSeq.current[mt];

      setMeals((prev) => ({ ...prev, [mt]: { ...prev[mt], ...patch } }));
      setMealSaveState((prev) => ({ ...prev, [mt]: "saving" }));

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

      // Stale response — a newer write already superseded this one.
      if (seq !== mealSeq.current[mt]) return;
      mealApplied.current[mt] = seq;

      if (error) {
        setMealSaveState((prev) => ({ ...prev, [mt]: "error" }));
        return;
      }
      if (data) {
        mealDraft.current[mt] = data as MealLog;
        setMeals((prev) => ({ ...prev, [mt]: data as MealLog }));
      }
      setMealSaveState((prev) => ({ ...prev, [mt]: "idle" }));
      emitChanged();
    },
    [user],
  );

  const saveMeal = useCallback(
    async (mt: MealLog["meal_type"], patch: Partial<MealLog>) => {
      await writeMeal(mt, patch);
    },
    [writeMeal],
  );

  const retryMeal = useCallback(
    async (mt: MealLog["meal_type"]) => {
      await writeMeal(mt, {});
    },
    [writeMeal],
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
      const was = walks[slot];
      setWalks((p) => ({ ...p, [slot]: !was }));
      const { error } = was
        ? await supabase.from("post_meal_walks").delete().eq("member_id", user.id).eq("log_date", todayISO()).eq("slot", slot)
        : await supabase.from("post_meal_walks").insert({ member_id: user.id, slot, log_date: todayISO() });
      if (error) setWalks((p) => ({ ...p, [slot]: was }));
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
      emitChanged();
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
    mealSaveState,
    retryMeal,
  };
}
