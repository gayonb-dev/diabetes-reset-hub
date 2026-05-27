import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Star } from "lucide-react";
import Vita from "@/components/vita/Vita";
import {
  getUnits,
  setUnits,
  WeightUnit,
  GlucoseUnit,
  lbToKg,
  kgToLb,
  mmollToMgdl,
  GLUCOSE_RANGE_MGDL,
  WEIGHT_RANGE_LB,
} from "@/lib/units";

type Diabetes = "type_2" | "prediabetes" | "concerned";
type Medication = "oral" | "insulin" | "both" | "none";
type Goal = "reverse" | "lose_weight" | "off_meds" | "energy" | "all";
type Monitoring = "multi_daily" | "once_daily" | "few_weekly" | "when_off" | "none";
type MealFreq = "two" | "three" | "more";

const CHALLENGES = [
  "Cravings",
  "Not knowing what to eat",
  "Time to cook",
  "Eating out too much",
  "Emotional eating",
  "Portion sizes",
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initialUnits = getUnits();

  const [step, setStep] = useState(0); // 0 = welcome, 1..3 = wizard
  const [saving, setSaving] = useState(false);

  // Screen 2
  const [firstName, setFirstName] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(initialUnits.weight);
  const [heightVal, setHeightVal] = useState("");
  const [heightUnit, setHeightUnit] = useState<"ft" | "cm">("ft");
  const [fasting, setFasting] = useState("");
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseUnit>(initialUnits.glucose);
  const [dob, setDob] = useState("");
  const [diabetes, setDiabetes] = useState<Diabetes | null>(null);
  const [medication, setMedication] = useState<Medication | null>(null);
  const [s2Err, setS2Err] = useState<string | null>(null);

  // Screen 3
  const [goal, setGoal] = useState<Goal | null>(null);
  const [sixMonth, setSixMonth] = useState("");
  const [commitment, setCommitment] = useState<number>(0);
  const [challenges, setChallenges] = useState<string[]>([]);
  const [mealFreq, setMealFreq] = useState<MealFreq | null>(null);

  // Screen 4
  const [monitoring, setMonitoring] = useState<Monitoring | null>(null);
  const [glucometer, setGlucometer] = useState<boolean | null>(null);

  function toggleChallenge(c: string) {
    setChallenges((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function validateS2(): boolean {
    setS2Err(null);
    if (!firstName.trim()) return setS2Err("First name is required."), false;
    if (!weight.trim() || isNaN(parseFloat(weight))) return setS2Err("Enter a current weight."), false;
    const lb = weightUnit === "kg" ? kgToLb(parseFloat(weight)) : parseFloat(weight);
    if (lb < WEIGHT_RANGE_LB.min || lb > WEIGHT_RANGE_LB.max)
      return setS2Err("That weight seems outside the expected range."), false;
    if (fasting.trim()) {
      const v = parseFloat(fasting);
      if (isNaN(v)) return setS2Err("Blood sugar must be a number, or leave it blank."), false;
      const mg = glucoseUnit === "mmoll" ? mmollToMgdl(v) : v;
      if (mg < GLUCOSE_RANGE_MGDL.min || mg > GLUCOSE_RANGE_MGDL.max)
        return setS2Err("That blood sugar reading seems off — double check."), false;
    }
    if (!dob) return setS2Err("Date of birth is required."), false;
    if (!diabetes) return setS2Err("Pick your diabetes status."), false;
    if (!medication) return setS2Err("Pick your medication."), false;
    return true;
  }

  async function finish() {
    if (!user) return;
    setSaving(true);

    // Persist unit prefs locally
    setUnits({ weight: weightUnit, glucose: glucoseUnit });

    // Baseline log
    const baseline: Record<string, unknown> = { user_id: user.id };
    if (weight.trim()) {
      baseline.weight = weightUnit === "kg" ? kgToLb(parseFloat(weight)) : parseFloat(weight);
    }
    if (fasting.trim()) {
      const v = parseFloat(fasting);
      baseline.blood_sugar = Math.round(glucoseUnit === "mmoll" ? mmollToMgdl(v) : v);
    }
    if (baseline.weight != null || baseline.blood_sugar != null) {
      await supabase.from("health_logs").insert(baseline as never);
    }

    // visitor_profiles: date_of_birth column + everything else in metadata
    const meta = {
      first_name: firstName.trim(),
      height: heightVal.trim() ? { value: parseFloat(heightVal), unit: heightUnit } : null,
      diabetes_status: diabetes,
      medication,
      weight_unit: weightUnit,
      blood_sugar_unit: glucoseUnit,
      primary_goal: goal,
      six_month_goal: sixMonth.trim(),
      commitment_level: commitment,
      biggest_challenges: challenges,
      current_meal_frequency: mealFreq,
      monitoring_frequency: monitoring,
      glucometer_at_home: glucometer,
      onboarded_at: new Date().toISOString(),
    };

    const { data: vp } = await supabase
      .from("visitor_profiles")
      .select("id, metadata")
      .eq("user_id", user.id)
      .maybeSingle();
    if (vp) {
      const merged = { ...(vp.metadata as Record<string, unknown>), ...meta } as never;
      await supabase
        .from("visitor_profiles")
        .update({ metadata: merged, date_of_birth: dob || null } as never)
        .eq("id", vp.id);
    }

    // Trigger meal plan generation (Phase 9 wires the edge function).
    const today = new Date();
    const validUntil = new Date(today);
    validUntil.setDate(today.getDate() + 7);
    await supabase.from("meal_plans").insert({
      member_id: user.id,
      plan_type: "standard",
      generation_status: "pending",
      generation_trigger: "onboarding",
      valid_from: today.toISOString().slice(0, 10),
      valid_until: validUntil.toISOString().slice(0, 10),
      preferences_snapshot: {
        diabetes_status: diabetes,
        medication,
        challenges,
        primary_goal: goal,
      },
      plan_data: {},
    } as never);

    setSaving(false);
    navigate("/app", { replace: true });
  }

  // ───── Welcome screen ─────
  if (step === 0) {
    return (
      <div className="min-h-screen bg-primary text-primary-foreground font-sans flex flex-col items-center justify-center px-10 py-12">
        <p className="text-[22px] font-semibold mb-6 tracking-tight">Diabetes Reset Method</p>
        <Vita posture="celebrating" size={160} />
        <h1 className="text-[28px] font-bold mt-6 text-center leading-tight">
          Your reversal starts today.
        </h1>
        <p className="text-base mt-3 text-center text-primary-foreground/70 max-w-sm">
          A program built to end diabetes — not manage it.
        </p>
        <div className="w-full max-w-md mt-10">
          <Button
            onClick={() => setStep(1)}
            className="w-full h-[52px] rounded-[10px] bg-accent hover:bg-accent/90 text-accent-foreground text-base font-semibold"
          >
            Begin my reset
          </Button>
        </div>
        <p className="mt-8 text-[13px] text-primary-foreground/50">
          Already have an account?{" "}
          <Link to="/login" className="underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4 font-sans">
      <div className="max-w-xl mx-auto">
        {/* 3-dot progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`h-2 w-2 rounded-full transition-all ${
                step >= n ? "bg-primary w-6" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card className="p-8 border-border/60 shadow-sm rounded-2xl bg-card">
          {step === 1 && (
            <>
              <h1 className="text-[22px] font-semibold mb-2 tracking-tight">
                Tell us where you are starting.
              </h1>
              <p className="text-sm text-secondary-fg mb-6">
                No judgment. Just your baseline so we can track your progress.
              </p>

              <Field label="First name" required>
                <FInput value={firstName} onChange={setFirstName} placeholder="e.g. Maria" autoFocus />
              </Field>

              <Field label="Current weight" required>
                <div className="flex gap-2">
                  <FInput
                    value={weight}
                    onChange={setWeight}
                    placeholder={weightUnit === "kg" ? "82.5" : "182"}
                    inputMode="decimal"
                    className="flex-1"
                  />
                  <Seg
                    options={[
                      { v: "lb", label: "lbs" },
                      { v: "kg", label: "kg" },
                    ]}
                    value={weightUnit}
                    onChange={(v) => setWeightUnit(v as WeightUnit)}
                  />
                </div>
              </Field>

              <Field label="Height (optional)">
                <div className="flex gap-2">
                  <FInput
                    value={heightVal}
                    onChange={setHeightVal}
                    placeholder={heightUnit === "ft" ? "5.8" : "175"}
                    inputMode="decimal"
                    className="flex-1"
                  />
                  <Seg
                    options={[
                      { v: "ft", label: "ft" },
                      { v: "cm", label: "cm" },
                    ]}
                    value={heightUnit}
                    onChange={(v) => setHeightUnit(v as "ft" | "cm")}
                  />
                </div>
              </Field>

              <Field label="Fasting blood sugar">
                <div className="flex gap-2">
                  <FInput
                    value={fasting}
                    onChange={setFasting}
                    placeholder={glucoseUnit === "mmoll" ? "7.2" : "130"}
                    inputMode="decimal"
                    className="flex-1"
                  />
                  <Seg
                    options={[
                      { v: "mgdl", label: "mg/dL" },
                      { v: "mmoll", label: "mmol/L" },
                    ]}
                    value={glucoseUnit}
                    onChange={(v) => setGlucoseUnit(v as GlucoseUnit)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFasting("")}
                  className="text-xs text-accent mt-1.5"
                >
                  Skip for now
                </button>
              </Field>

              <Field label="Date of birth" required>
                <FInput value={dob} onChange={setDob} type="date" />
              </Field>

              <Field label="Diabetes status" required>
                <SegStack
                  value={diabetes}
                  onChange={(v) => setDiabetes(v as Diabetes)}
                  options={[
                    { v: "type_2", label: "Type 2 Diabetes" },
                    { v: "prediabetes", label: "Prediabetes" },
                    { v: "concerned", label: "Not diagnosed but concerned" },
                  ]}
                />
              </Field>

              <Field label="Medication" required>
                <Radios
                  value={medication}
                  onChange={(v) => setMedication(v as Medication)}
                  options={[
                    { v: "oral", label: "Oral pills (e.g., Metformin)" },
                    { v: "insulin", label: "Insulin" },
                    { v: "both", label: "Both" },
                    { v: "none", label: "No medication" },
                  ]}
                />
              </Field>

              {s2Err && <p className="text-sm text-destructive mb-3">{s2Err}</p>}

              <Button
                onClick={() => {
                  if (validateS2()) setStep(2);
                }}
                className="w-full h-[52px] bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
              >
                Continue
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-[22px] font-semibold mb-2 tracking-tight">
                What would a win look like for you?
              </h1>
              <p className="text-sm text-secondary-fg mb-6">
                In your own words. There's no wrong answer.
              </p>

              <Field label="Primary goal" required>
                <Radios
                  value={goal}
                  onChange={(v) => setGoal(v as Goal)}
                  options={[
                    { v: "reverse", label: "Reverse my diabetes" },
                    { v: "lose_weight", label: "Lose weight" },
                    { v: "off_meds", label: "Get off medication" },
                    { v: "energy", label: "Feel better and have more energy" },
                    { v: "all", label: "All of the above" },
                  ]}
                />
              </Field>

              <Field label="What would feel like a win after 6 months?">
                <Textarea
                  value={sixMonth}
                  onChange={(e) => setSixMonth(e.target.value.slice(0, 200))}
                  placeholder="In 6 months I want to..."
                  className="bg-muted/50 border-0 rounded-xl min-h-[88px]"
                  maxLength={200}
                />
                <p className="text-[11px] text-tertiary-fg text-right mt-1">
                  {sixMonth.length}/200
                </p>
              </Field>

              <Field label="Commitment level" required>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-tertiary-fg">Still figuring it out.</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCommitment(n)}
                        className="p-1"
                      >
                        <Star
                          className={`h-7 w-7 ${
                            n <= commitment ? "fill-accent text-accent" : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-tertiary-fg">Fully committed.</span>
                </div>
              </Field>

              <Field label="Biggest challenges (pick any)">
                <div className="flex flex-wrap gap-2">
                  {CHALLENGES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleChallenge(c)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        challenges.includes(c)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:border-primary/40"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Current eating pattern" required>
                <Radios
                  value={mealFreq}
                  onChange={(v) => setMealFreq(v as MealFreq)}
                  options={[
                    { v: "two", label: "2 meals per day" },
                    { v: "three", label: "3 meals per day" },
                    { v: "more", label: "More than 3 meals" },
                  ]}
                />
              </Field>

              <Button
                onClick={() => setStep(3)}
                disabled={!goal || !commitment || !mealFreq}
                className="w-full h-[52px] bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
              >
                Continue
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-[22px] font-semibold mb-2 tracking-tight">
                How do you currently track your blood sugar?
              </h1>
              <p className="text-sm text-secondary-fg mb-6">
                We'll set your daily check-in reminders based on your answer.
              </p>

              <Field label="Monitoring frequency" required>
                <Radios
                  value={monitoring}
                  onChange={(v) => setMonitoring(v as Monitoring)}
                  options={[
                    { v: "multi_daily", label: "Yes, multiple times daily" },
                    { v: "once_daily", label: "Yes, once daily" },
                    { v: "few_weekly", label: "Yes, a few times per week" },
                    { v: "when_off", label: "I check when I feel off" },
                    { v: "none", label: "I don't currently track" },
                  ]}
                />
              </Field>

              <Field label="Blood sugar unit" required>
                <Radios
                  value={glucoseUnit}
                  onChange={(v) => setGlucoseUnit(v as GlucoseUnit)}
                  options={[
                    { v: "mgdl", label: "mg/dL (most common in the US)" },
                    {
                      v: "mmoll",
                      label: "mmol/L (UK, Canada, Australia, Caribbean and many others)",
                    },
                  ]}
                />
                <p className="text-[11px] text-tertiary-fg mt-2">
                  This is your global unit — applied everywhere in the app.
                </p>
              </Field>

              <Field label="Glucometer at home" required>
                <Radios
                  value={glucometer == null ? null : glucometer ? "yes" : "no"}
                  onChange={(v) => setGlucometer(v === "yes")}
                  options={[
                    { v: "yes", label: "Yes" },
                    { v: "no", label: "No" },
                  ]}
                />
                {glucometer === false && (
                  <p className="text-xs text-secondary-fg mt-2 bg-accent/10 border border-accent/30 rounded-lg p-3">
                    You can get one at most pharmacies for under $20. It's one of the most
                    important tools in this program.
                  </p>
                )}
              </Field>

              <Button
                onClick={finish}
                disabled={saving || !monitoring || glucometer == null}
                className="w-full h-[52px] bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Let's go
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// ───────── Small helpers ─────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <Label className="text-sm font-medium mb-1.5 block text-secondary-fg">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function FInput({
  value,
  onChange,
  className,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-muted/50 border-0 rounded-xl h-12 ${className ?? ""}`}
      {...rest}
    />
  );
}

function Seg({
  options,
  value,
  onChange,
}: {
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex bg-muted/50 rounded-xl p-1 h-12">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`px-4 rounded-lg text-sm font-medium transition-all ${
            value === o.v
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-secondary-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SegStack({
  options,
  value,
  onChange,
}: {
  options: { v: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
            value === o.v
              ? "bg-primary/5 border-primary ring-2 ring-primary/20"
              : "bg-card border-border hover:border-primary/40"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Radios({
  options,
  value,
  onChange,
}: {
  options: { v: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`flex items-center gap-3 text-left px-4 py-3 rounded-xl border text-sm transition-all ${
              active
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <span
              className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                active ? "border-primary" : "border-muted-foreground/40"
              }`}
            >
              {active && <span className="h-2 w-2 rounded-full bg-primary" />}
            </span>
            <span className="text-foreground">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
