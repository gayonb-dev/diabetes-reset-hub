import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, Lock, Clock, Activity, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWorkoutsByTrack, type Workout } from "@/data/workouts";
import { useProgramDay } from "@/hooks/useProgramDay";
import { Vita } from "@/components/vita/Vita";

function DifficultyDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1" aria-label={`Difficulty ${level} of 3`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            i <= level ? "bg-accent" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

function WorkoutCard({ workout }: { workout: Workout }) {
  return (
    <Card className="p-4 border-border hover:border-primary/40 transition-colors flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-foreground text-base">{workout.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{workout.focus}</p>
        </div>
        <DifficultyDots level={workout.difficulty} />
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {workout.durationMin} min
        </span>
        <span className="inline-flex items-center gap-1">
          <Activity className="h-3.5 w-3.5" />
          {workout.exercises.length} exercises
        </span>
      </div>
      <Button asChild className="bg-primary hover:bg-primary-hover text-primary-foreground mt-1">
        <Link to={`/app/workouts/${workout.slug}`}>
          Begin workout <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </Button>
    </Card>
  );
}

export default function WorkoutLibrary() {
  const { user } = useAuth();
  const programDay = useProgramDay();
  const [kneeFriendly, setKneeFriendly] = useState<boolean | null>(null);
  const [resuming, setResuming] = useState<{ slug: string; name: string } | null>(null);

  const unlocked = programDay >= 29;

  useEffect(() => {
    if (!user || !unlocked) return;
    supabase
      .from("visitor_profiles")
      .select("knee_friendly")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setKneeFriendly(Boolean((data as { knee_friendly?: boolean } | null)?.knee_friendly));
      });

    supabase
      .from("workout_sessions")
      .select("workout_slug,workout_name,status")
      .eq("user_id", user.id)
      .in("status", ["in_progress", "paused"])
      .order("started_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const row = (data || [])[0];
        if (row) setResuming({ slug: row.workout_slug, name: row.workout_name });
      });
  }, [user, unlocked]);

  if (!unlocked) {
    const daysLeft = Math.max(0, 28 - programDay + 1);
    return (
      <div className="max-w-xl mx-auto text-center space-y-5 py-8">
        <div className="flex justify-center">
          <Vita posture="neutral" size={96} />
        </div>
        <h1 className="font-heading font-semibold text-2xl text-foreground">
          Workouts unlock at Day 29
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          Days 1–14 are diet foundation. Days 15–28 add post-meal walks. Structured workouts begin
          Day 29 — your body will be ready.
        </p>
        <Card className="p-4 border border-dashed inline-flex flex-col mx-auto">
          <p className="text-sm text-foreground">
            You're on <span className="font-semibold text-primary">Day {programDay}</span> of 28.
          </p>
          {daysLeft > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {daysLeft === 1 ? "1 day" : `${daysLeft} days`} until workouts unlock.
            </p>
          )}
        </Card>
        <Button asChild variant="outline">
          <Link to="/app">Back to today</Link>
        </Button>
      </div>
    );
  }

  const defaultTrack: "A" | "B" = kneeFriendly ? "B" : "A";

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="font-heading font-semibold text-2xl text-foreground">Workouts</h1>
        <p className="text-sm text-muted-foreground">
          Phase 3 unlocked. Aim for 3 sessions this week — your pick.
        </p>
      </div>

      {resuming && (
        <Card className="p-4 border border-accent/50 bg-accent-muted/40 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              You started {resuming.name} earlier.
            </p>
            <p className="text-xs text-muted-foreground">Pick up where you left off?</p>
          </div>
          <Button asChild size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground">
            <Link to={`/app/workouts/${resuming.slug}?resume=1`}>Resume</Link>
          </Button>
        </Card>
      )}

      <Tabs defaultValue={defaultTrack}>
        <TabsList className="bg-muted">
          <TabsTrigger value="A">Standard</TabsTrigger>
          <TabsTrigger value="B" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Knee-Friendly
          </TabsTrigger>
        </TabsList>

        <TabsContent value="A" className="mt-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            {kneeFriendly
              ? "Standard track — choose this if you'd like to test a higher-impact session today."
              : "Standard track — based on your profile, no knee modifications needed. Switch to Knee-Friendly anytime."}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {getWorkoutsByTrack("A").map((w) => (
              <WorkoutCard key={w.slug} workout={w} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="B" className="mt-4 space-y-4">
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            Knee-Friendly — zero high-impact movements. Every skip and jumping jack is replaced.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {getWorkoutsByTrack("B").map((w) => (
              <WorkoutCard key={w.slug} workout={w} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Card className="p-4 border-dashed text-xs text-muted-foreground inline-flex items-start gap-2">
        <Lock className="h-3.5 w-3.5 mt-0.5" />
        New workouts unlock as you progress into Month 3 (4×/week) and Month 4 (5×/week).
      </Card>
    </div>
  );
}
