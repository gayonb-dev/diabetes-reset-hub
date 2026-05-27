import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import HabitRing from "@/components/dashboard/HabitRing";
import JourneyTrack from "@/components/dashboard/JourneyTrack";
import QuickStats from "@/components/dashboard/QuickStats";
import VitaQuoteCard from "@/components/dashboard/VitaQuoteCard";
import GettingStartedChecklist from "@/components/dashboard/GettingStartedChecklist";
import StreakBadge from "@/components/gamification/StreakBadge";
import LevelBadge from "@/components/gamification/LevelBadge";
import StreakHistoryModal from "@/components/gamification/StreakHistoryModal";
import LevelUpOverlay from "@/components/gamification/LevelUpOverlay";
import Phase1ExtensionPrompt from "@/components/gamification/Phase1ExtensionPrompt";
import { useGamificationProfile } from "@/hooks/useGamificationProfile";
import SupplementPrompt from "@/components/onboarding/SupplementPrompt";
import HabitLogging from "@/components/today/HabitLogging";
import { useDailyHabits } from "@/hooks/useDailyHabits";
import { getUnits, displayGlucose, displayWeight } from "@/lib/units";

type DailyAction = {
  id: string;
  day_number: number;
  phase_number: number;
  action_title: string;
  action_description: string;
  sub_tasks: Array<{ task_id: string }>;
};

type Progress = {
  status: string;
  sub_tasks_completed: Array<string> | Record<string, boolean>;
};

type ProfileMeta = {
  first_name?: string;
  blood_sugar_unit?: "mgdl" | "mmoll";
};

const VITA_TIPS = [
  "Three days in. Your blood sugar is already responding. This is the part most people never reach.",
  "Hydration first. Most cravings are dehydration in disguise.",
  "A short walk after eating moves glucose into your muscles, not your bloodstream.",
  "Progress is not linear. Trust the trend, not the day.",
  "You're not on a diet. You're rebuilding how your body handles fuel.",
];

