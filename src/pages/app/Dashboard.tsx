import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";
import HabitRing from "@/components/dashboard/HabitRing";
import JourneyTrack from "@/components/dashboard/JourneyTrack";
import QuickStats from "@/components/dashboard/QuickStats";
import VitaQuoteCard, { QuoteItem } from "@/components/dashboard/VitaQuoteCard";
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
import { useVitaQuotes } from "@/hooks/useVitaQuotes";
import { useProgramDay } from "@/hooks/useProgramDay";
import { getUnits, displayGlucose, displayWeight } from "@/lib/units";
import { phaseFor, dayInPhase, PHASE_TOTAL } from "@/lib/phase";

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

// startOfDay removed — program day now comes from useProgramDay.


function bloodSugarTone(mgdl: number): "normal" | "warning" | "danger" {
  if (mgdl < 100) return "normal";
  if (mgdl < 126) return "warning";
  return "danger";
}

function DashboardSkeleton() {
  return (
    <div className="max-w-[880px] mx-auto space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-10 w-1/2 rounded bg-muted animate-pulse" />
      <div className="grid grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 md:h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-44 rounded-2xl bg-muted animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const habits = useDailyHabits();
  const [showStreakHistory, setShowStreakHistory] = useState(false);

  const [meta, setMeta] = useState<ProfileMeta>({});
  const [action, setAction] = useState<DailyAction | null>(null);
  const [upcoming, setUpcoming] = useState<DailyAction[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [latestBS, setLatestBS] = useState<{ value: number; date: string } | null>(null);
  const [latestWeight, setLatestWeight] = useState<{ value: number; date: string } | null>(null);
  const [waterTargetLb, setWaterTargetLb] = useState<number>(180);
  const [latestA1C, setLatestA1C] = useState<{ value: number; date: string } | null>(null);
  const [latestReading, setLatestReading] = useState<{ value: number; at: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Single source of truth for program day.
  const currentProgramDay = useProgramDay();

  const phase = phaseFor(currentProgramDay);
  const currentDayInPhase = dayInPhase(currentProgramDay);
  const gam = useGamificationProfile(currentProgramDay);
  const { quotes: vitaQuotes } = useVitaQuotes(user?.id, currentProgramDay);

  const quoteItems: QuoteItem[] = useMemo(
    () =>
      vitaQuotes.map((q) => ({
        text: q.text,
        speaker: q.category === "gayon_says" ? "GAYON" : "VITA",
      })),
    [vitaQuotes],
  );

  const [refetchTick, setRefetchTick] = useState(0);

  // Refetch today's action + progress on habit changes and on window focus.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setRefetchTick((n) => n + 1);
    window.addEventListener("drm:habits-changed", bump);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener("drm:habits-changed", bump);
      window.removeEventListener("focus", bump);
    };
  }, []);

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

      // Today + next 2 upcoming daily actions (single extended query)
      const { data: actions } = await supabase
        .from("daily_actions")
        .select("id, day_number, phase_number, action_title, action_description, sub_tasks")
        .gte("day_number", currentProgramDay)
        .eq("is_extension_day", false)
        .order("day_number", { ascending: true })
        .limit(3);
      const list = (actions ?? []) as DailyAction[];
      const today = list.find((a) => a.day_number === currentProgramDay) ?? null;
      const next2 = list.filter((a) => a.day_number > currentProgramDay).slice(0, 2);
      if (!cancelled) {
        setAction(today);
        setUpcoming(next2);
      }

      if (today) {
        const { data: prog } = await supabase
          .from("member_daily_progress")
          .select("status, sub_tasks_completed")
          .eq("member_id", user.id)
          .eq("action_id", today.id)
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

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, currentProgramDay]);

  if (loading) return <DashboardSkeleton />;

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
      href: "/app/today#water-logging",

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

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 animate-fade-in">
      <div className="max-w-[880px] mx-auto space-y-5 min-w-0">
        <SupplementPrompt />
        <LevelUpOverlay level={gam.leveledUpTo} onDismiss={gam.dismissLevelUp} />
        <Phase1ExtensionPrompt
          currentProgramDay={currentProgramDay}
          enabled={!gam.phase_1_extension_active}
        />

        {/* Row 1 — Greeting */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-secondary-fg">{greeting},</p>
            <h1 className="font-heading text-3xl md:text-[32px] font-bold text-foreground leading-tight">
              {firstName}.
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StreakBadge
              streak={gam.streak_count}
              freezeAvailable={gam.streak_freeze_available}
              onClick={() => setShowStreakHistory(true)}
            />
            <span className="text-[11px] text-secondary-fg">
              {gam.streak_count === 1
                ? "1-day Reversal Streak"
                : `${gam.streak_count}-day Reversal Streak`}
            </span>
            <LevelBadge level={gam.level} />
          </div>
        </div>

        <StreakHistoryModal
          open={showStreakHistory}
          onClose={() => setShowStreakHistory(false)}
          currentStreak={gam.streak_count}
          freezeAvailable={gam.streak_freeze_available}
          startDate={gam.last_ring_close_at}
          history={gam.streak_history}
        />

        {/* Row 2 — Habit rings (hero treatment) */}
        <div className="grid grid-cols-4 gap-3 sm:gap-4 place-items-center">
          {(
            [
              ["water", habitData.water],
              ["food", habitData.food],
              ["exercise", habitData.exercise],
              ["mindset", habitData.mindset],
            ] as const
          ).map(([habit, d], i) => (
            <div key={habit}>
              {/* Mobile: 88, Desktop md+: 112 */}
              <div className="md:hidden">
                <HabitRing habit={habit} {...d} size={88} delayMs={i * 100} />
              </div>
              <div className="hidden md:block">
                <HabitRing habit={habit} {...d} size={112} delayMs={i * 100} />
              </div>
            </div>
          ))}
        </div>

        {/* Row 3 — Today's action card */}
        {action ? (
          <div
            className={`rounded-xl border-[1.5px] p-6 shadow-warm transition-colors ${
              actionDoneToday
                ? "bg-primary-muted border-primary"
                : "bg-accent-muted border-accent/60"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="label-caps text-accent">Today's Action</p>
              <span className="flex items-center gap-2 text-[12px] text-tertiary-fg">
                Day {currentProgramDay} of {phase.end}
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
          <div className="bg-card border border-border rounded-xl p-6 shadow-warm">
            <p className="label-caps text-tertiary-fg mb-2">Today's Action</p>
            <p className="text-sm text-secondary-fg">
              Your next action will appear here as the program advances.
            </p>
          </div>
        )}

        {/* Row 4 — Journey track */}
        <JourneyTrack
          currentDay={currentDayInPhase}
          totalDays={phase.total}
          phaseName={phase.name}
          phaseIndex={phase.index}
          phaseTotal={PHASE_TOTAL}
        />

        {/* Row 5 — Quick stats */}
        <QuickStats stats={stats} />

        {/* Row 6 — VITA quote (in-column below lg; moves to right rail at lg) */}
        <div className="lg:hidden">
          <VitaQuoteCard quotes={quoteItems} />
        </div>

        {/* Daily habit logging (Section 9) */}
        <HabitLogging currentProgramDay={currentProgramDay} />

        {/* Getting Started checklist (Days 1–29 only) */}
        <GettingStartedChecklist currentProgramDay={currentProgramDay} />

        <p className="text-[11px] text-tertiary-fg text-center pt-2">
          Educational only — not medical advice. Always consult your healthcare provider.
        </p>
      </div>

      {/* Right rail — xl only, sticky */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 space-y-4">
          <VitaQuoteCard quotes={quoteItems} />
          <StreakMiniWidget
            streak={gam.streak_count}
            history={gam.streak_history}
            freezeAvailable={gam.streak_freeze_available}
            onOpen={() => setShowStreakHistory(true)}
          />
          <UpcomingActions actions={upcoming} />
        </div>
      </aside>
    </div>
  );
}

function StreakMiniWidget({
  streak,
  history,
  freezeAvailable,
  onOpen,
}: {
  streak: number;
  history: { start: string; end: string; length: number }[];
  freezeAvailable: boolean;
  onOpen: () => void;
}) {
  const recent = history.slice(0, 5);
  const best = history.reduce((m, h) => Math.max(m, h.length), streak);
  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-card border border-border rounded-xl p-4 shadow-warm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="label-caps text-tertiary-fg">Streak</p>
        {freezeAvailable && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
            Freeze ready
          </span>
        )}
      </div>
      <p className="font-heading text-2xl font-bold text-foreground">🔥 {streak}</p>
      <p className="text-[11px] text-secondary-fg mt-1">Best: {best} days</p>
      {recent.length > 0 && (
        <div className="mt-3 space-y-1">
          {recent.map((h, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] text-secondary-fg">
              <span>
                {new Date(h.start).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                {" – "}
                {new Date(h.end).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
              <span className="font-medium">{h.length}d</span>
            </div>
          ))}
        </div>
      )}
      {recent.length === 0 && (
        <p className="text-[11px] text-tertiary-fg mt-3">
          Your streak history builds as you close daily rings.
        </p>
      )}
    </button>
  );
}

function UpcomingActions({ actions }: { actions: DailyAction[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-warm">
      <p className="label-caps text-tertiary-fg mb-3">Coming up</p>
      <div className="space-y-3">
        {actions.map((a) => (
          <div key={a.id} className="flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 text-tertiary-fg mt-1 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-[11px] text-accent font-medium">Day {a.day_number}</p>
              <p className="text-sm text-foreground font-medium leading-snug truncate">
                {a.action_title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
