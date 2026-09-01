import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";
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
import {
  classifyGlucose,
  glucoseToneClass,
  glucoseToneColor,
  GLUCOSE_STATUS_LABEL,
  GLUCOSE_IMPLAUSIBLE_MESSAGE,
  GLUCOSE_FUTURE_TIMESTAMP_MESSAGE,
  isPlausible,
  isFutureTimestamp,
  isLowStatus,
  localDateTimeValue,
  GLUCOSE_LOW_THRESHOLDS,
  GLUCOSE_AXIS_MAX,
  GLUCOSE_RANGES,
  glucoseBands,
  GlucoseStatus,

} from "@/lib/glucose";
import GlucoseSafetyCard from "@/components/progress/GlucoseSafetyCard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Dot } from "recharts";


type ReadingType = "fasting" | "post_meal" | "bedtime" | "other" | "cgm";

interface Reading {
  id: string;
  value_mgdl: number;
  reading_type: ReadingType;
  measured_at: string;
  notes: string | null;
  source?: string | null;
}


const READING_TYPES: { k: ReadingType; label: string }[] = [
  { k: "fasting", label: "Fasting" },
  { k: "post_meal", label: "Post-meal (2 hrs after eating)" },
  { k: "bedtime", label: "Bedtime" },
  { k: "other", label: "Other" },
];

// Reference geometry, bands and labels all come from src/lib/glucose.ts, // the shared S1 source of truth, keyed to the selected reading type.


