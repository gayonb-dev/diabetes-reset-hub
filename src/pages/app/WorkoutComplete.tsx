import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock, Activity } from "lucide-react";
import { Vita } from "@/components/vita/Vita";
import { cn } from "@/lib/utils";
import { getWorkoutBySlug, COOL_DOWN_ITEMS } from "@/data/workouts";
import { toast } from "@/hooks/use-toast";

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function WorkoutComplete() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const sessionId = params.get("session");
  const navigate = useNavigate();
  const { user } = useAuth();
  const workout = useMemo(() => (slug ? getWorkoutBySlug(slug) : undefined), [slug]);

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [duration, setDuration] = useState<number | null>(null);
  const [exercisesDone, setExercisesDone] = useState<number>(0);
  const [logged, setLogged] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    supabase
      .from("workout_sessions")
      .select("duration_seconds,exercises_completed,cool_down_checks")
      .eq("id", sessionId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDuration(data.duration_seconds ?? null);
          setExercisesDone(data.exercises_completed ?? 0);
          setChecks((data.cool_down_checks as Record<string, boolean>) || {});
        }
      });
  }, [sessionId]);

  if (!workout) {
    return (
      <div className="text-center py-12">
        <Link to="/app/workouts" className="text-sm text-primary underline">
          Back to workouts
        </Link>
      </div>
    );
  }

  function toggle(key: string) {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function logWorkout() {
    if (!sessionId || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("workout_sessions")
        .update({ cool_down_checks: checks })
        .eq("id", sessionId);
      if (error) throw error;
      // Award Reset Points (XP) via existing function
      await supabase.rpc("award_xp", { p_user_id: user.id, p_amount: 25 });
      setLogged(true);
      toast({ title: "Workout logged", description: "+25 Reset Points. Exercise ring closed." });
    } catch (e) {
      toast({ title: "Couldn't save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 text-center">
      <div className="flex justify-center pt-2">
        <div className="animate-scale-in">
          <Vita posture="celebrating" size={120} />
        </div>
      </div>

      <h1 className="text-[28px] font-bold text-primary">Workout complete.</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-left">
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Time
          </p>
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {duration != null ? formatTime(duration) : "—"}
          </p>
        </Card>
        <Card className="p-4 text-left">
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" /> Exercises
          </p>
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {exercisesDone} / {workout.exercises.length}
          </p>
        </Card>
      </div>

      <Card className="p-5 text-left space-y-3">
        <h2 className="font-medium text-foreground">Cool-down</h2>
        <div className="space-y-2">
          {COOL_DOWN_ITEMS.map((item) => {
            const done = !!checks[item.key];
            return (
              <button
                key={item.key}
                onClick={() => toggle(item.key)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 flex items-center gap-3 transition-colors",
                  done
                    ? "border-primary border-2 bg-primary-muted"
                    : "border-border hover:border-primary/40",
                )}
              >
                <span
                  className={cn(
                    "h-5 w-5 rounded border flex items-center justify-center shrink-0",
                    done ? "bg-primary border-primary" : "border-border",
                  )}
                >
                  {done && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                </span>
                <span className="text-sm text-foreground">{item.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {logged ? (
        <div className="space-y-3">
          <p className="text-sm text-primary font-medium">Logged ✓ — exercise ring closed.</p>
          <Button
            asChild
            variant="outline"
            className="w-full"
          >
            <Link to="/app">Back to today</Link>
          </Button>
        </div>
      ) : (
        <Button
          className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
          size="lg"
          onClick={logWorkout}
          disabled={saving}
        >
          {saving ? "Saving…" : "Log this workout"}
        </Button>
      )}
    </div>
  );
}
