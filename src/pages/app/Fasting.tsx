import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Timer, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EmptyState from "@/components/ui/empty-state";
import { useFastingProfile } from "@/hooks/useFastingProfile";
import FastingScreening from "@/components/safety/FastingScreening";
import FastingTargetCard from "@/components/fasting/FastingTargetCard";
import LowBloodSugarCard from "@/components/fasting/LowBloodSugarCard";
import FastingTimeline from "@/components/fasting/FastingTimeline";
import WindowCountdown from "@/components/fasting/WindowCountdown";
import { formatHour, rampStatus } from "@/lib/mealTiming";

type WindowType = "14_10" | "16_8" | "12_12";
type Status = "active" | "completed" | "broken";

interface Fast {
  id: string;
  fast_start_at: string;
  fast_end_at: string | null;
  planned_duration_hours: number;
  actual_duration_hours: number | null;
  window_type: WindowType;
  status: Status;
  notes: string | null;
}

const VITA_MESSAGES = [
  "You're not hungry, you're healing.",
  "Each hour you fast, your insulin levels drop further.",
  "Drink water. The thirst signal often masks as hunger.",
  "Past hour 12, your body shifts into fat-burning mode.",
  "You're rewriting your metabolic story right now.",
  "Trust the process — your cells are doing the work.",
];

