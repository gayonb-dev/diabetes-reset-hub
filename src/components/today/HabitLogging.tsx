import { useMemo, useState, useEffect, useRef } from "react";
import { useDailyHabits } from "@/hooks/useDailyHabits";
import { phaseFor } from "@/lib/phase";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useGamification } from "@/hooks/useGamification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Check, X, Droplet, Apple, Cookie, Footprints, Brain, Smile, Dumbbell } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { SearchSheet, SearchSheetOption } from "@/components/ui/search-sheet";
import { useFastingProfile } from "@/hooks/useFastingProfile";
import { scheduleForProfile, hasSnacks, SNACK_TIMING_COPY, NO_SNACK_COPY } from "@/lib/mealTiming";


interface Props {
  currentProgramDay: number;
}

const MEAL_LABEL: Record<"breakfast" | "lunch" | "dinner", string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const CUSTOM_SNACK = "__custom_snack__";

const SNACK_LABEL: Record<"snack_1" | "snack_2", string> = {
  snack_1: "Mid-morning snack",
  snack_2: "Afternoon snack",
};

const WALK_LABEL: Record<"after_breakfast" | "after_lunch" | "after_dinner", string> = {
  after_breakfast: "After breakfast",
  after_lunch: "After lunch",
  after_dinner: "After dinner",
};

const MOOD_EMOJI = ["😔", "😐", "🙂", "😄", "💪"];

function Section({
  icon: Icon,
  title,
  status,
  open,
  onToggle,
  children,
  iconColor,
}: {
  icon: typeof Droplet;
  title: string;
  status?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  iconColor: string;
}) {
  return (
    <Card className="overflow-hidden border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="w-full min-h-[52px] flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
          <div>
            <p className="font-medium text-foreground">{title}</p>
            {status && <p className="text-xs text-tertiary-fg mt-0.5">{status}</p>}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-tertiary-fg" /> : <ChevronDown className="h-4 w-4 text-tertiary-fg" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-border">{children}</div>}
    </Card>
  );
}

