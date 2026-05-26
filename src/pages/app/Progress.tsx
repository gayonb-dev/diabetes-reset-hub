import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getUnits,
  setUnits as persistUnits,
  WeightUnit,
  GlucoseUnit,
  kgToLb,
  lbToKg,
  mmollToMgdl,
  mgdlToMmoll,
  displayWeight,
  displayGlucose,
  GLUCOSE_RANGE_MGDL,
  WEIGHT_RANGE_LB,
} from "@/lib/units";
import { useGamification } from "@/hooks/useGamification";

interface Log {
  id: string;
  log_date: string;
  weight: number | null;
  blood_sugar: number | null;
  energy: number | null;
  notes: string | null;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ProgressPage() {
  const { user } = useAuth();
  const { recordAction } = useGamification();

  const initial = getUnits();
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(initial.weight);
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseUnit>(initial.glucose);

  const [logs, setLogs] = useState<Log[]>([]);
  const [weight, setWeight] = useState("");
  const [bs, setBs] = useState("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weightErr, setWeightErr] = useState<string | null>(null);
  const [bsErr, setBsErr] = useState<string | null>(null);

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("health_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("log_date", { ascending: false })
      .limit(30);
    const arr = (data || []) as Log[];
    setLogs(arr);
    const today = arr.find((l) => l.log_date === todayISO());
    if (today) {
      // Stored as canonical (lb / mg/dL); convert for display.
      if (today.weight != null) {
        const v = weightUnit === "kg" ? lbToKg(today.weight) : today.weight;
        setWeight(v.toFixed(1));
      }
      if (today.blood_sugar != null) {
        const v = glucoseUnit === "mmoll" ? mgdlToMmoll(today.blood_sugar) : today.blood_sugar;
        setBs(glucoseUnit === "mmoll" ? v.toFixed(1) : String(Math.round(v)));
      }
      setEnergy(today.energy);
      setNotes(today.notes ?? "");
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, weightUnit, glucoseUnit]);

  function setWeightUnitPersist(u: WeightUnit) {
    setWeightUnit(u);
    persistUnits({ weight: u });
  }
  function setGlucoseUnitPersist(u: GlucoseUnit) {
    setGlucoseUnit(u);
    persistUnits({ glucose: u });
  }

  const save = async () => {
    if (!user) return;
    setWeightErr(null);
    setBsErr(null);

    let weightLb: number | null = null;
    let bsMg: number | null = null;

    if (weight.trim()) {
      const v = parseFloat(weight);
      if (isNaN(v)) { setWeightErr("Enter a number."); return; }
      weightLb = weightUnit === "kg" ? kgToLb(v) : v;
      if (weightLb < WEIGHT_RANGE_LB.min || weightLb > WEIGHT_RANGE_LB.max) {
        setWeightErr("That weight seems outside the expected range — double-check.");
        return;
      }
    }

    if (bs.trim()) {
      const v = parseFloat(bs);
      if (isNaN(v)) { setBsErr("Enter a number."); return; }
      bsMg = glucoseUnit === "mmoll" ? mmollToMgdl(v) : v;
      if (bsMg < GLUCOSE_RANGE_MGDL.min || bsMg > GLUCOSE_RANGE_MGDL.max) {
        setBsErr("That reading seems outside the expected range — double-check your glucometer.");
        return;
      }
    }

    setSaving(true);
    const { error } = await supabase.from("health_logs").upsert(
      {
        user_id: user.id,
        log_date: todayISO(),
        weight: weightLb,
        blood_sugar: bsMg != null ? Math.round(bsMg) : null,
        energy,
        notes: notes || null,
      },
      { onConflict: "user_id,log_date" },
    );
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });

    // Gamification: award XP for each logged metric (idempotent per day for streak)
    if (bsMg != null) await recordAction("log_glucose");
    if (weightLb != null) await recordAction("log_weight");
    refresh();
  };

