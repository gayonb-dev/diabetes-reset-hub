import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Pause, ChevronRight } from "lucide-react";
import { Vita } from "@/components/vita/Vita";
import { cn } from "@/lib/utils";
import { getWorkoutBySlug, REST_SECONDS } from "@/data/workouts";

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function BreathingVita() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="animate-[breath_4s_ease-in-out_infinite] origin-bottom">
        <Vita posture="encouraging" size={64} />
      </div>
      <p className="text-xs text-muted-foreground">Breathe with VITA</p>
      <style>{`@keyframes breath {0%,100%{transform:translateY(2px) scale(0.98)}50%{transform:translateY(-4px) scale(1.02)}}`}</style>
    </div>
  );
}

export default function WorkoutSession() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const workout = useMemo(() => (slug ? getWorkoutBySlug(slug) : undefined), [slug]);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [resting, setResting] = useState(false);
  const [restRemaining, setRestRemaining] = useState(0);
  const startedAtRef = useRef<number>(Date.now());

  // Create or resume session
  useEffect(() => {
    if (!user || !workout) return;
    const isResume = params.get("resume") === "1";
    (async () => {
      if (isResume) {
        const { data } = await supabase
          .from("workout_sessions")
          .select("id,exercises_completed,started_at")
          .eq("user_id", user.id)
          .eq("workout_slug", workout.slug)
          .in("status", ["in_progress", "paused"])
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          setSessionId(data.id);
          setCurrentIdx(Math.min(data.exercises_completed, workout.exercises.length - 1));
          startedAtRef.current = new Date(data.started_at).getTime();
          await supabase
            .from("workout_sessions")
            .update({ status: "in_progress" })
            .eq("id", data.id);
          return;
        }
      }
      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          workout_slug: workout.slug,
          workout_name: workout.name,
          track: workout.track,
          status: "in_progress",
          exercises_total: workout.exercises.length,
        })
        .select("id")
        .single();
      if (!error && data) {
        setSessionId(data.id);
        startedAtRef.current = Date.now();
      }
    })();
  }, [user, workout, params]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Rest countdown
  useEffect(() => {
    if (!resting) return;
    if (restRemaining <= 0) {
      setResting(false);
      return;
    }
    const t = setTimeout(() => setRestRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resting, restRemaining]);

  if (!workout) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Workout not found.</p>
        <Link to="/app/workouts" className="text-sm text-primary underline">
          Back to workouts
        </Link>
      </div>
    );
  }

  const isLast = currentIdx >= workout.exercises.length - 1;
  const current = workout.exercises[currentIdx];

  async function completeExercise() {
    if (!sessionId) return;
    await supabase
      .from("workout_sessions")
      .update({ exercises_completed: currentIdx + 1 })
      .eq("id", sessionId);

    if (isLast) {
      const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
      await supabase
        .from("workout_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          duration_seconds: seconds,
        })
        .eq("id", sessionId);
      navigate(`/app/workouts/${workout.slug}/complete?session=${sessionId}`);
      return;
    }

    // Start rest
    setRestRemaining(REST_SECONDS[current.rest]);
    setResting(true);
    setCurrentIdx((i) => i + 1);
  }

  async function pauseAndExit() {
    if (sessionId) {
      await supabase
        .from("workout_sessions")
        .update({ status: "paused" })
        .eq("id", sessionId);
    }
    navigate("/app/workouts");
  }

  async function abandonAndExit() {
    if (sessionId) {
      await supabase
        .from("workout_sessions")
        .update({ status: "abandoned", completed_at: new Date().toISOString() })
        .eq("id", sessionId);
    }
    navigate("/app/workouts");
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading font-semibold text-xl text-foreground">{workout.name}</h1>
          <p className="text-sm text-muted-foreground tabular-nums">{formatTime(elapsed)}</p>
        </div>
        <Vita posture="encouraging" size={48} />
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {workout.exercises.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i < currentIdx ? "bg-primary" : i === currentIdx ? "bg-accent" : "bg-muted",
            )}
          />
        ))}
      </div>

      {/* Rest or exercise card */}
      {resting ? (
        <Card className="p-6 border-border bg-primary-muted/40 text-center space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Rest</p>
          <p className="text-5xl font-semibold text-foreground tabular-nums">{restRemaining}s</p>
          <BreathingVita />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              setResting(false);
              setRestRemaining(0);
            }}
          >
            Skip rest
          </Button>
        </Card>
      ) : (
        <Card className="p-5 border-border space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{current.name}</h3>
            <p className="text-[22px] font-semibold text-accent mt-1">
              {current.reps || current.duration}
            </p>
          </div>
          <p className="text-[13px] text-muted-foreground">{current.modification}</p>
          <Button
            className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            onClick={completeExercise}
          >
            {isLast ? (
              <>Finish workout <Check className="h-4 w-4 ml-1" /></>
            ) : (
              <>Done — next <ChevronRight className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        </Card>
      )}

      <div className="flex justify-between text-xs">
        <Button variant="ghost" size="sm" onClick={pauseAndExit} className="text-muted-foreground">
          <Pause className="h-3.5 w-3.5 mr-1" /> Pause & exit
        </Button>
        <Button variant="ghost" size="sm" onClick={abandonAndExit} className="text-muted-foreground">
          <X className="h-3.5 w-3.5 mr-1" /> End session
        </Button>
      </div>
    </div>
  );
}
