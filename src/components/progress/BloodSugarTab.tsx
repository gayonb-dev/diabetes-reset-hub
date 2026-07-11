import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EmptyState from "@/components/ui/empty-state";
import {
  getUnits,
  setUnits as persistUnits,
  GlucoseUnit,
  mgdlToMmoll,
  mmollToMgdl,
} from "@/lib/units";
import { useGamification } from "@/hooks/useGamification";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Dot } from "recharts";

type ReadingType = "fasting" | "post_meal" | "bedtime" | "other";

interface Reading {
  id: string;
  value_mgdl: number;
  reading_type: ReadingType;
  measured_at: string;
  notes: string | null;
}

const READING_TYPES: { k: ReadingType; label: string }[] = [
  { k: "fasting", label: "Fasting" },
  { k: "post_meal", label: "Post-meal (2 hrs after eating)" },
  { k: "bedtime", label: "Bedtime" },
  { k: "other", label: "Other" },
];

// Reference ranges in mg/dL
const RANGES = {
  fasting: { normal: 100, diabetic: 126, max: 200 },
  post_meal: { normal: 140, diabetic: 200, max: 300 },
  bedtime: { normal: 120, diabetic: 180, max: 250 },
  other: { normal: 140, diabetic: 200, max: 300 },
};

function toneFor(v: number, type: ReadingType): "normal" | "warning" | "danger" {
  const r = RANGES[type];
  if (v < r.normal) return "normal";
  if (v < r.diabetic) return "warning";
  return "danger";
}

function toneColor(t: "normal" | "warning" | "danger") {
  return t === "normal"
    ? "hsl(var(--status-normal))"
    : t === "warning"
    ? "hsl(var(--status-warning))"
    : "hsl(var(--status-danger))";
}