export default function BloodSugarTab() {
  const { user } = useAuth();
  const { recordAction } = useGamification();
  const initial = getUnits();
  const [unit, setUnit] = useState<GlucoseUnit>(initial.glucose);
  const [value, setValue] = useState("");
  const [type, setType] = useState<ReadingType>("fasting");
  const [when, setWhen] = useState<string>(() => localDateTimeValue());
  const [notes, setNotes] = useState("");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [saving, setSaving] = useState(false);
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

  // Entry-time validation, nothing is written until the entry is valid.
  const entryStatus: GlucoseStatus | null =
    parsedMgdl != null && isPlausible(parsedMgdl) ? classifyGlucose(parsedMgdl, type) : null;
  const implausible = parsedMgdl != null && !isPlausible(parsedMgdl);
  const futureTimestamp = isFutureTimestamp(when);
  const canSave = parsedMgdl != null && !implausible && !futureTimestamp;

  const save = async () => {
    if (!user || parsedMgdl == null || !canSave) return;
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
    await recordAction("log_glucose");
    refresh();
  };


  function setUnitPersist(u: GlucoseUnit) {
    setUnit(u);
    persistUnits({ glucose: u });
  }

  // 30-day-below-126-fasting streak for medication conversation prompt.
  // NOTE: Explicitly filters reading_type='fasting' so Dexcom CGM rows
  // (reading_type='cgm') never satisfy or pollute this fasting-based signal.
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
  const latestStatus: GlucoseStatus | null = latestReading
    ? classifyGlucose(latestReading.value_mgdl, latestReading.reading_type)
    : null;
  const latestToneCls = latestStatus ? glucoseToneClass(latestStatus) : "text-foreground";

  return (
    <div className="space-y-5">
      {latestReading && latestStatus && (
        <>
          <Card className="p-5 border border-border rounded-xl shadow-warm">
            <p className="stat-label mb-2">Latest reading</p>
            <p className={`metric-hero ${latestToneCls} flex items-baseline flex-wrap`}>
              <span>{latestDisplay}</span>
              <span className="stat-unit">{unit === "mmoll" ? "mmol/L" : "mg/dL"}</span>
            </p>
            <p className={`text-[12px] font-medium mt-1 ${latestToneCls} flex items-center gap-1.5`}>
              {isLowStatus(latestStatus) && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>{GLUCOSE_STATUS_LABEL[latestStatus]}</span>
            </p>
            <p className="text-[12px] text-tertiary-fg mt-2 flex items-center gap-2 flex-wrap">
              <span>
                {READING_TYPES.find((r) => r.k === latestReading.reading_type)?.label ??
                  (latestReading.reading_type === "cgm" ? "CGM" : latestReading.reading_type)}{" "}
                · {new Date(latestReading.measured_at).toLocaleDateString()}
              </span>
              {latestReading.source === "dexcom" && (
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-accent-muted text-accent-foreground border border-accent/40">
                  CGM
                </span>
              )}
            </p>
          </Card>
          {/* Saved reading, accessible text + icon, no assertive announcement on load. */}
          {isLowStatus(latestStatus) && <GlucoseSafetyCard status={latestStatus} />}
        </>
      )}


      {/* Top info bar */}
      <div className="rounded-lg bg-primary-muted px-4 py-3">
        <p className="text-[13px] text-primary">
          Track your readings consistently, even when the numbers aren't where you want them. The trend is
          what matters, not any single reading.
        </p>
      </div>

      {showMedPrompt && <MedicationPrompt days={fastingBelow126Days} onDismiss={() => setMedPromptDismissed(true)} />}

      <Card className="p-5 border border-border">
        <div className="mb-3 space-y-2 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
          <p className="text-sm font-medium">Log a reading</p>
          <div className="flex gap-1.5 text-xs justify-end lg:justify-start">
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
          }}
          type="number"
          inputMode="decimal"
          step={unit === "mmoll" ? "0.1" : "1"}
          placeholder={unit === "mmoll" ? "e.g. 5.4" : "e.g. 98"}
          className="h-14 text-2xl tabular-nums text-center lg:h-12 lg:text-xl"
        />

        {/* Reading type */}
        <div className="flex overflow-x-auto flex-nowrap gap-2 mt-3 pb-1 -mx-1 px-1 lg:grid lg:grid-cols-2 lg:overflow-visible">
          {READING_TYPES.map((rt) => (
            <button
              key={rt.k}
              onClick={() => setType(rt.k)}
              className={`shrink-0 whitespace-nowrap min-h-11 px-3 text-xs rounded-md border lg:whitespace-normal lg:min-h-0 lg:py-2 ${type === rt.k ? "bg-primary-muted border-primary text-primary" : "border-border text-secondary-fg"}`}
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
            <Label className="text-xs text-muted-foreground" htmlFor="bs-when">
              Timestamp
            </Label>
            <Input
              id="bs-when"
              type="datetime-local"
              value={when}
              max={localDateTimeValue()}
              aria-invalid={futureTimestamp || undefined}
              onChange={(e) => setWhen(e.target.value)}
            />
            {futureTimestamp && (
              <p className="text-xs text-destructive mt-1">{GLUCOSE_FUTURE_TIMESTAMP_MESSAGE}</p>
            )}
          </div>
        </div>

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything notable? What did you eat? How are you feeling?"
          className="mt-3 text-sm h-20"
        />

        {implausible && <p className="text-xs text-destructive mt-2">{GLUCOSE_IMPLAUSIBLE_MESSAGE}</p>}

        {/* Newly entered low reading, announced assertively, focus not moved. */}
        {entryStatus && isLowStatus(entryStatus) && (
          <GlucoseSafetyCard status={entryStatus} announce className="mt-3" />
        )}

        <div className="sticky bottom-0 z-10 -mx-5 px-5 pb-[env(safe-area-inset-bottom)] pt-3 mt-4 bg-card lg:static lg:mx-0 lg:px-0 lg:pb-0 lg:pt-0 lg:mt-4 lg:bg-transparent">
          <Button
            onClick={save}
            disabled={saving || !canSave}
            className="w-full h-[52px] bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save reading
          </Button>
        </div>

      </Card>

      <BloodSugarHistory readings={readings} unit={unit} referenceType={type} />
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
  const bands = glucoseBands(type);
  const max = GLUCOSE_AXIS_MAX[type];
  const fmt = (v: number) => (unit === "mmoll" ? mgdlToMmoll(v).toFixed(1) : String(v));
  const pct = valueMgdl != null ? Math.min(Math.max(valueMgdl / max, 0), 1) * 100 : null;
  const status = valueMgdl != null ? classifyGlucose(valueMgdl, type) : null;
  const readingLabel = READING_TYPES.find((r) => r.k === type)?.label ?? type;

  return (
    <div className="mt-4">
      <div className="relative h-3 rounded-full overflow-hidden bg-muted">
        {bands.map((b) => (
          <div
            key={b.status}
            className={
              b.status === "in_range"
                ? "absolute inset-y-0 bg-status-normal"
                : b.status === "elevated" || b.status === "low"
                ? "absolute inset-y-0 bg-status-warning"
                : "absolute inset-y-0 bg-status-danger"
            }
            style={{
              left: `${(b.from / max) * 100}%`,
              width: `${((Math.min(b.to, max) - b.from) / max) * 100}%`,
            }}
          />
        ))}
        {pct != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-white shadow"
            style={{ left: `calc(${pct}% - 10px)`, background: glucoseToneColor(status!) }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-tertiary-fg mt-1">
        <span>Low &lt; {fmt(GLUCOSE_LOW_THRESHOLDS.low)}</span>
        <span>In range &lt; {fmt(GLUCOSE_RANGES[type].inRangeMax)}</span>
        <span>High &ge; {fmt(GLUCOSE_RANGES[type].elevatedMax)}</span>
        <span>{fmt(max)}</span>
      </div>
      <p className="sr-only">
        Reference ranges for {readingLabel}:{" "}
        {bands
          .map((b) => `${b.label} ${fmt(b.from)} to ${fmt(Math.min(b.to, max))}`)
          .join("; ")}{" "}
        {unit === "mmoll" ? "mmol/L" : "mg/dL"}.
      </p>
    </div>
  );

}

function BloodSugarHistory({
  readings,
  unit,
  referenceType,
}: {
  readings: Reading[];
  unit: GlucoseUnit;
  referenceType: ReadingType;
}) {
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
    status: classifyGlucose(r.value_mgdl, r.reading_type),
    readingType: r.reading_type,
    measuredAt: r.measured_at,
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
  const conv = (mg: number) => (unit === "mmoll" ? Number(mgdlToMmoll(mg).toFixed(1)) : mg);
  const inRangeRef = conv(GLUCOSE_RANGES[referenceType].inRangeMax);
  const highRef = conv(GLUCOSE_RANGES[referenceType].elevatedMax);
  const referenceLabel = READING_TYPES.find((r) => r.k === referenceType)?.label ?? referenceType;

  return (
    <Card className="p-5 border border-border">
      <p className="text-sm font-medium mb-3">Blood sugar trend</p>
      <p className="text-[11px] text-tertiary-fg mb-2">
        Reference lines shown for {referenceLabel}. Each point is classified against its own reading type.
      </p>
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
              formatter={(v: number, _n, item: { payload?: { status?: GlucoseStatus } }) => [
                `${v} ${unit === "mmoll" ? "mmol/L" : "mg/dL"} · ${GLUCOSE_STATUS_LABEL[item?.payload?.status ?? "in_range"]}`,
                "Reading",
              ]}
              labelFormatter={(l) => `Date: ${l}`}
            />
            {/* Shaded in-range band, below 100 mg/dL / 5.6 mmol/L */}
            <ReferenceArea y1={conv(GLUCOSE_LOW_THRESHOLDS.low)} y2={inRangeRef} fill="hsl(var(--status-normal))" fillOpacity={0.12} strokeOpacity={0} />
            <ReferenceLine y={inRangeRef} stroke="hsl(var(--status-normal))" strokeDasharray="4 4" />
            <ReferenceLine y={highRef} stroke="hsl(var(--status-warning))" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={800}
              dot={(props: { cx?: number; cy?: number; index?: number; payload?: { id?: string; status?: GlucoseStatus } }) => {
                const { cx, cy, payload, index } = props;
                return <Dot key={payload?.id ?? index} cx={cx} cy={cy} r={3} fill={glucoseToneColor(payload?.status ?? "in_range")} />;
              }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3 text-center">
        <div>
          <p className="text-[11px] text-tertiary-fg">7-day avg</p>
          <p className="text-sm font-semibold">{last7.length ? fmt(avg(last7.map((r) => r.value_mgdl))) : ", "}</p>
        </div>
        <div>
          <p className="text-[11px] text-tertiary-fg">30-day avg</p>
          <p className="text-sm font-semibold">{last30.length ? fmt(avg(last30.map((r) => r.value_mgdl))) : ", "}</p>
        </div>
        <div>
          <p className="text-[11px] text-tertiary-fg">Change since first reading</p>
          <p className="text-sm font-semibold tabular-nums">
            {trendDelta == null ? ", " : `${trendDelta > 0 ? "+" : "−"}${Math.abs(trendDelta)}%`}
          </p>
        </div>
      </div>

      {/* Text equivalent of the chart, same data, readable without the graph. */}
      <details className="mt-4">
        <summary className="text-[12px] text-secondary-fg cursor-pointer min-h-11 flex items-center">
          View readings as a table
        </summary>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-[12px]">
            <caption className="sr-only">
              Blood sugar readings with date, reading type, value and status
            </caption>
            <thead>
              <tr className="text-tertiary-fg text-left">
                <th scope="col" className="py-1 pr-3 font-medium">Date</th>
                <th scope="col" className="py-1 pr-3 font-medium">Type</th>
                <th scope="col" className="py-1 pr-3 font-medium">Value</th>
                <th scope="col" className="py-1 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="py-1 pr-3 whitespace-nowrap">{d.label}</td>
                  <td className="py-1 pr-3">
                    {READING_TYPES.find((r) => r.k === d.readingType)?.label ??
                      (d.readingType === "cgm" ? "CGM" : d.readingType)}
                  </td>
                  <td className="py-1 pr-3 tabular-nums">
                    {d.value} {unit === "mmoll" ? "mmol/L" : "mg/dL"}
                  </td>
                  <td className="py-1">{GLUCOSE_STATUS_LABEL[d.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
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
