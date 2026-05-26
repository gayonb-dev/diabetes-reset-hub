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

type DayContent = { title: string; teaser: string };

const FALLBACK_DAYS: Record<number, DayContent> = {
  1: { title: "Hydration Reset", teaser: "One glass of water before each meal. That's the whole assignment." },
  2: { title: "Plate Method Basics", teaser: "Build one plate today: ½ veg, ¼ protein, ¼ slow carbs." },
  3: { title: "Protein First", teaser: "Eat protein before carbohydrates at every meal. It lowers your post-meal spike — and it works immediately." },
  4: { title: "Sugar Audit", teaser: "Read the label on three things you eat regularly. Just notice." },
  5: { title: "Movement Snacks", teaser: "A 5-minute walk after your biggest meal." },
  6: { title: "Consolidation", teaser: "Library unlocks today. Pick one recipe that fits your life." },
  7: { title: "Reflect & Plan", teaser: "Write one commitment for next week." },
};

const VITA_TIPS = [
  "Three days in. Your blood sugar is already responding. This is the part most people never reach.",
  "Hydration first. Most cravings are dehydration in disguise.",
  "A short walk after eating moves glucose into your muscles, not your bloodstream.",
  "Progress is not linear. Trust the trend, not the day.",
  "You're not on a diet. You're rebuilding how your body handles fuel.",
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function Dashboard() {
  const { user, subscription } = useAuth();
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [resetDays, setResetDays] = useState<Record<number, DayContent>>({});

  useEffect(() => {
    if (!user) return;
    supabase
      .from("member_progress")
      .select("day_number")
      .eq("user_id", user.id)
      .then(({ data }) => setCompleted(new Set((data || []).map((r) => r.day_number))));

    supabase
      .from("content_items")
      .select("day_unlock, title, summary")
      .eq("type", "reset_day")
      .eq("is_active", true)
      .then(({ data }) => {
        const map: Record<number, DayContent> = {};
        (data || []).forEach((r: any) => {
          if (r.day_unlock >= 1 && r.day_unlock <= 7) {
            map[r.day_unlock] = { title: r.title, teaser: r.summary || "" };
          }
        });
        setResetDays(map);
      });
  }, [user]);

  const memberDay = useMemo(() => {
    const start = subscription?.created_at ? new Date(subscription.created_at) : new Date();
    const diff = Math.floor(
      (startOfDay(new Date()).getTime() - startOfDay(start).getTime()) / 86400000,
    );
    return Math.min(Math.max(diff + 1, 1), 14);
  }, [subscription]);

  const sprintDay = Math.min(memberDay, 7);
  const todays = resetDays[sprintDay] || FALLBACK_DAYS[sprintDay];
  const sprintDone = completed.size >= 7;
  const actionDoneToday = completed.has(sprintDay);

  // Derived first name from email until profile data lands
  const firstName = (user?.email?.split("@")[0] ?? "").replace(/[._-]/g, " ");
  const displayName = firstName
    ? firstName.charAt(0).toUpperCase() + firstName.slice(1)
    : "";

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  // Placeholder habit-ring data — wire to real logs in next phase.
  const habitData = {
    water: { value: 40, target: 72, unit: "oz" },
    food: { value: 2, target: 3, unit: "meals" },
    exercise: { value: 0, target: 1, unit: "session" },
    mindset: { value: 1, target: 1, unit: "" },
  };

  const stats = [
    { label: "Blood Sugar", value: null, unit: "mg/dL", emptyHint: "Tap to log", tone: "warning" as const },
    { label: "Water Today", value: habitData.water.value, unit: "oz", sub: `of ${habitData.water.target} oz`, tone: "water" as const },
    { label: "Last Weight", value: null, emptyHint: "Add weight", tone: "neutral" as const },
    { label: "Last A1C", value: null, emptyHint: "Enter A1C →", tone: "warning" as const },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Greeting row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-secondary-fg">{greeting},</p>
          <h1 className="font-heading text-3xl font-bold text-foreground leading-tight">
            {displayName || "friend"}.
          </h1>
        </div>
        <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap mt-1">
          Level 2: The Builder
        </span>
      </div>

      {/* Habit rings */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <HabitRing habit="water" {...habitData.water} />
        <HabitRing habit="food" {...habitData.food} />
        <HabitRing habit="exercise" {...habitData.exercise} />
        <HabitRing habit="mindset" {...habitData.mindset} />
      </div>

      {/* Today's action card */}
      {!sprintDone ? (
        <div
          className={`rounded-2xl border p-5 md:p-6 transition-colors ${
            actionDoneToday
              ? "bg-primary-muted border-primary"
              : "bg-accent-muted border-accent/50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="label-caps text-accent">Today's Action</p>
            <p className="text-[11px] text-secondary-fg">Day {sprintDay} of 14</p>
            {actionDoneToday && <CheckCircle2 className="h-4 w-4 text-primary" />}
          </div>
          <h2 className="font-heading text-xl md:text-2xl font-semibold mb-2 text-foreground">
            Day {sprintDay}: {todays.title}
          </h2>
          <p className="text-secondary-fg text-sm mb-4 leading-relaxed">{todays.teaser}</p>
          <Link to={`/app/day/${sprintDay}`}>
            <Button
              className="bg-primary hover:bg-primary-dark text-primary-foreground w-full sm:w-auto"
              disabled={actionDoneToday}
            >
              {actionDoneToday ? "Action completed ✓" : (
                <>
                  Open today's action <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-primary-muted border border-primary rounded-2xl p-5 md:p-6">
          <p className="label-caps text-primary mb-2">Sprint complete</p>
          <h2 className="font-heading text-xl font-semibold mb-2 text-foreground">
            Keep the rhythm going
          </h2>
          <p className="text-secondary-fg text-sm mb-4">
            Log today's numbers and browse the library when you have a question.
          </p>
          <Link to="/app/progress">
            <Button className="bg-primary hover:bg-primary-dark text-primary-foreground">
              Log today <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* Journey track */}
      <JourneyTrack currentDay={memberDay} totalDays={14} />

      {/* Quick stats */}
      <QuickStats stats={stats} />

      {/* VITA quote */}
      <VitaQuoteCard quotes={VITA_TIPS} />

      <p className="text-[11px] text-tertiary-fg text-center pt-2">
        Educational only — not medical advice. Always consult your healthcare provider.
      </p>
    </div>
  );
}