const LEVEL_NAMES: Record<number, string> = {
  1: "Starting Out",
  2: "Building Habits",
  3: "Finding Rhythm",
  4: "Reset Underway",
  5: "Reversal in Motion",
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function phaseFor(day: number): { name: string; index: number; total: number } {
  if (day <= 14) return { name: "Phase 1 — Reset", index: 1, total: 14 };
  if (day <= 28) return { name: "Phase 2 — Momentum", index: 2, total: 14 };
  return { name: `Phase 3 — Reversal`, index: 3, total: 14 };
}

function bloodSugarTone(mgdl: number): "normal" | "warning" | "danger" {
  if (mgdl < 100) return "normal";
  if (mgdl < 126) return "warning";
  return "danger";
}

export default function Dashboard() {
  const { user, subscription } = useAuth();
  const { streak } = useGamification();
  const habits = useDailyHabits();

  const [meta, setMeta] = useState<ProfileMeta>({});
  const [action, setAction] = useState<DailyAction | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [latestBS, setLatestBS] = useState<{ value: number; date: string } | null>(null);
  const [latestWeight, setLatestWeight] = useState<{ value: number; date: string } | null>(null);
  const [waterTargetLb, setWaterTargetLb] = useState<number>(180);
  const [latestA1C, setLatestA1C] = useState<{ value: number; date: string } | null>(null);
  const [latestReading, setLatestReading] = useState<{ value: number; at: string } | null>(null);

  // current program day from subscription created_at
  const currentProgramDay = useMemo(() => {
    const start = subscription?.created_at ? new Date(subscription.created_at) : new Date();
    const diff = Math.floor(
      (startOfDay(new Date()).getTime() - startOfDay(start).getTime()) / 86400000,
    );
    return Math.max(diff + 1, 1);
  }, [subscription]);

  const phase = phaseFor(currentProgramDay);
  const dayInPhase = Math.min(currentProgramDay - (phase.index - 1) * 14, phase.total);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      // Profile metadata (first_name + units)
      const { data: vp } = await supabase
        .from("visitor_profiles")
        .select("metadata")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled && vp) setMeta((vp.metadata as ProfileMeta) ?? {});

      // Today's action from daily_actions
      const { data: act } = await supabase
        .from("daily_actions")
        .select("id, day_number, phase_number, action_title, action_description, sub_tasks")
        .eq("day_number", currentProgramDay)
        .eq("is_extension_day", false)
        .maybeSingle();
      if (!cancelled && act) {
        setAction(act as DailyAction);

        const { data: prog } = await supabase
          .from("member_daily_progress")
          .select("status, sub_tasks_completed")
          .eq("member_id", user.id)
          .eq("action_id", act.id)
          .maybeSingle();
        if (!cancelled) setProgress(prog as Progress | null);
      }

      // Latest health logs (separate queries — newest non-null per metric)
      const { data: bs } = await supabase
        .from("health_logs")
        .select("blood_sugar, log_date")
        .eq("user_id", user.id)
        .not("blood_sugar", "is", null)
        .order("log_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && bs?.blood_sugar != null) {
        setLatestBS({ value: bs.blood_sugar as number, date: bs.log_date as string });
      }

      const { data: w } = await supabase
        .from("health_logs")
        .select("weight, log_date")
        .eq("user_id", user.id)
        .not("weight", "is", null)
        .order("log_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && w?.weight != null) {
        setLatestWeight({ value: Number(w.weight), date: w.log_date as string });
        setWaterTargetLb(Number(w.weight));
      }

      const { data: a1c } = await supabase
        .from("a1c_logs")
        .select("value_percent, measured_on")
        .eq("member_id", user.id)
        .order("measured_on", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && a1c?.value_percent != null) {
        setLatestA1C({ value: Number(a1c.value_percent), date: a1c.measured_on as string });
      }

      const { data: rd } = await supabase
        .from("blood_sugar_readings")
        .select("value_mgdl, measured_at")
        .eq("member_id", user.id)
        .order("measured_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && rd?.value_mgdl != null) {
        setLatestReading({ value: rd.value_mgdl as number, at: rd.measured_at as string });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, currentProgramDay]);

  const firstName = meta.first_name?.trim() || "friend";

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  // Habit rings — driven by today's logs (Section 9).
  const mealsDone = (["breakfast", "lunch", "dinner"] as const).filter(
    (mt) => habits.meals[mt].vegetables && habits.meals[mt].protein && habits.meals[mt].complex_carbs,
  ).length;
  const walksDone = (["after_breakfast", "after_lunch", "after_dinner"] as const).filter(
    (s) => habits.walks[s],
  ).length;
  const waterTargetOz = Math.round(waterTargetLb / 2);
  const habitData = {
    water: { value: habits.waterOz, target: waterTargetOz, unit: "oz" },
    food: { value: mealsDone, target: 3, unit: "meals" },
    exercise: {
      value: currentProgramDay >= 15 && currentProgramDay <= 28 ? walksDone : 0,
      target: currentProgramDay >= 15 && currentProgramDay <= 28 ? 3 : 1,
      unit: currentProgramDay <= 28 ? "walks" : "session",
    },
    mindset: { value: habits.mindsetRead ? 1 : 0, target: 1, unit: "" },
  };

  const actionDoneToday = progress?.status === "completed";
  const subTasksTotal = action?.sub_tasks?.length ?? 0;
  const subTasksDone = (() => {
    const v = progress?.sub_tasks_completed;
    if (!v) return 0;
    if (Array.isArray(v)) return v.length;
    return Object.values(v).filter(Boolean).length;
  })();

  const units = getUnits();
  const bsUnit = meta.blood_sugar_unit ?? units.glucose;
  const daysSince = (iso: string) =>
    Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

  const bsSource = latestReading
    ? { value: latestReading.value, date: latestReading.at }
    : latestBS;
  const stats = [
    {
      label: "Blood Sugar",
      value: bsSource
        ? displayGlucose(bsSource.value, bsUnit).replace(/ (mg\/dL|mmol\/L)$/, "")
        : null,
      unit: bsSource ? (bsUnit === "mmoll" ? "mmol/L" : "mg/dL") : undefined,
      sub: bsSource ? `Logged ${daysSince(bsSource.date)}d ago` : undefined,
      emptyHint: "Tap to log",
      tone: bsSource ? bloodSugarTone(bsSource.value) : ("warning" as const),
      href: "/app/progress",
    },
    {
      label: "Water Today",
      value: habits.waterOz > 0 ? String(habits.waterOz) : null,
      unit: habits.waterOz > 0 ? `oz / ${waterTargetOz}oz` : undefined,
      sub: habits.waterStreak > 1 ? `💧 ${habits.waterStreak}-day streak` : undefined,
      emptyHint: "Tap to log",
      tone: "water" as const,
      href: "/app/progress",
    },
    {
      label: "Last Weight",
      value: latestWeight
        ? displayWeight(latestWeight.value, units.weight).replace(/ (lb|kg)$/, "")
        : null,
      unit: latestWeight ? units.weight : undefined,
      sub: latestWeight ? `Measured ${daysSince(latestWeight.date)}d ago` : undefined,
      emptyHint: "Add weight",
      tone: "neutral" as const,
      href: "/app/progress",
    },
    {
      label: "Last A1C",
      value: latestA1C ? `${latestA1C.value.toFixed(1)}%` : null,
      sub: latestA1C ? `${daysSince(latestA1C.date)}d ago` : undefined,
      emptyHint: "Enter A1C →",
      tone: (latestA1C
        ? latestA1C.value < 5.7
          ? "normal"
          : latestA1C.value < 6.5
          ? "warning"
          : "danger"
        : "warning") as "normal" | "warning" | "danger",
      href: "/app/progress",
    },
  ];

  const levelName = LEVEL_NAMES[streak.level] ?? "On Track";

  return (
    <div className="max-w-[880px] mx-auto space-y-5 animate-fade-in">
      <SupplementPrompt />

      {/* Row 1 — Greeting */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-secondary-fg">{greeting},</p>
          <h1 className="font-heading text-3xl md:text-[32px] font-bold text-foreground leading-tight">
            {firstName}.
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button
            type="button"
            className="flex items-center gap-1.5 group"
            aria-label="Open streak history"
          >
            <Flame
              className="h-5 w-5"
              style={{ color: "#FF6A1F", filter: "drop-shadow(0 0 6px rgba(255,140,0,0.35))" }}
              strokeWidth={2.4}
            />
            <span className="text-lg font-semibold text-accent leading-none">
              {streak.current_streak}
            </span>
          </button>
          <span className="text-[11px] text-secondary-fg">
            {streak.current_streak === 1 ? "1-day streak" : `${streak.current_streak}-day streak`}
          </span>
          <span className="bg-primary text-primary-foreground text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full">
            Level {streak.level}: {levelName}
          </span>
        </div>
      </div>

      {/* Row 2 — Habit rings */}
      <div className="grid grid-cols-4 gap-3 sm:gap-4">
        <HabitRing habit="water" {...habitData.water} />
        <HabitRing habit="food" {...habitData.food} />
        <HabitRing habit="exercise" {...habitData.exercise} />
        <HabitRing habit="mindset" {...habitData.mindset} />
      </div>

      {/* Row 3 — Today's action card */}
      {action ? (
        <div
          className={`rounded-2xl border-[1.5px] p-6 transition-colors ${
            actionDoneToday
              ? "bg-primary-muted border-primary"
              : "bg-accent-muted border-accent/60"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="label-caps text-accent">Today's Action</p>
            <span className="flex items-center gap-2 text-[12px] text-tertiary-fg">
              Day {currentProgramDay} of {phase.total * 1}
              {actionDoneToday && <CheckCircle2 className="h-4 w-4 text-primary" />}
            </span>
          </div>
          <h2 className="font-heading text-2xl font-bold mb-3 text-foreground leading-tight">
            {action.action_title}
          </h2>
          <p className="text-[15px] text-secondary-fg mb-5 leading-relaxed">
            {action.action_description}
          </p>
          <Link to={`/app/day/${currentProgramDay}`} className="block">
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground w-full h-12 rounded-[10px] font-semibold"
              disabled={actionDoneToday}
            >
              {actionDoneToday ? (
                "Action completed ✓"
              ) : (
                <>
                  Open today's action <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </Link>
          {subTasksTotal > 0 && (
            <p className="text-[11px] text-accent font-medium mt-2 text-center">
              {subTasksDone} of {subTasksTotal} sub-tasks completed
            </p>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="label-caps text-tertiary-fg mb-2">Today's Action</p>
          <p className="text-sm text-secondary-fg">
            Your next action will appear here as the program advances.
          </p>
        </div>
      )}

      {/* Row 4 — Journey track */}
      <JourneyTrack
        currentDay={dayInPhase}
        totalDays={phase.total}
        phaseName={phase.name}
        phaseIndex={phase.index}
        phaseTotal={5}
      />

      {/* Row 5 — Quick stats */}
      <QuickStats stats={stats} />

      {/* Row 6 — VITA quote */}
      <VitaQuoteCard quotes={VITA_TIPS} />

      {/* Daily habit logging (Section 9) */}
      <HabitLogging currentProgramDay={currentProgramDay} />


      {/* Getting Started checklist (Days 1–29 only) */}
      <GettingStartedChecklist currentProgramDay={currentProgramDay} />

      <p className="text-[11px] text-tertiary-fg text-center pt-2">
        Educational only — not medical advice. Always consult your healthcare provider.
      </p>
    </div>
  );
}