export default function BloodSugarTab() {
  const { user } = useAuth();
  const { recordAction } = useGamification();
  const initial = getUnits();
  const [unit, setUnit] = useState<GlucoseUnit>(initial.glucose);
  const [value, setValue] = useState("");
  const [type, setType] = useState<ReadingType>("fasting");
  const [when, setWhen] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [saving, setSaving] = useState(false);
  const [needConfirm, setNeedConfirm] = useState(false);
  const [medPromptDismissed, setMedPromptDismissed] = useState(false);

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("blood_sugar_readings")
      .select("*")
      .eq("member_id", user.id)
      .order("measured_at", { ascending: false })
      .limit(90);
    setReadings((data as Reading[]) || []);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const parsedMgdl = useMemo(() => {
    const v = parseFloat(value);
    if (isNaN(v) || v <= 0) return null;
    return unit === "mmoll" ? mmollToMgdl(v) : v;
  }, [value, unit]);

  const save = async () => {
    if (!user || parsedMgdl == null) return;
    // sanity: <30 or >600 mg/dL requires second confirm
    if ((parsedMgdl < 30 || parsedMgdl > 600) && !needConfirm) {
      setNeedConfirm(true);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("blood_sugar_readings").insert({
      member_id: user.id,
      value_mgdl: Math.round(parsedMgdl),
      reading_type: type,
      measured_at: new Date(when).toISOString(),
      notes: notes || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reading saved" });
    setValue("");
    setNotes("");
    setNeedConfirm(false);
    await recordAction("log_glucose");
    refresh();
  };

  function setUnitPersist(u: GlucoseUnit) {
    setUnit(u);
    persistUnits({ glucose: u });
  }

  // 30-day-below-126-fasting streak for medication conversation prompt
  const fastingBelow126Days = useMemo(() => {
    const fasting = readings.filter((r) => r.reading_type === "fasting");
    if (fasting.length === 0) return 0;
    const byDay = new Map<string, number>();
    for (const r of fasting) {
      const d = r.measured_at.slice(0, 10);
      const prev = byDay.get(d);
      if (prev == null || r.value_mgdl < prev) byDay.set(d, r.value_mgdl);
    }
    const days = [...byDay.keys()].sort().reverse();
    let streak = 0;
    for (const d of days) {
      if ((byDay.get(d) ?? 999) < 126) streak++;
      else break;
    }
    return streak;
  }, [readings]);

  const showMedPrompt = fastingBelow126Days >= 30 && !medPromptDismissed;

  const latestReading = readings[0];
  const latestDisplay = latestReading
    ? unit === "mmoll"
      ? mgdlToMmoll(latestReading.value_mgdl).toFixed(1)
      : String(Math.round(latestReading.value_mgdl))
    : null;
  const latestTone = latestReading ? toneFor(latestReading.value_mgdl, latestReading.reading_type) : null;
  const latestToneCls =
    latestTone === "normal"
      ? "text-status-normal"
      : latestTone === "warning"
      ? "text-status-warning"
      : latestTone === "danger"
      ? "text-status-danger"
      : "text-foreground";

  return (
    <div className="space-y-5">
      {latestReading && (
        <Card className="p-5 border border-border rounded-xl shadow-warm">
          <p className="stat-label mb-2">Latest reading</p>
          <p className={`metric-hero ${latestToneCls} flex items-baseline flex-wrap`}>
            <span>{latestDisplay}</span>
            <span className="stat-unit">{unit === "mmoll" ? "mmol/L" : "mg/dL"}</span>
          </p>
          <p className="text-[12px] text-tertiary-fg mt-2">
            {READING_TYPES.find((r) => r.k === latestReading.reading_type)?.label} ·{" "}
            {new Date(latestReading.measured_at).toLocaleDateString()}
          </p>
        </Card>
      )}

      {/* Top info bar */}
      <div className="rounded-lg bg-primary-muted px-4 py-3">
        <p className="text-[13px] text-primary">
          Track your readings consistently — even when the numbers aren't where you want them. The trend is
          what matters, not any single reading.
        </p>
      </div>

      {showMedPrompt && <MedicationPrompt days={fastingBelow126Days} onDismiss={() => setMedPromptDismissed(true)} />}

      <Card className="p-5 border border-border">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">Log a reading</p>
          <div className="flex gap-1.5 text-xs">
            <button
              className={`px-2.5 py-1 rounded-full border ${unit === "mgdl" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
              onClick={() => setUnitPersist("mgdl")}
            >
              mg/dL
            </button>
            <button
              className={`px-2.5 py-1 rounded-full border ${unit === "mmoll" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
              onClick={() => setUnitPersist("mmoll")}
            >
              mmol/L
            </button>
          </div>
        </div>

        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setNeedConfirm(false);
          }}
          type="number"
          inputMode="decimal"
          step={unit === "mmoll" ? "0.1" : "1"}
          placeholder={unit === "mmoll" ? "e.g. 5.4" : "e.g. 98"}
          className="h-12 text-xl text-center"
        />

        {/* Reading type */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          {READING_TYPES.map((rt) => (
            <button
              key={rt.k}
              onClick={() => setType(rt.k)}
              className={`text-xs py-2 rounded-md border ${type === rt.k ? "bg-primary-muted border-primary text-primary" : "border-border text-secondary-fg"}`}
            >
              {rt.label}
            </button>
          ))}
        </div>

        {/* Reference range bar */}
        <ReferenceBar type={type} unit={unit} valueMgdl={parsedMgdl} />

        <p className="text-[11px] text-tertiary-fg mt-2">
          These ranges are for reference only and are not medical advice. Always follow your healthcare
          provider's guidance for interpreting your blood sugar readings.
        </p>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Timestamp</Label>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
        </div>

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything notable? What did you eat? How are you feeling?"
          rows={2}
          className="mt-3 text-sm"
        />

        {needConfirm && (
          <p className="text-xs text-destructive mt-2">
            That value is outside the usual range. Double-check your glucometer, then tap Save again to confirm.
          </p>
        )}

        <Button
          onClick={save}
          disabled={saving || parsedMgdl == null}
          className="mt-4 w-full h-[52px] bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {needConfirm ? "Confirm and save" : "Save reading"}
        </Button>
      </Card>

      <BloodSugarHistory readings={readings} unit={unit} />
    </div>
  );
}

function ReferenceBar({
  type,
  unit,
  valueMgdl,
}: {
  type: ReadingType;
  unit: GlucoseUnit;
  valueMgdl: number | null;
}) {
  const r = RANGES[type];
  const fmt = (v: number) => (unit === "mmoll" ? mgdlToMmoll(v).toFixed(1) : String(v));
  const max = r.max;
  const pct = valueMgdl != null ? Math.min(Math.max(valueMgdl / max, 0), 1) * 100 : null;
  const normalPct = (r.normal / max) * 100;
  const diabeticPct = (r.diabetic / max) * 100;
  const tone = valueMgdl != null ? toneFor(valueMgdl, type) : null;

  return (
    <div className="mt-4">
      <div className="relative h-3 rounded-full overflow-hidden bg-muted">
        <div className="absolute inset-y-0 left-0 bg-status-normal" style={{ width: `${normalPct}%` }} />
        <div
          className="absolute inset-y-0 bg-status-warning"
          style={{ left: `${normalPct}%`, width: `${diabeticPct - normalPct}%` }}
        />
        <div
          className="absolute inset-y-0 bg-status-danger"
          style={{ left: `${diabeticPct}%`, width: `${100 - diabeticPct}%` }}
        />
        {pct != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-white shadow"
            style={{ left: `calc(${pct}% - 10px)`, background: toneColor(tone!) }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-tertiary-fg mt-1">
        <span>0</span>
        <span>Normal &lt; {fmt(r.normal)}</span>
        <span>Diabetic ≥ {fmt(r.diabetic)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}

function BloodSugarHistory({ readings, unit }: { readings: Reading[]; unit: GlucoseUnit }) {
  if (readings.length === 0)
    return (
      <Card className="p-5 border border-border bg-muted/20">
        <EmptyState
          title="No readings logged yet"
          description="Your first reading starts the trend. VITA is ready when you are."
          posture="encouraging"
        />
      </Card>
    );

  const sorted = [...readings].reverse();
  const data = sorted.map((r) => ({
    id: r.id,
    label: new Date(r.measured_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    value: unit === "mmoll" ? Number(mgdlToMmoll(r.value_mgdl).toFixed(1)) : Math.round(r.value_mgdl),
    mgdl: r.value_mgdl,
    tone: toneFor(r.value_mgdl, r.reading_type),
  }));

  const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  const last7 = readings.filter((r) => Date.now() - new Date(r.measured_at).getTime() < 7 * 86400000);
  const last30 = readings.filter((r) => Date.now() - new Date(r.measured_at).getTime() < 30 * 86400000);
  const trendDelta = (() => {
    if (readings.length < 4) return null;
    const oldest = readings[readings.length - 1].value_mgdl;
    const newest = readings[0].value_mgdl;
    return Math.round(((newest - oldest) / oldest) * 100);
  })();

  const fmt = (mg: number) => (unit === "mmoll" ? mgdlToMmoll(mg).toFixed(1) : String(Math.round(mg)));
  const normalRef = unit === "mmoll" ? Number(mgdlToMmoll(100).toFixed(1)) : 100;
  const diabeticRef = unit === "mmoll" ? Number(mgdlToMmoll(126).toFixed(1)) : 126;

  return (
    <Card className="p-5 border border-border">
      <p className="text-sm font-medium mb-3">Blood sugar trend</p>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} minTickGap={20} label={{ value: "Date", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={36} label={{ value: unit === "mmoll" ? "mmol/L" : "mg/dL", angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
                color: "hsl(var(--popover-foreground))",
              }}
              formatter={(v: number) => [`${v} ${unit === "mmoll" ? "mmol/L" : "mg/dL"}`, "Reading"]}
              labelFormatter={(l) => `Date: ${l}`}
            />
            {/* Shaded normal range band — below 100 mg/dL / 5.6 mmol/L */}
            <ReferenceArea y1={0} y2={normalRef} fill="hsl(var(--status-normal))" fillOpacity={0.12} strokeOpacity={0} />
            <ReferenceLine y={normalRef} stroke="hsl(var(--status-normal))" strokeDasharray="4 4" />
            <ReferenceLine y={diabeticRef} stroke="hsl(var(--status-warning))" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={800}
              dot={(props: any) => {
                const { cx, cy, payload, index } = props;
                return <Dot key={payload?.id ?? index} cx={cx} cy={cy} r={3} fill={toneColor(payload.tone)} />;
              }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3 text-center">
        <div>
          <p className="text-[11px] text-tertiary-fg">7-day avg</p>
          <p className="text-sm font-semibold">{last7.length ? fmt(avg(last7.map((r) => r.value_mgdl))) : "—"}</p>
        </div>
        <div>
          <p className="text-[11px] text-tertiary-fg">30-day avg</p>
          <p className="text-sm font-semibold">{last30.length ? fmt(avg(last30.map((r) => r.value_mgdl))) : "—"}</p>
        </div>
        <div>
          <p className="text-[11px] text-tertiary-fg">All-time trend</p>
          <p className="text-sm font-semibold">
            {trendDelta == null ? "—" : `${trendDelta > 0 ? "↑" : "↓"} ${Math.abs(trendDelta)}%`}
          </p>
        </div>
      </div>
    </Card>
  );
}

function MedicationPrompt({ days, onDismiss }: { days: number; onDismiss: () => void }) {
  return (
    <Card className="p-4 border-2 border-accent bg-accent-muted">
      <p className="text-sm text-foreground leading-relaxed">
        Your readings have been consistently below 126 mg/dL (7.0 mmol/L) for {days} days. This is exactly the
        kind of progress worth bringing to your doctor. Ask them: <em>"Given these numbers, is my current
        medication dosage still the right fit?"</em> That is your question. They make the decision.
      </p>
      <p className="text-[11px] text-tertiary-fg mt-2">
        This app does not provide medical advice. Never adjust or stop any medication without consulting your
        healthcare provider.
      </p>
      <Button size="sm" variant="outline" className="mt-3" onClick={onDismiss}>
        Got it
      </Button>
    </Card>
  );
}
