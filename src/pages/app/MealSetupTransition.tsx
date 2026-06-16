// Full-screen VITA transition shown right after onboarding's "Let's go".
// Fires four parallel generate-meal-plan calls (one per week), lets the member
// pick cuisine + cooking time inline, and auto-advances ONLY when all 4 weekly
// plans return `complete`. A 90s safety net advances to /app/meals if any week
// is still pending (the Meals tab shows per-week status with a retry button).
//
// Cuisine / cooking time changes during generation cancel all in-flight calls
// (via generationKeyRef) and restart all 4 with the new preferences.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Vita from "@/components/vita/Vita";
import VitaErrorCard from "@/components/vita/VitaErrorCard";
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
const MAX_WAIT_MS = 90_000;
const TOTAL_WEEKS = 4;

type WeekKey = "plan1" | "plan2" | "plan3" | "plan4";
interface PlanIds { plan1: string | null; plan2: string | null; plan3: string | null; plan4: string | null }
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
  const planIdsRef = useRef<PlanIds>({ plan1: null, plan2: null, plan3: null, plan4: null });
  const generationKeyRef = useRef(0); // increments each restart; stale calls are discarded
  const completionRef = useRef<Record<WeekKey, boolean>>({ plan1: false, plan2: false, plan3: false, plan4: false });
  const [completedCount, setCompletedCount] = useState(0);
  const [forcedAdvance, setForcedAdvance] = useState(false);
  const startedAtRef = useRef<number>(Date.now());

  function recomputeCompleted() {
    const c = (["plan1","plan2","plan3","plan4"] as WeekKey[])
      .reduce((n, k) => n + (completionRef.current[k] ? 1 : 0), 0);
    setCompletedCount(c);
    return c;
  }

  // Start (or restart) all four generations with the given preferences.
  async function startGeneration(prefs: { cuisine: string; cookingTime: string }) {
    if (!user) return;
    generationKeyRef.current += 1;
    const myKey = generationKeyRef.current;
    completionRef.current = { plan1: false, plan2: false, plan3: false, plan4: false };
    setCompletedCount(0);
    startedAtRef.current = Date.now();

    const snapshot = {
      cuisine_preferences: [prefs.cuisine],
      cooking_time: prefs.cookingTime,
    };

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

    if (myKey !== generationKeyRef.current) return;

    // Create four pending one-week plan rows.
    const insertResults = await Promise.all([0, 7, 14, 21].map((offset) =>
      supabase
        .from("meal_plans")
        .insert({
          member_id: user.id,
          plan_type: "standard",
          generation_status: "pending",
          generation_trigger: "onboarding",
          valid_from: todayPlus(offset),
          valid_until: todayPlus(offset + 6),
          preferences_snapshot: snapshot,
          plan_data: {},
        } as never)
        .select("id")
        .single(),
    ));
    const insertError = insertResults.find((result) => result.error)?.error;
    if (insertError) throw insertError;

    if (myKey !== generationKeyRef.current) return;
    const rows = insertResults.map((result) => result.data);
    planIdsRef.current = {
      plan1: rows[0]?.id ?? null,
      plan2: rows[1]?.id ?? null,
      plan3: rows[2]?.id ?? null,
      plan4: rows[3]?.id ?? null,
    };

    rows.forEach((row, index) => {
      if (!row?.id) return;
      const key = (`plan${index + 1}`) as WeekKey;
      supabase.functions
        .invoke("generate-meal-plan", { body: { plan_id: row.id, plan_index: index + 1 } })
        .then((result: GenerationResult) => {
          if (myKey !== generationKeyRef.current) return; // stale
          if (result.error) {
            console.error(`Week ${index + 1} generation error`, result.error);
            return; // leave incomplete; Meals tab will surface failed status
          }
          completionRef.current[key] = true;
          recomputeCompleted();
        })
        .catch((error) => {
          if (myKey !== generationKeyRef.current) return;
          console.error(`Week ${index + 1} generation threw`, error);
        });
    });
  }

  // Kick off on mount.
  useEffect(() => {
    if (!user) return;
    startGeneration({ cuisine: DEFAULT_CUISINE, cookingTime: DEFAULT_COOKING }).catch((e) => {
      toast({
        title: "Couldn't start meal plan",
        description: e instanceof Error ? e.message : "Please try again from the Meals tab.",
        variant: "destructive",
      });
      navigate("/app/meals", { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // 90s max wait safety net.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (Date.now() - startedAtRef.current >= MAX_WAIT_MS && completedCount < TOTAL_WEEKS) {
        setForcedAdvance(true);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [completedCount]);

  // Auto-advance only when all 4 are complete. On 90s timeout, show VitaErrorCard
  // with a retry button instead of forcing a navigation away.
  useEffect(() => {
    if (completedCount >= TOTAL_WEEKS) {
      navigate("/app/meals", { replace: true });
    }
  }, [completedCount, navigate]);

  if (forcedAdvance && completedCount < TOTAL_WEEKS) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ backgroundColor: "#085041" }}
      >
        <VitaErrorCard
          title="Your meal plan is taking longer than expected"
          message={`${completedCount} of ${TOTAL_WEEKS} weeks finished. Retry now, or open the Meals tab and finish the rest there.`}
          retryLabel="Try again"
          onRetry={() => {
            setForcedAdvance(false);
            startGeneration({ cuisine, cookingTime }).catch(console.error);
          }}
        />
      </div>
    );
  }

  function pickCuisine(c: string) {
    if (c === cuisine) return;
    setCuisine(c);
    startGeneration({ cuisine: c, cookingTime }).catch(console.error);
  }

  function pickCooking(t: string) {
    if (t === cookingTime) return;
    setCookingTime(t);
    startGeneration({ cuisine, cookingTime: t }).catch(console.error);
  }

  const subText = useMemo(() => {
    if (completedCount >= TOTAL_WEEKS) return "Opening your meal plan…";
    return `${completedCount} of ${TOTAL_WEEKS} weeks ready…`;
  }, [completedCount]);

  const progressPct = Math.round((completedCount / TOTAL_WEEKS) * 100);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 py-10 text-center"
      style={{ backgroundColor: "#085041" }}
    >
      <Vita posture="encouraging" size={120} />

      <div className="space-y-2 max-w-sm">
        <h1 className="text-[20px] font-semibold leading-snug" style={{ color: "#FFFFFF" }}>
          Building your 4-week meal plan
        </h1>
        <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>
          {subText}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%`, backgroundColor: "#E8A029" }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px]" style={{ color: "rgba(255,255,255,0.55)" }}>
          {[1, 2, 3, 4].map((n) => (
            <span key={n} style={{ opacity: completedCount >= n ? 1 : 0.4 }}>
              {completedCount >= n ? "✓" : "○"} Week {n}
            </span>
          ))}
        </div>
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
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
          Changing cuisine restarts all 4 weeks.
        </p>
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