export default function HabitLogging({ currentProgramDay }: Props) {
  const { user } = useAuth();
  const location = useLocation();
  const h = useDailyHabits();
  const { recordAction } = useGamification();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [weightLb, setWeightLb] = useState<number>(180);
  const [lowersMeds, setLowersMeds] = useState(false);
  const [customOz, setCustomOz] = useState("");
  const [snackOverflow, setSnackOverflow] = useState<null | "snack_3">(null);
  const isMobile = useIsMobile();
  const [snackSheetSlot, setSnackSheetSlot] = useState<"snack_1" | "snack_2" | null>(null);
  const [snackOptions, setSnackOptions] = useState<SearchSheetOption[]>([]);
  const [customSnackSlot, setCustomSnackSlot] = useState<"snack_1" | "snack_2" | null>(null);
  const [customSnackText, setCustomSnackText] = useState("");

  // Deep-link from Dashboard water tile: /app/today#water-logging
  useEffect(() => {
    if (location.hash !== "#water-logging") return;
    setOpenKey("water");
    const el = document.getElementById("water-logging");
    if (el) {
      // Slight delay so the section can expand before we scroll.
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    }
  }, [location.hash]);


  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("visitor_profiles")
        .select("metadata, lowers_blood_sugar_meds")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setLowersMeds(!!data.lowers_blood_sugar_meds);
        const meta = (data.metadata as { weight?: number; weight_unit?: string }) ?? {};
        if (meta.weight) {
          const wLb = meta.weight_unit === "kg" ? meta.weight * 2.20462 : meta.weight;
          setWeightLb(wLb);
        }
      }
      // also pull canonical lb from latest health_logs
      const { data: hl } = await supabase
        .from("health_logs")
        .select("weight")
        .eq("user_id", user.id)
        .not("weight", "is", null)
        .order("log_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (hl?.weight) setWeightLb(Number(hl.weight));
    })();
  }, [user]);

  // Snack library options for the mobile searchable picker (M7).
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("snack_library" as never)
        .select("name, description, unlock_day")
        .order("sort_order", { ascending: true });
      const rows = (data as { name: string; description: string; unlock_day: number }[] | null) ?? [];
      setSnackOptions(
        rows
          .filter((r) => currentProgramDay >= r.unlock_day)
          .map((r) => ({ value: r.name, label: r.name, description: r.description }))
          .concat([
            {
              value: CUSTOM_SNACK,
              label: "Something else",
              description: "Type what you actually ate",
            },
          ]),
      );
    })();
  }, [currentProgramDay]);

  // Day 29+ workouts: count today's completed sessions, surface any paused.
  const [workoutsTodayCount, setWorkoutsTodayCount] = useState(0);
  const [pausedWorkout, setPausedWorkout] = useState<{ slug: string; name: string } | null>(null);
  useEffect(() => {
    if (!user || currentProgramDay < 29) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    supabase
      .from("workout_sessions")
      .select("id,workout_slug,workout_name,status,completed_at,started_at")
      .eq("user_id", user.id)
      .gte("started_at", start.toISOString())
      .order("started_at", { ascending: false })
      .then(({ data }) => {
        const rows = data || [];
        setWorkoutsTodayCount(rows.filter((r) => r.status === "completed").length);
        const paused = rows.find((r) => r.status === "paused" || r.status === "in_progress");
        setPausedWorkout(paused ? { slug: paused.workout_slug, name: paused.workout_name } : null);
      });
  }, [user, currentProgramDay, h.mood, h.mindsetRead]);

  const waterTarget = Math.max(64, Math.round(weightLb / 2));
  const toggle = (k: string) => setOpenKey((p) => (p === k ? null : k));

  const mealsDone = useMemo(() => {
    return (["breakfast", "lunch", "dinner"] as const).filter(
      (mt) => h.meals[mt].vegetables && h.meals[mt].protein && h.meals[mt].complex_carbs,
    ).length;
  }, [h.meals]);

  // Wire gamify pipeline: fires log_water once per day when target hit; log_meal
  // each time a plate-method meal transitions to fully-complete.
  const waterAwardedRef = useRef(false);
  const mealsAwardedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!waterAwardedRef.current && waterTarget > 0 && h.waterOz >= waterTarget) {
      waterAwardedRef.current = true;
      recordAction("log_water").catch(() => {});
    }
  }, [h.waterOz, waterTarget, recordAction]);
  useEffect(() => {
    (["breakfast", "lunch", "dinner"] as const).forEach((mt) => {
      const m = h.meals[mt];
      const complete = m.vegetables && m.protein && m.complex_carbs;
      if (complete && !mealsAwardedRef.current.has(mt)) {
        mealsAwardedRef.current.add(mt);
        recordAction("log_meal").catch(() => {});
      }
    });
  }, [h.meals, recordAction]);

  // complete_lesson when mindset ring closes for the day.
  const mindsetAwardedRef = useRef(false);
  useEffect(() => {
    if (h.mindsetRead && !mindsetAwardedRef.current) {
      mindsetAwardedRef.current = true;
      recordAction("complete_lesson").catch(() => {});
    }
  }, [h.mindsetRead, recordAction]);

  const walksDone = (["after_breakfast", "after_lunch", "after_dinner"] as const).filter(
    (s) => h.walks[s],
  ).length;

  const showExercise = currentProgramDay >= 15;
  const phase = phaseFor(currentProgramDay).index;


  return (
    <div className="space-y-3">
      <h2 className="font-heading text-lg font-semibold text-foreground">Today's logging</h2>

      {/* WATER */}
      <div id="water-logging" className="scroll-mt-20">
        <Section
          icon={Droplet}
          title="Water"
          iconColor="hsl(var(--ring-water))"
          status={`${h.waterOz}oz / ${waterTarget}oz${h.waterStreak > 1 ? `  ·  💧 ${h.waterStreak}-day streak` : ""}`}
          open={openKey === "water"}
          onToggle={() => toggle("water")}
        >
          <div className="flex flex-wrap gap-2 mt-3">
            {[8, 12, 16].map((oz) => (
              <Button key={oz} variant="outline" size="sm" onClick={() => h.addWater(oz)}>
                +{oz}oz
              </Button>
            ))}
            <Input
              placeholder="Custom oz"
              type="number"
              inputMode="decimal"
              className="w-28 h-9"
              value={customOz}
              onChange={(e) => setCustomOz(e.target.value)}
            />
            <Button
              size="sm"
              onClick={() => {
                const v = parseInt(customOz);
                if (v > 0) {
                  h.addWater(v);
                  setCustomOz("");
                }
              }}
            >
              Add
            </Button>
          </div>
          <p className="text-xs text-tertiary-fg mt-3">
            Your target: {waterTarget}oz — about half your body weight in ounces, with a 64oz minimum.
          </p>
        </Section>
      </div>


      {/* MEALS */}
      <Section
        icon={Apple}
        title="Meals"
        iconColor="hsl(var(--ring-food))"
        status={`${mealsDone} / 3 plate-method meals`}
        open={openKey === "meals"}
        onToggle={() => toggle("meals")}
      >
        <div className="space-y-3 mt-3">
          {(["breakfast", "lunch", "dinner"] as const).map((mt) => {
            const m = h.meals[mt];
            const all = m.vegetables && m.protein && m.complex_carbs;
            return (
              <div
                key={mt}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  all ? "border-primary border-2 bg-primary-muted" : "border-border bg-card",
                )}
              >
                <p className="text-sm font-medium text-foreground mb-2">{MEAL_LABEL[mt]}</p>
                {[
                  { k: "vegetables" as const, label: "Half plate: vegetables?" },
                  { k: "protein" as const, label: "Quarter plate: protein?" },
                  { k: "complex_carbs" as const, label: "Quarter plate: complex carbs?" },
                ].map(({ k, label }) => (
                  <div key={k} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-secondary-fg">{label}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => h.saveMeal(mt, { [k]: true } as Partial<typeof m>)}
                        className={cn(
                          "h-8 w-8 rounded-md border flex items-center justify-center",
                          m[k] ? "bg-primary border-primary text-primary-foreground" : "border-border",
                        )}
                        aria-label={`${label} yes`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => h.saveMeal(mt, { [k]: false } as Partial<typeof m>)}
                        className={cn(
                          "h-8 w-8 rounded-md border flex items-center justify-center",
                          m[k] === false
                            ? "bg-destructive/15 border-destructive/40 text-foreground"
                            : "border-border",
                        )}
                        aria-label={`${label} no`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <Input
                  placeholder="What did you eat? (optional)"
                  className="mt-2 text-sm"
                  value={m.free_text ?? ""}
                  onChange={(e) => h.saveMeal(mt, { free_text: e.target.value })}
                />
              </div>
            );
          })}
        </div>
      </Section>

      {/* SNACKS */}
      <Section
        icon={Cookie}
        title="Snacks"
        iconColor="hsl(var(--accent))"
        status={snacksScheduled ? SNACK_TIMING_COPY : "No snack needed today"}
        open={openKey === "snacks"}
        onToggle={() => toggle("snacks")}
      >
        <p className="text-xs text-tertiary-fg mt-3">{SNACK_TIMING_COPY}</p>
        {lowersMeds && (
          <p className="text-xs text-accent bg-accent-muted border border-accent/40 rounded-md p-2 mt-3">
            Note: skipping snacks while on medication that lowers blood sugar can cause levels to drop. Check
            with your doctor about what spacing is right for you.
          </p>
        )}
        {!snacksScheduled && (
          <p className="text-xs text-muted-foreground mt-3">{NO_SNACK_COPY}</p>
        )}
        {snacksScheduled && (
        <div className="grid sm:grid-cols-2 gap-3 mt-4">

          {(["snack_1", "snack_2"] as const).map((slot) => {
            const s = h.snacks[slot];
            return (
              <div key={slot} className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium">{SNACK_LABEL[slot]}</p>
                {isMobile ? (
                  <button
                    type="button"
                    onClick={() => setSnackSheetSlot(slot)}
                    className="mt-2 w-full h-11 rounded-lg border border-border px-3 text-left text-sm text-foreground"
                  >
                    {s?.snack_name || <span className="text-muted-foreground">What did you eat?</span>}
                  </button>
                ) : (
                  <Input
                    placeholder="What did you eat?"
                    className="mt-2 text-sm"
                    value={s?.snack_name ?? ""}
                    onChange={(e) => h.setSnack(slot, { snack_name: e.target.value, eaten: true, eaten_at: new Date().toISOString() })}
                  />
                )}
                {customSnackSlot === slot && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      autoFocus
                      placeholder="What did you eat?"
                      className="text-sm"
                      value={customSnackText}
                      onChange={(e) => setCustomSnackText(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const v = customSnackText.trim();
                        if (!v) return;
                        h.setSnack(slot, {
                          snack_name: v,
                          eaten: true,
                          eaten_at: new Date().toISOString(),
                        });
                        setCustomSnackText("");
                        setCustomSnackSlot(null);
                      }}
                    >
                      Save
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-tertiary-fg">
                    {s?.eaten === false ? "Skipped today" : s?.eaten ? "Logged" : "Not yet"}
                  </span>
                  <button
                    className="text-tertiary-fg underline"
                    onClick={() => h.setSnack(slot, { eaten: false, snack_name: null, eaten_at: null })}
                  >
                    Skip today
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}
        {snacksScheduled && (
        <div className="mt-3">
          <button
            className="text-xs text-accent underline"
            onClick={() => setSnackOverflow("snack_3")}
          >
            Add another snack
          </button>
          {snackOverflow === "snack_3" && (
            <p className="text-xs text-accent bg-accent-muted border border-accent/40 rounded-md p-2 mt-2">
              VITA says: You're at your two-snack limit for today. Worth knowing — the timing matters more than
              you think.
            </p>
          )}
        </div>
        )}

        <SearchSheet
          open={snackSheetSlot != null}
          onOpenChange={(o) => !o && setSnackSheetSlot(null)}
          title="Choose a snack"
          options={snackOptions}
          value={snackSheetSlot ? h.snacks[snackSheetSlot]?.snack_name ?? undefined : undefined}
          onSelect={(v) => {
            if (!snackSheetSlot) return;
            if (v === CUSTOM_SNACK) {
              setCustomSnackText(h.snacks[snackSheetSlot]?.snack_name ?? "");
              setCustomSnackSlot(snackSheetSlot);
              return;
            }
            h.setSnack(snackSheetSlot, { snack_name: v, eaten: true, eaten_at: new Date().toISOString() });
          }}
          searchPlaceholder="Search snacks…"
        />
      </Section>

      {/* EXERCISE */}
      {showExercise && (
        <Section
          icon={phase === 2 ? Footprints : Dumbbell}
          title={phase === 2 ? "Post-meal walks" : "Exercise"}
          iconColor="hsl(var(--ring-exercise))"
          status={
            phase === 2
              ? `${walksDone} / 3 walks`
              : workoutsTodayCount > 0
                ? `${workoutsTodayCount} workout${workoutsTodayCount > 1 ? "s" : ""} logged ✓`
                : "Tap to start"
          }
          open={openKey === "exercise"}
          onToggle={() => toggle("exercise")}
        >
          {phase === 2 ? (
            <div className="space-y-2 mt-3">
              {(["after_breakfast", "after_lunch", "after_dinner"] as const).map((slot) => {
                const done = h.walks[slot];
                return (
                  <button
                    key={slot}
                    onClick={() => h.toggleWalk(slot)}
                    className={cn(
                      "w-full min-h-[52px] text-left rounded-lg border p-3 flex items-center justify-between",
                      done ? "bg-primary border-primary text-primary-foreground" : "bg-primary-muted border-transparent text-foreground",
                    )}
                  >
                    <span className="text-sm">{WALK_LABEL[slot]}</span>
                    {done && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {pausedWorkout && (
                <Link
                  to={`/app/workouts/${pausedWorkout.slug}?resume=1`}
                  className="block rounded-lg border border-accent/50 bg-accent-muted/40 p-3 text-sm"
                >
                  <p className="font-medium text-foreground">
                    Resume {pausedWorkout.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Pick up where you left off.</p>
                </Link>
              )}
              <Button asChild className="w-full bg-primary hover:bg-primary-hover text-primary-foreground">
                <Link to="/app/workouts">
                  {workoutsTodayCount > 0 ? "Start another workout" : "Begin today's workout"}
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Aim for 3 sessions/week. Standard or Knee-Friendly track — pick what fits.
              </p>
            </div>
          )}
        </Section>
      )}

      {/* MINDSET */}
      <Section
        icon={Brain}
        title="Mindset"
        iconColor="hsl(var(--ring-mindset))"
        status={h.mindsetRead ? "Read ✓" : "Read today's quote"}
        open={openKey === "mindset"}
        onToggle={() => toggle("mindset")}
      >
        <MindsetCard read={h.mindsetRead} onRead={h.markMindsetRead} />
        <div className="mt-4">
          <p className="text-xs text-tertiary-fg mb-2 flex items-center gap-1.5">
            <Smile className="h-3.5 w-3.5" /> How are you feeling? (optional)
          </p>
          <div className="flex gap-2">
            {MOOD_EMOJI.map((e, i) => (
              <button
                key={i}
                onClick={() => h.setMood(i + 1)}
                className={cn(
                  "h-10 w-10 rounded-full text-xl border transition-colors",
                  h.mood === i + 1 ? "bg-primary-muted border-primary" : "border-border hover:border-primary/40",
                )}
                aria-label={`Mood ${i + 1}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}

function MindsetCard({ read, onRead }: { read: boolean; onRead: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (read) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [read]);
  const canRead = elapsed >= 30 || read;
  return (
    <div className="rounded-xl border border-border bg-primary-muted p-4 mt-3">
      <p className="text-sm text-foreground leading-relaxed italic">
        "Progress is not linear. Trust the trend, not the day. The body you're rebuilding doesn't care about a
        single reading — it responds to consistency."
      </p>
      <Button
        size="sm"
        className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground"
        disabled={!canRead}
        onClick={onRead}
      >
        {read ? "Read ✓" : canRead ? "I read this" : `I read this (${30 - elapsed}s)`}
      </Button>
    </div>
  );
}
