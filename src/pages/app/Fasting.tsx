import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Timer, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EmptyState from "@/components/ui/empty-state";

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

  if (loading) {
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-semibold text-2xl text-primary flex items-center gap-2">
          <Timer className="h-6 w-6" /> Intermittent Fasting
        </h1>
        <p className="text-sm text-muted-foreground">Window timer and history.</p>
      </div>

      {/* Status card */}
      {!active && (
        <Card className="p-6 border border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">No fast in progress</p>
          <p className="text-sm text-muted-foreground mb-4">Choose your window and begin a fast when ready.</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(["14_10", "16_8", "12_12"] as WindowType[]).map((w) => (
              <button
                key={w}
                onClick={() => setWindowChoice(w)}
                className={`py-2 rounded-md border text-sm font-medium ${windowChoice === w ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
              >
                {w.replace("_", ":")}
              </button>
            ))}
          </div>
          <Button onClick={startFast} disabled={busy} className="w-full h-[52px] bg-primary hover:bg-primary/90">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Begin fast now
          </Button>
        </Card>
      )}

      {isFasting && (
        <Card className="p-6 border border-border">
          <p className="text-xs uppercase tracking-wider text-accent font-medium mb-1">Fasting</p>
          <p className="text-5xl font-bold tabular-nums text-foreground tracking-tight">
            {fmt(fastingRemaining)}
          </p>
          <p className="text-xs text-secondary-fg mt-1">Time remaining until eating window opens</p>
          <div className="mt-4 space-y-1 text-xs">
            <p className="text-tertiary-fg">Fast started: {new Date(active!.fast_start_at).toLocaleString()}</p>
            <p className="text-status-normal">Eating window opens: {new Date(eatingStartMs).toLocaleTimeString()}</p>
          </div>
          <div className="mt-4 rounded-md bg-accent-muted px-3 py-2">
            <p className="text-[13px] text-accent">VITA says: {vitaMsg}</p>
          </div>
          <button
            onClick={() => {
              const hrs = Math.floor((Date.now() - new Date(active!.fast_start_at).getTime()) / 3600000);
              if (confirm(`End your fast now? You've completed ${hrs} hour${hrs === 1 ? "" : "s"}.`)) endFast("broken");
            }}
            className="text-accent text-sm mt-4 underline"
          >
            End fast early
          </button>
        </Card>
      )}

      {isEatingWindow && (
        <Card className="p-6 border border-border">
          <p className="text-xs uppercase tracking-wider text-status-normal font-medium mb-1">Eating window</p>
          <p className="text-5xl font-bold tabular-nums text-status-normal tracking-tight">
            {fmt(-fastingRemaining)}
          </p>
          <p className="text-xs text-secondary-fg mt-1">Since your eating window opened</p>
          <p className="text-xs text-tertiary-fg mt-2">{windowLabel(active!.window_type)}</p>
          <Button
            onClick={() => endFast("completed")}
            disabled={busy}
            className="mt-4 w-full h-[52px] bg-primary hover:bg-primary/90"
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mark fast complete
          </Button>
        </Card>
      )}

      {/* Today's eating schedule */}
      {active && eatingStartMs > 0 && (
        <Card className="p-5 border border-border">
          <p className="text-sm font-medium mb-3">Today's eating schedule</p>
          <div className="space-y-2 text-sm">
            {[
              ["Meal 1 (break fast)", 0],
              ["Snack 1", 2.5],
              ["Meal 2", 4],
              ["Snack 2", 6.5],
              ["Fast begins", 24 - active.planned_duration_hours],
            ].map(([label, offset]) => (
              <div key={label as string} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">
                  {new Date(eatingStartMs + (offset as number) * 3600000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* History */}
      <Card className="p-5 border border-border">
        <p className="text-sm font-medium mb-3">Recent fasts</p>
        {history.length === 0 ? (
          <EmptyState
            title="No fasts logged yet"
            description="Start your first fast above. Your history will build here as you go."
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