  // Sparkline: last 14 entries (oldest first), values displayed in current unit.
  const trend = [...logs]
    .reverse()
    .filter((l) => l.blood_sugar != null)
    .slice(-14);
  const trendValues = trend.map((t) =>
    glucoseUnit === "mmoll" ? mgdlToMmoll(t.blood_sugar!) : t.blood_sugar!,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-foreground">Progress</h1>
          <p className="text-sm text-muted-foreground">Log today's numbers. No judgment — just data.</p>
        </div>
      </div>

      {/* Unit toggles */}
      <Card className="p-4 border border-border bg-muted/30">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Weight unit</p>
            <div className="grid grid-cols-2 gap-2">
              <UnitChip active={weightUnit === "lb"} onClick={() => setWeightUnitPersist("lb")}>lb</UnitChip>
              <UnitChip active={weightUnit === "kg"} onClick={() => setWeightUnitPersist("kg")}>kg</UnitChip>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Glucose unit</p>
            <div className="grid grid-cols-2 gap-2">
              <UnitChip active={glucoseUnit === "mgdl"} onClick={() => setGlucoseUnitPersist("mgdl")}>mg/dL</UnitChip>
              <UnitChip active={glucoseUnit === "mmoll"} onClick={() => setGlucoseUnitPersist("mmoll")}>mmol/L</UnitChip>
            </div>
          </div>
        </div>
      </Card>

      {/* Today's log */}
      <Card className="p-5 border border-border">
        <p className="text-sm font-medium text-foreground mb-4">
          Today, {new Date().toLocaleDateString()}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="weight" className="text-xs text-muted-foreground">
              Weight ({weightUnit})
            </Label>
            <Input
              id="weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="—"
            />
            {weightErr && <p className="text-xs text-destructive mt-1">{weightErr}</p>}
          </div>
          <div>
            <Label htmlFor="bs" className="text-xs text-muted-foreground">
              Blood sugar ({glucoseUnit === "mmoll" ? "mmol/L" : "mg/dL"})
            </Label>
            <Input
              id="bs"
              type="number"
              inputMode="decimal"
              step={glucoseUnit === "mmoll" ? "0.1" : "1"}
              value={bs}
              onChange={(e) => setBs(e.target.value)}
              placeholder="—"
            />
            {bsErr && <p className="text-xs text-destructive mt-1">{bsErr}</p>}
          </div>
        </div>

        <div className="mt-4">
          <Label className="text-xs text-muted-foreground">Energy level</Label>
          <div className="flex gap-2 mt-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setEnergy(n)}
                className={`h-11 w-11 rounded-md border text-sm font-medium transition-colors ${
                  energy === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:border-primary/40"
                }`}
                aria-label={`Energy ${n} of 5`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="notes" className="text-xs text-muted-foreground">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything you want to remember about today"
          />
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save today
        </Button>
      </Card>

      {/* Trend */}
      {trend.length >= 2 ? (
        <Card className="p-5 border border-border">
          <p className="text-sm font-medium text-foreground mb-3">Blood sugar trend</p>
          <Sparkline values={trendValues} />
          <p className="text-xs text-muted-foreground mt-2">
            Last {trend.length} entries · {Math.min(...trendValues).toFixed(glucoseUnit === "mmoll" ? 1 : 0)} – {Math.max(...trendValues).toFixed(glucoseUnit === "mmoll" ? 1 : 0)} {glucoseUnit === "mmoll" ? "mmol/L" : "mg/dL"}
          </p>
        </Card>
      ) : (
        <Card className="p-5 border border-border bg-muted/20">
          <p className="text-sm text-muted-foreground">
            Your chart builds as you log. Start with today.
          </p>
        </Card>
      )}

      {/* History */}
      <Card className="p-5 border border-border">
        <p className="text-sm font-medium text-foreground mb-3">Recent entries</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((l) => (
              <div key={l.id} className="py-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground w-24">
                  {new Date(l.log_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span className="flex-1 text-foreground">
                  {l.weight != null && <span className="mr-3">{displayWeight(l.weight, weightUnit)}</span>}
                  {l.blood_sugar != null && <span className="mr-3">{displayGlucose(l.blood_sugar, glucoseUnit)}</span>}
                  {l.energy != null && <span className="text-muted-foreground">energy {l.energy}/5</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function UnitChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 320;
  const h = 60;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 8) - 4}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16">
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
