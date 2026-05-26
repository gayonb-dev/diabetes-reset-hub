import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import Vita, { VitaPosture } from "@/components/vita/Vita";
import {
  getUnits,
  setUnits,
  WeightUnit,
  GlucoseUnit,
  lbToKg,
  kgToLb,
  mmollToMgdl,
  mgdlToMmoll,
  GLUCOSE_RANGE_MGDL,
  WEIGHT_RANGE_LB,
} from "@/lib/units";

const TOTAL_STEPS = 6;

type Goal = "lower_a1c" | "lose_weight" | "more_energy" | "off_meds" | "other";

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initialUnits = getUnits();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [otherGoal, setOtherGoal] = useState("");

  const [weightUnit, setWeightUnit] = useState<WeightUnit>(initialUnits.weight);
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseUnit>(initialUnits.glucose);
  const [weightInput, setWeightInput] = useState("");
  const [glucoseInput, setGlucoseInput] = useState("");
  const [weightErr, setWeightErr] = useState<string | null>(null);
  const [glucoseErr, setGlucoseErr] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [waConsent, setWaConsent] = useState(false);

  const posture: VitaPosture =
    step === 1 ? "encouraging" : step === TOTAL_STEPS ? "celebrating" : "neutral";

  const progressPct = (step / TOTAL_STEPS) * 100;

  function validateBaseline(): boolean {
    setWeightErr(null);
    setGlucoseErr(null);
    let ok = true;
    if (weightInput.trim()) {
      const v = parseFloat(weightInput);
      if (isNaN(v)) {
        setWeightErr("Please enter a number.");
        ok = false;
      } else {
        const lb = weightUnit === "kg" ? kgToLb(v) : v;
        if (lb < WEIGHT_RANGE_LB.min || lb > WEIGHT_RANGE_LB.max) {
          setWeightErr("That weight seems outside the expected range — double-check.");
          ok = false;
        }
      }
    }
    if (glucoseInput.trim()) {
      const v = parseFloat(glucoseInput);
      if (isNaN(v)) {
        setGlucoseErr("Please enter a number.");
        ok = false;
      } else {
        const mg = glucoseUnit === "mmoll" ? mmollToMgdl(v) : v;
        if (mg < GLUCOSE_RANGE_MGDL.min || mg > GLUCOSE_RANGE_MGDL.max) {
          setGlucoseErr("That reading seems outside the expected range — double-check.");
          ok = false;
        }
      }
    }
    return ok;
  }

  async function finish() {
    if (!user) return;
    setSaving(true);

    // Persist unit prefs
    setUnits({ weight: weightUnit, glucose: glucoseUnit });

    // Persist baseline log (if provided)
    const baseline: Record<string, unknown> = { user_id: user.id };
    if (weightInput.trim()) {
      const v = parseFloat(weightInput);
      baseline.weight = weightUnit === "kg" ? kgToLb(v) : v;
    }
    if (glucoseInput.trim()) {
      const v = parseFloat(glucoseInput);
      baseline.blood_sugar = Math.round(glucoseUnit === "mmoll" ? mmollToMgdl(v) : v);
    }
    if (baseline.weight != null || baseline.blood_sugar != null) {
      await supabase.from("health_logs").insert(baseline as never);
    }

    // Persist first name + goal as visitor profile metadata
    if (firstName || goal) {
      const meta: Record<string, unknown> = {};
      if (firstName) meta.first_name = firstName.trim();
      if (goal) meta.primary_goal = goal === "other" ? otherGoal.trim() || "other" : goal;
      const { data: vp } = await supabase
        .from("visitor_profiles")
        .select("id, metadata")
        .eq("user_id", user.id)
        .maybeSingle();
      if (vp) {
        const merged = { ...(vp.metadata as Record<string, unknown>), ...meta } as never;
        await supabase
          .from("visitor_profiles")
          .update({ metadata: merged })
          .eq("id", vp.id);
      }
    }

    // WhatsApp consent
    if (waConsent && phone.trim()) {
      await supabase.from("whatsapp_consent").upsert(
        {
          user_id: user.id,
          phone_number: phone.trim(),
          opted_in_at: new Date().toISOString(),
        } as never,
        { onConflict: "user_id" },
      );
    }

    setSaving(false);
    navigate("/app", { replace: true });
  }

  const goalOptions: { id: Goal; label: string; sub: string }[] = [
    { id: "lower_a1c", label: "Lower my A1C", sub: "Bring blood sugar back into range" },
    { id: "lose_weight", label: "Lose weight", sub: "Steady, sustainable fat loss" },
    { id: "more_energy", label: "More energy", sub: "Stop the afternoon crashes" },
    { id: "off_meds", label: "Reduce medication", sub: "With my doctor's guidance" },
    { id: "other", label: "Something else", sub: "Tell us in your words" },
  ];

  return (
    <div className="min-h-screen bg-background py-10 px-4 font-sans">
      <div className="max-w-xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center mb-6">
          <Vita posture={posture} size={88} />
        </div>

        <Card className="p-8 border-border/60 shadow-sm">
          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold mb-2 tracking-tight">Welcome — you're in.</h1>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                I'm VITA, your reset companion. Six quick questions and we'll set up Day 1.
                What should I call you?
              </p>
              <Label htmlFor="fn" className="text-sm">First name</Label>
              <Input
                id="fn"
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Maria"
                className="mt-1.5 mb-6"
              />
              <NavButtons
                onNext={() => setStep(2)}
                nextDisabled={!firstName.trim()}
                showBack={false}
              />
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-2xl font-bold mb-2 tracking-tight">
                What brings you here, {firstName}?
              </h1>
              <p className="text-muted-foreground mb-6 text-sm">
                Pick the one that matters most right now. You can change this later.
              </p>
              <div className="space-y-2 mb-6">
                {goalOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGoal(opt.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      goal === opt.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{opt.sub}</div>
                  </button>
                ))}
                {goal === "other" && (
                  <Input
                    autoFocus
                    placeholder="In a sentence…"
                    value={otherGoal}
                    onChange={(e) => setOtherGoal(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
              <NavButtons
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
                nextDisabled={!goal || (goal === "other" && !otherGoal.trim())}
              />
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-2xl font-bold mb-2 tracking-tight">How do you measure?</h1>
              <p className="text-muted-foreground mb-6 text-sm">
                Pick the units you're used to. We'll show everything in your preferred format.
              </p>

              <div className="mb-5">
                <Label className="text-sm">Weight</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <UnitToggle active={weightUnit === "lb"} onClick={() => setWeightUnit("lb")}>
                    Pounds (lb)
                  </UnitToggle>
                  <UnitToggle active={weightUnit === "kg"} onClick={() => setWeightUnit("kg")}>
                    Kilograms (kg)
                  </UnitToggle>
                </div>
              </div>

              <div className="mb-6">
                <Label className="text-sm">Blood sugar</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <UnitToggle active={glucoseUnit === "mgdl"} onClick={() => setGlucoseUnit("mgdl")}>
                    mg/dL (US)
                  </UnitToggle>
                  <UnitToggle active={glucoseUnit === "mmoll"} onClick={() => setGlucoseUnit("mmoll")}>
                    mmol/L (UK/CA)
                  </UnitToggle>
                </div>
              </div>

              <NavButtons onBack={() => setStep(2)} onNext={() => setStep(4)} />
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="text-2xl font-bold mb-2 tracking-tight">Today's baseline</h1>
              <p className="text-muted-foreground mb-6 text-sm">
                Optional — but a starting line makes your progress chart meaningful. You can skip.
              </p>

              <div className="mb-4">
                <Label htmlFor="w" className="text-sm">
                  Weight ({weightUnit === "kg" ? "kg" : "lb"})
                </Label>
                <Input
                  id="w"
                  inputMode="decimal"
                  placeholder={weightUnit === "kg" ? "e.g. 82.5" : "e.g. 182"}
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="mt-1.5"
                />
                {weightErr && <p className="text-xs text-destructive mt-1.5">{weightErr}</p>}
              </div>

              <div className="mb-6">
                <Label htmlFor="g" className="text-sm">
                  Fasting blood sugar ({glucoseUnit === "mmoll" ? "mmol/L" : "mg/dL"})
                </Label>
                <Input
                  id="g"
                  inputMode="decimal"
                  placeholder={glucoseUnit === "mmoll" ? "e.g. 7.2" : "e.g. 130"}
                  value={glucoseInput}
                  onChange={(e) => setGlucoseInput(e.target.value)}
                  className="mt-1.5"
                />
                {glucoseErr && <p className="text-xs text-destructive mt-1.5">{glucoseErr}</p>}
                <p className="text-xs text-muted-foreground mt-2">
                  Educational only — not a diagnosis. Keep working with your doctor.
                </p>
              </div>

              <NavButtons
                onBack={() => setStep(3)}
                onNext={() => {
                  if (validateBaseline()) setStep(5);
                }}
                nextLabel="Continue"
              />
            </>
          )}

          {step === 5 && (
            <>
              <h1 className="text-2xl font-bold mb-2 tracking-tight">Stay in the loop</h1>
              <p className="text-muted-foreground mb-5 text-sm">
                A short weekly Reset Brief on WhatsApp — recipes, tips, and a nudge. Skip and
                you'll still get it by email.
              </p>
              <Label htmlFor="ph" className="text-sm">WhatsApp number</Label>
              <Input
                id="ph"
                type="tel"
                inputMode="tel"
                placeholder="+1 555 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 mb-4"
              />
              <div className="flex items-start space-x-2 mb-6">
                <Checkbox
                  id="wa-consent"
                  checked={waConsent}
                  onCheckedChange={(c) => setWaConsent(c === true)}
                  className="mt-0.5"
                />
                <label htmlFor="wa-consent" className="text-sm cursor-pointer leading-snug">
                  Yes, send me the weekly Reset Brief. Reply STOP anytime.
                </label>
              </div>
              <NavButtons
                onBack={() => setStep(4)}
                onNext={() => setStep(6)}
                nextDisabled={waConsent && !phone.trim()}
                nextLabel={waConsent ? "Continue" : "Skip — email only"}
              />
            </>
          )}

          {step === 6 && (
            <>
              <h1 className="text-2xl font-bold mb-2 tracking-tight">
                Ready to start Day 1, {firstName}.
              </h1>
              <p className="text-muted-foreground mb-5 text-sm leading-relaxed">
                One small action today: <strong className="text-foreground">a full glass of
                water before each meal.</strong> That's it. We'll meet you on the dashboard.
              </p>
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-6">
                <p className="text-xs uppercase tracking-wide text-primary font-semibold mb-1">
                  Your 14 days
                </p>
                <ul className="text-sm space-y-1.5 text-foreground/80">
                  <li><strong>Days 1–5:</strong> One 10-min Reset action a day.</li>
                  <li><strong>Days 6–7:</strong> Library unlocks.</li>
                  <li><strong>Days 8–14:</strong> Full Q&A + recipes.</li>
                  <li><strong>Day 15:</strong> $67/mo begins. Cancel anytime.</li>
                </ul>
              </div>
              <Button
                onClick={finish}
                disabled={saving}
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground h-12 text-base font-semibold"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Take me to my dashboard
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-4 leading-relaxed">
                Educational content only, not medical advice. 30-day money-back guarantee.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Continue",
  showBack = true,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  showBack?: boolean;
}) {
  return (
    <div className="flex gap-3">
      {showBack && onBack && (
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
      )}
      <Button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground"
      >
        {nextLabel}
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}

function UnitToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}