function fmt(seconds: number) {
  const sign = seconds < 0 ? "-" : "";
  const s = Math.abs(Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function windowLabel(w: WindowType) {
  if (w === "14_10") return "14:10 (14-hour fast, 10-hour eating window)";
  if (w === "16_8") return "16:8 (16-hour fast, 8-hour eating window)";
  return "12:12 (12-hour fast, 12-hour eating window)";
}

export default function Fasting() {
  const { user } = useAuth();
  const [active, setActive] = useState<Fast | null>(null);
  const [history, setHistory] = useState<Fast[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [windowChoice, setWindowChoice] = useState<WindowType>("14_10");
  const [showRules, setShowRules] = useState(false);
  const fp = useFastingProfile();
  const [showLowBs, setShowLowBs] = useState(false);

  const refresh = async () => {
    if (!user) return;
    const sb: any = supabase;
    const { data } = await sb
      .from("if_fasting_log")
      .select("*")
      .eq("member_id", user.id)
      .order("fast_start_at", { ascending: false })
      .limit(15);
    const arr = (data || []) as Fast[];
    const a = arr.find((f) => f.status === "active") || null;
    setActive(a);
    if (a) setWindowChoice(a.window_type);
    setHistory(arr.filter((f) => f.status !== "active"));
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const startFast = async () => {
    if (!user) return;
    setBusy(true);
    const hours = windowChoice === "16_8" ? 16 : windowChoice === "12_12" ? 12 : 14;
    const sb: any = supabase;
    const { error } = await sb.from("if_fasting_log").insert({
      member_id: user.id,
      fast_start_at: new Date().toISOString(),
      planned_duration_hours: hours,
      window_type: windowChoice,
      status: "active",
    });
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't start fast", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Fast started" });
    refresh();
  };

  const endFast = async (status: Status) => {
    if (!user || !active) return;
    setBusy(true);
    const startedMs = new Date(active.fast_start_at).getTime();
    const hours = (Date.now() - startedMs) / 3600000;
    const sb: any = supabase;
    const { error } = await sb
      .from("if_fasting_log")
      .update({
        fast_end_at: new Date().toISOString(),
        actual_duration_hours: Math.round(hours * 10) / 10,
        status,
      })
      .eq("id", active.id);
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't end fast", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "completed" ? "Fast completed" : "Fast ended early" });
    refresh();
  };

  const vitaMsg = useMemo(
    () => VITA_MESSAGES[Math.floor(now / 60000) % VITA_MESSAGES.length],
    [now],
  );

  // One-time low-blood-sugar card, the first time a fasting window activates.
  useEffect(() => {
    if (fp.loading || !fp.profile) return;
    const activated = !!active || !!fp.window;
    if (activated && !fp.profile.low_bs_card_seen_at) {
      setShowLowBs(true);
      fp.save({ low_bs_card_seen_at: new Date().toISOString() });
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [fp.loading, fp.profile?.low_bs_card_seen_at, fp.window, active]);

  if (loading || fp.loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  let fastingRemaining = 0;
  let eatingStartMs = 0;
  if (active) {
    const startMs = new Date(active.fast_start_at).getTime();
    eatingStartMs = startMs + active.planned_duration_hours * 3600000;
    fastingRemaining = Math.floor((eatingStartMs - now) / 1000);
  }
  const isFasting = !!active && fastingRemaining > 0;
  const isEatingWindow = !!active && fastingRemaining <= 0;

  const header = (
    <div>
      <h1 className="font-heading font-semibold text-2xl text-primary flex items-center gap-2">
        <Timer className="h-6 w-6" /> Intermittent Fasting
      </h1>
      <p className="text-sm text-muted-foreground">Window timer and history.</p>
    </div>
  );

  // Unscreened members see the screening itself here — never a dead end.
  if (fp.needsScreening) {
    return (
      <div className="space-y-5">
        {header}
        <p className="text-sm text-muted-foreground">
          Before fasting unlocks, we need a few answers about your medication and health. It takes a minute.
        </p>
        <FastingScreening onComplete={fp.reload} />
      </div>
    );
  }

  if (!fp.canFast) {
    return (
      <div className="space-y-5">
        {header}
        {fp.eligibility === "not_eligible" ? (
          <Card className="p-5 border-border rounded-xl shadow-warm">
            <p className="text-sm">
              Fasting isn't part of your plan, and it doesn't need to be. It's one optional tool among several —
              the plate method, post-meal walks, and consistent meal timing do the heavy lifting, and they're all
              still yours.
            </p>
          </Card>
        ) : (
          <FastingScreening onComplete={fp.reload} />
        )}
      </div>
    );
  }

  const ramp = rampStatus(fp.profile);

  return (
    <div className="space-y-5">
      {header}

      {showLowBs && <LowBloodSugarCard onDismiss={() => setShowLowBs(false)} />}

      {/* Current window + where they are in the ramp */}
      <Card className="p-5 border border-border rounded-xl shadow-warm space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="label-caps text-muted-foreground">Your window today</p>
            <p className="stat-value tabular-nums text-primary">
              {fp.window ? fp.window.label : "Not fasting"}
            </p>
          </div>
          {fp.window && (
            <p className="text-xs text-muted-foreground tabular-nums text-right">
              {formatHour(fp.window.startHour)} – {formatHour(fp.window.endHour % 24)}
            </p>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{ramp.description}</p>
        <FastingTimeline profile={fp.profile} window={fp.window} />
      </Card>

      {/* Countdown to the next window open or close */}
      {fp.window && (
        <Card className="p-6 border border-border rounded-xl shadow-warm">
          <WindowCountdown window={fp.window} />
          <div className="mt-4 rounded-lg bg-accent-muted px-3 py-2">
            <p className="text-[13px] text-accent">VITA says: {vitaMsg}</p>
          </div>
        </Card>
      )}

      <FastingTargetCard />

      {/* Optional manual fast log — kept for members who like to time a fast */}
      {active && (
        <Card className="p-5 border border-border rounded-xl shadow-warm">
          <p className="label-caps text-accent mb-1">Logged fast in progress</p>
          <p className="countdown-hero text-foreground tabular-nums">{fmt(fastingRemaining)}</p>
          <p className="text-xs text-secondary-fg mt-2">
            {fastingRemaining > 0 ? "Time remaining on this logged fast" : "Planned duration reached"}
          </p>
          <p className="text-xs text-tertiary-fg mt-2">{windowLabel(active.window_type)}</p>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => endFast("completed")}
              disabled={busy}
              className="flex-1 h-11 bg-primary hover:bg-primary/90"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark complete
            </Button>
            <Button variant="outline" className="h-11" disabled={busy} onClick={() => endFast("broken")}>
              End early
            </Button>
          </div>
        </Card>
      )}

      {/* Low blood sugar reference, always available here */}
      <LowBloodSugarCard dismissible={false} />




      {/* History */}
      <Card className="p-5 border border-border rounded-xl shadow-warm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">Recent fasts</p>
          {!active && (
            <button
              onClick={startFast}
              disabled={busy}
              className="text-primary text-xs underline min-h-11 inline-flex items-center px-2 -mx-2"
            >
              Log a fast now
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <EmptyState
            title="No fasts logged yet"
            description="Logging is optional — your window above runs whether you log or not."
            posture="encouraging"
            vitaSize={56}
          />
        ) : (

          <div className="divide-y divide-border">
            {history.slice(0, 7).map((f) => (
              <div key={f.id} className="py-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {new Date(f.fast_start_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span className="flex-1 text-center text-xs text-muted-foreground">
                  {f.planned_duration_hours}h planned · {f.actual_duration_hours ?? "—"}h actual
                </span>
                <span
                  className={`text-xs font-medium ${f.status === "completed" ? "text-status-normal" : "text-status-warning"}`}
                >
                  {f.status === "completed" ? "Completed" : "Broken"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Rules */}
      <Card className="p-4 border border-border">
        <button
          onClick={() => setShowRules((s) => !s)}
          className="text-sm font-medium text-foreground w-full text-left flex items-center justify-between"
        >
          IF rules & medical note
          <span className="text-tertiary-fg text-xs">{showRules ? "Hide" : "Show"}</span>
        </button>
        {showRules && (
          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
            <p>• Permitted during fast: water, plain tea, plain black coffee (nothing else).</p>
            <p>• Cheat meal rule: fast begins immediately after a cheat meal.</p>
            <div className="rounded-md bg-accent-muted px-3 py-2 flex gap-2">
              <AlertCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <p className="text-accent text-[12px]">
                If you are on insulin or medications that lower blood sugar, fasting requires your doctor's guidance.
                Do not fast without their approval.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
