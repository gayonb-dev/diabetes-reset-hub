import { Card } from "@/components/ui/card";
import FastingScreening from "@/components/safety/FastingScreening";
import FastingTargetCard from "@/components/fasting/FastingTargetCard";
import { useFastingProfile } from "@/hooks/useFastingProfile";
import { toast } from "@/hooks/use-toast";

const BEDTIMES = [20, 21, 22, 23];

export default function FastingSettingsSection() {
  const { profile, loading, save, reload } = useFastingProfile();
  if (loading) return null;

  const bedtime = profile?.bedtime_hour ?? 22;

  return (
    <>
      <Card className="p-5 border-border rounded-xl shadow-warm">
        <h2 className="font-heading font-semibold text-base mb-1">Bedtime</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Your last meal is scheduled at least 3 hours before bed.
        </p>
        <div className="grid grid-cols-4 gap-2">
          {BEDTIMES.map((h) => (
            <button
              key={h}
              type="button"
              onClick={async () => {
                const { error } = await save({ bedtime_hour: h });
                if (error) toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
              }}
              className={`min-h-11 rounded-lg border text-sm tabular-nums ${
                bedtime === h ? "border-primary bg-primary-muted text-primary" : "border-border"
              }`}
            >
              {h === 12 ? "12pm" : `${h - 12}pm`}
            </button>
          ))}
        </div>
      </Card>

      <FastingScreening onComplete={reload} />
      <FastingTargetCard />
    </>
  );
}
