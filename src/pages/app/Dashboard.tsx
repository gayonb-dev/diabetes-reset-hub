import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Lock, ArrowRight } from "lucide-react";

const DAYS = [
  { n: 1, title: "Hydration Reset" },
  { n: 2, title: "Plate Method Basics" },
  { n: 3, title: "Movement Snacks" },
  { n: 4, title: "Sugar Audit" },
  { n: 5, title: "Build the Habit" },
  { n: 6, title: "Consolidation" },
  { n: 7, title: "Reflect & Plan" },
];

function daysSince(start: string) {
  return Math.floor((Date.now() - new Date(start).getTime()) / 86400000);
}

export default function Dashboard() {
  const { user, subscription } = useAuth();
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase
      .from("member_progress")
      .select("day_number")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setCompleted(new Set((data || []).map((r) => r.day_number)));
      });
  }, [user]);

  const currentDay = useMemo(() => {
    if (!subscription) return 1;
    // Day number = days since signup + 1, capped at 7 for the sprint
    const since = daysSince(subscription.trial_end_date
      ? new Date(new Date(subscription.trial_end_date).getTime() - 14 * 86400000).toISOString()
      : new Date().toISOString());
    return Math.min(Math.max(since + 1, 1), 14);
  }, [subscription]);

  const sprintProgress = Math.round((completed.size / 7) * 100);
  const libraryUnlocked = currentDay >= 6 || completed.size >= 5;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-1">
          Welcome back 👋
        </h1>
        <p className="text-muted-foreground">
          You're on <strong>Day {Math.min(currentDay, 7)}</strong> of your 7-Day Reset Sprint.
        </p>
      </div>

      {/* Progress bar */}
      <Card className="p-5">
        <div className="flex justify-between mb-2">
          <span className="font-semibold text-sm">7-Day Reset Sprint</span>
          <span className="text-sm text-muted-foreground">{completed.size}/7 complete</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${sprintProgress}%` }}
          />
        </div>
      </Card>

      {/* Today CTA */}
      <Card className="p-6 border-2 border-primary bg-primary/5">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Today</p>
        <h2 className="font-heading font-bold text-2xl mb-2">
          Day {Math.min(currentDay, 7)}: {DAYS[Math.min(currentDay, 7) - 1].title}
        </h2>
        <p className="text-muted-foreground mb-4">
          One small action today. 10 minutes max.
        </p>
        <Link to={`/app/day/${Math.min(currentDay, 7)}`}>
          <Button className="bg-primary hover:bg-primary-dark text-primary-foreground">
            Start Today's Reset <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </Card>

      {/* Days timeline */}
      <div>
        <h3 className="font-heading font-bold text-lg mb-3">Your 7-Day Path</h3>
        <div className="space-y-2">
          {DAYS.map((d) => {
            const isComplete = completed.has(d.n);
            const isAvailable = d.n <= currentDay;
            return (
              <Link
                key={d.n}
                to={isAvailable ? `/app/day/${d.n}` : "#"}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isAvailable
                    ? "hover:bg-primary/5 cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                } ${isComplete ? "bg-primary/5 border-primary/30" : ""}`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                ) : isAvailable ? (
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    Day {d.n}: {d.title}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Library teaser */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading font-bold mb-1">Recipe & Resource Library</h3>
            <p className="text-sm text-muted-foreground">
              {libraryUnlocked
                ? "Unlocked — browse recipes, plate methods, and movement videos."
                : "Unlocks after Day 5. Stay focused on the Sprint first."}
            </p>
          </div>
          {libraryUnlocked ? (
            <Link to="/app/library">
              <Button variant="outline" size="sm">
                Open <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          ) : (
            <Lock className="h-5 w-5 text-muted-foreground mt-1" />
          )}
        </div>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Coaching content only, not medical advice. Always consult your healthcare provider.
      </p>
    </div>
  );
}
