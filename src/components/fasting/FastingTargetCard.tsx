import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useFastingProfile } from "@/hooks/useFastingProfile";
import { clampWindowStart, formatHour, rampStatus, TARGET_LABEL, type FastingTarget } from "@/lib/mealTiming";

const OPTIONS: { value: FastingTarget; title: string; desc: string }[] = [
  { value: 1, title: "12:12", desc: "Twelve hours fasting, twelve hours eating. The gentlest option — for most people it means finishing dinner and eating breakfast at the usual time." },
  { value: 2, title: "14:10", desc: "Fourteen hours fasting, a ten-hour eating window. A moderate step up — usually a slightly later breakfast." },
  { value: 3, title: "16:8", desc: "Sixteen hours fasting, an eight-hour eating window. The longest option we offer, and not automatically the best one." },
];

export default function FastingTargetCard() {
  const { profile, storedTarget, target, save, canFast } = useFastingProfile();
  const [saving, setSaving] = useState(false);
  const startHour = clampWindowStart(profile?.window_start_hour ?? 8);
  const ramp = rampStatus(profile);

  if (!canFast) return null;

  const choose = async (value: FastingTarget) => {
    setSaving(true);
    const { error } = await save({
      fasting_target: value,
      fasting_started_on: value === 0 ? null : (profile?.fasting_started_on ?? new Date().toISOString().slice(0, 10)),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: value === 0 ? "Fasting stopped — no penalty, nothing lost." : `Target set to ${TARGET_LABEL[value]}` });
  };

  const setStart = async (h: number) => {
    const { error } = await save({ window_start_hour: clampWindowStart(h) });
    if (error) toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
  };

  return (
    <Card className="p-5 border-border rounded-xl shadow-warm space-y-4">
      <div>
        <h2 className="font-heading font-semibold text-base">Your fasting window</h2>
        <p className="text-sm text-muted-foreground mt-2">
          A longer fast isn't automatically better. The research shows benefit across windows from six to ten
          hours, and the schedule you actually keep beats the ambitious one you abandon.
        </p>
      </div>

      <div className="space-y-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={saving}
            onClick={() => choose(o.value)}
            className={`w-full text-left rounded-lg border px-3 py-3 transition-colors ${
              storedTarget === o.value ? "border-primary bg-primary-muted" : "border-border"
            }`}
          >
            <span className="text-sm font-semibold tabular-nums">{o.title}</span>
            <span className="block text-xs text-muted-foreground mt-1">{o.desc}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground rounded-lg bg-muted px-3 py-2">
        We start everyone at twelve hours for the first week. It's a safety buffer, not a test — if a medication
        got missed on the screening, a gentle first week catches it before a longer fast would.
      </p>

      {storedTarget > 0 && (
        <p className="text-xs text-foreground">
          <span className="font-medium">What changes and when: </span>
          {ramp.description}
        </p>
      )}


      {storedTarget > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Eating window starts at</p>
          <div className="flex flex-wrap gap-2">
            {[6, 7, 8, 9, 10, 11].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setStart(h)}
                className={`min-h-11 px-3 rounded-lg border text-sm tabular-nums ${
                  startHour === h ? "border-primary bg-primary-muted text-primary" : "border-border"
                }`}
              >
                {formatHour(h)}
              </button>
            ))}
          </div>
          {startHour > 9 && (
            <p className="text-xs text-muted-foreground">
              Eating earlier in the day tends to work better for blood sugar — but a schedule you keep beats a
              perfect one you don't.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            In force today: <span className="tabular-nums">{TARGET_LABEL[target as FastingTarget]}</span>. Duration is
            set by your target; you can change target or stop at any time with no penalty.
          </p>
          <Button variant="outline" className="w-full h-11" disabled={saving} onClick={() => choose(0)}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Stop fasting
          </Button>
        </div>
      )}
    </Card>
  );
}
