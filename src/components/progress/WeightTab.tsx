import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EmptyState from "@/components/ui/empty-state";
import {
  getUnits,
  setUnits as persistUnits,
  WeightUnit,
  kgToLb,
  lbToKg,
  displayWeight,
  WEIGHT_RANGE_LB,
} from "@/lib/units";
import { useGamification } from "@/hooks/useGamification";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface Log {
  id: string;
  log_date: string;
  weight: number | null;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function WeightTab() {
  const { user } = useAuth();
  const { recordAction } = useGamification();
  const initial = getUnits();
  const [unit, setUnit] = useState<WeightUnit>(initial.weight);
  const [logs, setLogs] = useState<Log[]>([]);
  const [weight, setWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState<string>(
    () => localStorage.getItem("drm:goal-weight-lb") ?? "",
  );
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("health_logs")
      .select("id, log_date, weight")
      .eq("user_id", user.id)
      .not("weight", "is", null)
      .order("log_date", { ascending: false })
      .limit(180);
    setLogs((data || []) as Log[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const sorted = useMemo(() => [...logs].reverse(), [logs]);
  const startWeight = sorted[0]?.weight ?? null;
  const currentWeight = sorted[sorted.length - 1]?.weight ?? null;
  const pctChange =
    startWeight && currentWeight
      ? ((currentWeight - startWeight) / startWeight) * 100
      : null;

  const save = async () => {
    if (!user) return;
    setErr(null);
    const v = parseFloat(weight);
    if (isNaN(v)) {
      setErr("Enter a number.");
      return;
    }
    const lb = unit === "kg" ? kgToLb(v) : v;
    if (lb < WEIGHT_RANGE_LB.min || lb > WEIGHT_RANGE_LB.max) {
      setErr("That weight seems outside the expected range.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("health_logs").upsert(
      { user_id: user.id, log_date: todayISO(), weight: lb },
      { onConflict: "user_id,log_date" },
    );
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Weight saved" });
    setWeight("");
    await recordAction("log_weight");
    refresh();
  };

  function saveGoal(v: string) {
    setGoalWeight(v);
    const n = parseFloat(v);
    if (!isNaN(n)) {
      const lb = unit === "kg" ? kgToLb(n) : n;
      localStorage.setItem("drm:goal-weight-lb", String(lb));
    } else {
      localStorage.removeItem("drm:goal-weight-lb");
    }
  }

  const goalLb = parseFloat(localStorage.getItem("drm:goal-weight-lb") || "");

  const latest = logs[0];
  const latestDisplay = latest
    ? unit === "kg"
      ? (Math.round(lbToKg(latest.weight!) * 10) / 10).toString()
      : (Math.round(latest.weight! * 10) / 10).toString()
    : null;

  return (
    <div className="space-y-5">
      {latest && (
        <Card className="p-5 border border-border rounded-xl shadow-warm">
          <p className="stat-label mb-2">Current weight</p>
          <p className="metric-hero text-foreground flex items-baseline flex-wrap">
            <span>{latestDisplay}</span>
            <span className="stat-unit">{unit}</span>
          </p>
          <p className="text-[12px] text-tertiary-fg mt-2">
            Logged {new Date(latest.log_date).toLocaleDateString()}
          </p>
        </Card>
      )}

      <Card className="p-5 border border-border">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">Log today's weight</p>
          <div className="flex gap-1.5 text-xs">
            <button
              className={`px-2.5 py-1 rounded-full border ${unit === "lb" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
              onClick={() => { setUnit("lb"); persistUnits({ weight: "lb" }); }}
            >
              lb
            </button>
            <button
              className={`px-2.5 py-1 rounded-full border ${unit === "kg" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
              onClick={() => { setUnit("kg"); persistUnits({ weight: "kg" }); }}
            >
              kg
            </button>
          </div>
        </div>
        <Input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder={unit === "kg" ? "e.g. 82.5" : "e.g. 182"}
          className="h-12 text-xl text-center"
        />
        {err && <p className="text-xs text-destructive mt-2">{err}</p>}
        <div className="mt-4">
          <Label className="text-xs text-muted-foreground">Goal weight ({unit}) — optional</Label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={goalWeight}
            onChange={(e) => saveGoal(e.target.value)}
            placeholder={unit === "kg" ? "e.g. 75" : "e.g. 165"}
          />
        </div>
        <Button
          onClick={save}
          disabled={saving}
          className="mt-4 w-full h-[52px] bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save weight
        </Button>
      </Card>

      {startWeight && currentWeight && pctChange !== null && sorted.length >= 2 && (
        <Card className="p-5 border border-border bg-primary-muted">
          <p className="text-[11px] uppercase tracking-wider text-primary mb-1">Progress</p>
          <p className="text-2xl font-bold text-primary">
            {pctChange < 0 ? "↓" : "↑"} {Math.abs(pctChange).toFixed(1)}% from your starting weight
          </p>
          <p className="text-xs text-secondary-fg mt-1">
            Start: {displayWeight(startWeight, unit)} · Now: {displayWeight(currentWeight, unit)}
          </p>
        </Card>
      )}

      {sorted.length >= 2 ? (
        <Card className="p-5 border border-border">
          <p className="text-sm font-medium mb-3">Weight trend</p>
          <WeightChart logs={sorted} goalLb={isNaN(goalLb) ? null : goalLb} unit={unit} />
        </Card>
      ) : (
        <Card className="p-5 border border-border bg-muted/20">
          <EmptyState
            title="No weigh-ins yet"
            description="First weigh-in sets the baseline. The trend does the talking."
            posture="encouraging"
          />
        </Card>
      )}

      <Card className="p-5 border border-border">
        <p className="text-sm font-medium text-foreground mb-3">Recent entries</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No weigh-ins yet"
            description="First weigh-in sets the baseline. The trend does the talking."
            posture="encouraging"
          />
        ) : (
          <div className="divide-y divide-border">
            {logs.slice(0, 14).map((l) => (
              <div key={l.id} className="py-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {new Date(l.log_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span className="font-medium">{displayWeight(l.weight!, unit)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function WeightChart({ logs, goalLb, unit }: { logs: Log[]; goalLb: number | null; unit: WeightUnit }) {
  const data = logs.map((l) => ({
    date: new Date(l.log_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    weight: unit === "kg" ? Math.round(lbToKg(l.weight!) * 10) / 10 : Math.round(l.weight! * 10) / 10,
  }));
  const goalDisplay = goalLb != null ? (unit === "kg" ? Math.round(lbToKg(goalLb) * 10) / 10 : Math.round(goalLb * 10) / 10) : null;

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} minTickGap={20} label={{ value: "Date", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={36} domain={["dataMin - 2", "dataMax + 2"]} label={{ value: unit === "kg" ? "kg" : "lb", angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(v: number) => [`${v} ${unit === "kg" ? "kg" : "lb"}`, "Weight"]}
            labelFormatter={(l) => `Date: ${l}`}
          />
          {goalDisplay != null && (
            <ReferenceLine y={goalDisplay} stroke="hsl(var(--accent))" strokeDasharray="4 4" label={{ value: `Goal ${goalDisplay}`, fill: "hsl(var(--accent))", fontSize: 10, position: "insideTopRight" }} />
          )}
          <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} isAnimationActive={true} animationDuration={800} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
