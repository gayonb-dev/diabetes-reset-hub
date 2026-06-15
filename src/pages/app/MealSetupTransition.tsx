// Full-screen VITA transition shown right after onboarding's "Let's go".
// Fires two parallel generate-meal-plan calls (Plan 1: days 1–14, Plan 2: days 15–28),
// lets the member pick cuisine + cooking time inline, restarts both calls if the
// preference changes before completion, and auto-advances to /app once both plans
// are `complete` AND a cuisine has been selected.
//
// 18s no-input timeout: use the default selections and proceed when both plans finish.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Vita from "@/components/vita/Vita";
import { toast } from "@/hooks/use-toast";

const CUISINES = [
  "International (balanced)",
  "Caribbean",
  "Mediterranean",
  "Asian",
  "Latin",
  "African",
  "American",
] as const;

const COOKING_TIMES = [
  "Under 20 min",
  "20–45 min",
  "Over 45 min",
  "No-cook preferred",
] as const;

const DEFAULT_CUISINE = "International (balanced)";
const DEFAULT_COOKING = "20–45 min";

interface PlanIds { plan1: string | null; plan2: string | null }
type GenerationResult = { error?: { message?: string } | null };

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function MealSetupTransition() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cuisine, setCuisine] = useState<string>(DEFAULT_CUISINE);
  const [cookingTime, setCookingTime] = useState<string>(DEFAULT_COOKING);
  const [userTouched, setUserTouched] = useState(false);
  const planIdsRef = useRef<PlanIds>({ plan1: null, plan2: null });
  const generationKeyRef = useRef(0); // increments each restart; stale calls are discarded
  const [bothComplete, setBothComplete] = useState(false);
  const completionRef = useRef({ plan1: false, plan2: false });

  // Start (or restart) both generations with the given preferences.
  async function startGeneration(prefs: { cuisine: string; cookingTime: string }) {
    if (!user) return;
    generationKeyRef.current += 1;
    const myKey = generationKeyRef.current;
    completionRef.current = { plan1: false, plan2: false };
    setBothComplete(false);

    const snapshot = {
      cuisine_preferences: [prefs.cuisine],
      cooking_time: prefs.cookingTime,
    };

    // Persist on the authenticated member's own profile row (RLS-protected).
    const { data: prof } = await supabase
      .from("profiles")
      .select("meal_preferences")
      .eq("user_id", user.id)
      .maybeSingle();
    await supabase
      .from("profiles")
      .update({
        meal_preferences: {
          ...((prof?.meal_preferences as Record<string, unknown>) || {}),
          cuisine_preferences: [prefs.cuisine],
          cooking_time: prefs.cookingTime,
        } as never,
      })
      .eq("user_id", user.id);

    // Create two pending plan rows: today→+13 and +14→+27.
    const [{ data: row1, error: e1 }, { data: row2, error: e2 }] = await Promise.all([
      supabase
        .from("meal_plans")
        .insert({
          member_id: user.id,
          plan_type: "standard",
          generation_status: "pending",
          generation_trigger: "onboarding",
          valid_from: todayPlus(0),
          valid_until: todayPlus(13),
          preferences_snapshot: snapshot,
          plan_data: {},
        } as never)
        .select("id")
        .single(),
      supabase
        .from("meal_plans")
        .insert({
          member_id: user.id,
          plan_type: "standard",
          generation_status: "pending",
          generation_trigger: "onboarding",
          valid_from: todayPlus(14),
          valid_until: todayPlus(27),
          preferences_snapshot: snapshot,
          plan_data: {},
        } as never)
        .select("id")
        .single(),
    ]);
    if (e1 || e2) throw (e1 ?? e2);

    if (myKey !== generationKeyRef.current) return; // a newer restart took over
    planIdsRef.current = { plan1: row1?.id ?? null, plan2: row2?.id ?? null };

    // Fire both edge function calls in parallel — do not await.
    if (row1?.id) {
      supabase.functions
        .invoke("generate-meal-plan", { body: { plan_id: row1.id, plan_index: 1 } })
        .then((result: GenerationResult) => {
          if (result.error) throw result.error;
          if (myKey === generationKeyRef.current) {
            completionRef.current.plan1 = true;
            checkBothDone();
          }
        })
        .catch((error) => handleGenerationError(error));
    }
    if (row2?.id) {
      supabase.functions
        .invoke("generate-meal-plan", { body: { plan_id: row2.id, plan_index: 2 } })
        .then((result: GenerationResult) => {
          if (result.error) throw result.error;
          if (myKey === generationKeyRef.current) {
            completionRef.current.plan2 = true;
            checkBothDone();
          }
        })
        .catch((error) => handleGenerationError(error));
    }
  }

  function handleGenerationError(error: unknown) {
    const message = error instanceof Error ? error.message : "Please try again from the Meals tab.";
    toast({ title: "Meal plan generation failed", description: message, variant: "destructive" });
    navigate("/app/meals", { replace: true });
  }

  function checkBothDone() {
    if (completionRef.current.plan1 && completionRef.current.plan2) {
      setBothComplete(true);
    }
  }

  // Kick off the first generation on mount with defaults.
  useEffect(() => {
    if (!user) return;
    startGeneration({ cuisine: DEFAULT_CUISINE, cookingTime: DEFAULT_COOKING });
    // 18s safety net: if the member never touches anything, treat as approved.
    const t = window.setTimeout(() => setUserTouched(true), 18000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Auto-advance once both plans complete AND the member has confirmed a cuisine
  // (touched the chips OR 18s elapsed).
  useEffect(() => {
    if (bothComplete && userTouched) {
      navigate("/app", { replace: true });
    }
  }, [bothComplete, userTouched, navigate]);

  function pickCuisine(c: string) {
    setUserTouched(true);
    if (c === cuisine) return;
    setCuisine(c);
    if (!bothComplete) {
      startGeneration({ cuisine: c, cookingTime });
    }
  }

  function pickCooking(t: string) {
    setUserTouched(true);
    if (t === cookingTime) return;
    setCookingTime(t);
    if (!bothComplete) {
      startGeneration({ cuisine, cookingTime: t });
    }
  }

  const subText = useMemo(() => {
    if (bothComplete && userTouched) return "Opening your dashboard…";
    if (bothComplete) return "Your plan is ready — tap your cuisine to continue.";
    return "Building 4 weeks of meals tailored to you.";
  }, [bothComplete, userTouched]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 py-10 text-center"
      style={{ backgroundColor: "#085041" }}
    >
      <Vita posture="encouraging" size={120} />

      <div className="space-y-2 max-w-sm">
        <h1 className="text-[20px] font-semibold leading-snug" style={{ color: "#FFFFFF" }}>
          One last thing while I build your plan…
        </h1>
        <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>
          {subText}
        </p>
      </div>

      <div className="space-y-2 max-w-md">
        <p
          className="text-[11px] uppercase tracking-[0.08em]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          Cuisine style
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {CUISINES.map((c) => {
            const on = cuisine === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => pickCuisine(c)}
                className="px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-colors"
                style={{
                  background: on ? "#E8A029" : "transparent",
                  borderColor: on ? "#E8A029" : "rgba(255,255,255,0.3)",
                  color: on ? "#FFFFFF" : "rgba(255,255,255,0.75)",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 max-w-md">
        <p
          className="text-[11px] uppercase tracking-[0.08em]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          Cooking time
        </p>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {COOKING_TIMES.map((t) => {
            const on = cookingTime === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => pickCooking(t)}
                className="px-3 py-1.5 rounded-full text-[11px] border transition-colors"
                style={{
                  background: on ? "rgba(255,255,255,0.15)" : "transparent",
                  borderColor: on ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)",
                  color: on ? "#FFFFFF" : "rgba(255,255,255,0.6)",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-1.5 mt-4" aria-label="Generating">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-2 w-2 rounded-full"
            style={{
              backgroundColor: "#E8A029",
              animation: `vita-dot 1.2s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes vita-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
