import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useFastingProfile } from "@/hooks/useFastingProfile";

const MED_OPTIONS: { value: string; label: string }[] = [
  { value: "insulin", label: "Insulin" },
  { value: "sulfonylurea", label: "Sulfonylureas (glipizide, glyburide, glimepiride, gliclazide)" },
  { value: "glinide", label: "Repaglinide or nateglinide" },
  { value: "none", label: "None of these" },
  { value: "unsure", label: "I'm not sure" },
];

const EXCLUSIONS: { key: string; label: string }[] = [
  { key: "type1", label: "Do you have type 1 diabetes?" },
  { key: "pregnant_or_nursing", label: "Are you pregnant or breastfeeding?" },
  { key: "disordered_eating", label: "Do you have a history of disordered eating?" },
];

export function deriveEligibility(
  medication: string | null,
  exclusions: Record<string, boolean>,
): "eligible" | "needs_doctor" | "not_eligible" {
  if (Object.values(exclusions).some(Boolean)) return "not_eligible";
  if (medication === "insulin" || medication === "sulfonylurea" || medication === "glinide" || medication === "unsure")
    return "needs_doctor";
  return "eligible";
}

interface Props {
  /** Called after the answers are saved */
  onComplete?: () => void;
  compact?: boolean;
}

export default function FastingScreening({ onComplete, compact }: Props) {
  const { profile, save, eligibility } = useFastingProfile();
  const [medication, setMedication] = useState<string | null>(profile?.medication_class ?? null);
  const [exclusions, setExclusions] = useState<Record<string, boolean | undefined>>(
    (profile?.fasting_exclusions as Record<string, boolean>) || {},
  );
  const [saving, setSaving] = useState(false);
  const [doctorChecked, setDoctorChecked] = useState(!!profile?.doctor_confirmed_at);

  const answeredAllExclusions = EXCLUSIONS.every((e) => typeof exclusions[e.key] === "boolean");
  const ready = !!medication && answeredAllExclusions;

  const submit = async () => {
    if (!ready) return;
    setSaving(true);
    const clean = Object.fromEntries(EXCLUSIONS.map((e) => [e.key, !!exclusions[e.key]]));
    const next = deriveEligibility(medication, clean);
    const { error } = await save({
      medication_class: medication,
      fasting_exclusions: clean,
      fasting_eligibility: next,
      // an exclusion always clears any previously chosen target
      ...(next === "not_eligible" ? { fasting_target: 0, doctor_confirmed_at: null } : {}),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save your answers", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Answers saved" });
    onComplete?.();
  };

  const confirmDoctor = async (checked: boolean) => {
    setDoctorChecked(checked);
    await save({ doctor_confirmed_at: checked ? new Date().toISOString() : null });
  };

  const showResult = eligibility !== "unscreened" && !!profile?.medication_class;

  return (
    <Card className={`${compact ? "p-4" : "p-5"} border-border rounded-xl shadow-warm space-y-5`}>
      <div>
        <h2 className="font-heading font-semibold text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Fasting safety check
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Some diabetes medications lower blood sugar on a schedule. If you're fasting while the medication is
          still working, blood sugar can drop too low. That's why we ask.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Do you take any of these?</p>
        {MED_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setMedication(o.value)}
            className={`w-full text-left rounded-lg border px-3 py-3 min-h-11 text-sm transition-colors ${
              medication === o.value ? "border-primary bg-primary-muted text-primary" : "border-border"
            }`}
          >
            {o.label}
          </button>
        ))}
        {medication === "unsure" && (
          <p className="text-xs text-muted-foreground rounded-lg bg-muted px-3 py-2">
            Check your pill bottle or box. If you see glipizide, glyburide, glimepiride, gliclazide, repaglinide,
            or nateglinide — or if you take any insulin — that's the group we mean. Your pharmacist can confirm in
            one phone call.
          </p>
        )}
      </div>

      <div className="space-y-3">
        {EXCLUSIONS.map((e) => (
          <div key={e.key} className="flex items-center justify-between gap-3">
            <span className="text-sm">{e.label}</span>
            <div className="flex gap-2 shrink-0">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setExclusions((s) => ({ ...s, [e.key]: v }))}
                  className={`min-h-11 px-4 rounded-lg border text-sm ${
                    exclusions[e.key] === v ? "border-primary bg-primary-muted text-primary" : "border-border"
                  }`}
                >
                  {v ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={submit} disabled={!ready || saving} className="w-full h-12">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save answers
      </Button>

      {showResult && eligibility === "not_eligible" && (
        <div className="rounded-lg bg-muted px-3 py-3">
          <p className="text-sm text-foreground">
            Fasting isn't part of your plan, and it doesn't need to be. It's one optional tool among several — the
            plate method, post-meal walks, and consistent meal timing do the heavy lifting, and they're all still
            yours.
          </p>
        </div>
      )}

      {showResult && eligibility === "needs_doctor" && (
        <div className="rounded-lg bg-accent-muted px-3 py-3 space-y-3">
          <p className="text-sm text-accent">
            Fasting can be safe with your medication — but only if your doctor adjusts your doses first. Low blood
            sugar is a real risk otherwise. Talk to them, then come back.
          </p>
          <label className="flex items-start gap-3 cursor-pointer min-h-11">
            <Checkbox
              checked={doctorChecked}
              onCheckedChange={(c) => confirmDoctor(!!c)}
              className="mt-0.5"
            />
            <span className="text-sm">I've discussed fasting with my doctor</span>
          </label>
        </div>
      )}

      {showResult && eligibility === "eligible" && (
        <p className="text-sm text-status-normal">You're clear to use the fasting tools when you're ready.</p>
      )}
    </Card>
  );
}
