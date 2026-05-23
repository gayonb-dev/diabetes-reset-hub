import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, BookOpen, Lock, LineChart, MessageCircleQuestion } from "lucide-react";

const DAYS: Record<number, { title: string; teaser: string }> = {
  1: { title: "Hydration Reset", teaser: "One glass of water before each meal. That's the whole assignment." },
  2: { title: "Plate Method Basics", teaser: "Build one plate today: ½ veg, ¼ protein, ¼ slow carbs." },
  3: { title: "Movement Snacks", teaser: "A 5-minute walk after your biggest meal." },
  4: { title: "Sugar Audit", teaser: "Read the label on three things you eat regularly. Just notice." },
  5: { title: "Build the Habit", teaser: "Stack today's reset onto something you already do." },
  6: { title: "Consolidation", teaser: "Library unlocks today. Pick one recipe that fits your life." },
  7: { title: "Reflect & Plan", teaser: "Write one commitment for next week." },
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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
      .then(({ data }) => setCompleted(new Set((data || []).map((r) => r.day_number))));
  }, [user]);

  // Day X of 14 (membership day count)
  const memberDay = useMemo(() => {
    const start = subscription?.created_at
      ? new Date(subscription.created_at)
      : new Date();
    const diff = Math.floor((startOfDay(new Date()).getTime() - startOfDay(start).getTime()) / 86400000);
    return Math.min(Math.max(diff + 1, 1), 14);
  }, [subscription]);

  // Sprint day: which day's action to surface (1–7)
  const sprintDay = Math.min(memberDay, 7);
  const todays = DAYS[sprintDay];
  const sprintDone = completed.size >= 7;
  const libraryUnlocked = memberDay >= 6 || completed.size >= 5;

  const firstName = user?.email?.split("@")[0] ?? "";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6">
      {/* Header + progress */}
      <div>
        <p className="text-sm text-muted-foreground">
          {greeting}{firstName ? `, ${firstName}` : ""}.
        </p>
        <div className="mt-3 flex items-baseline justify-between">
          <h1 className="font-heading font-semibold text-2xl text-foreground">
            Day {memberDay} of 14
          </h1>
          <span className="text-sm text-muted-foreground">
            {completed.size}/7 actions done
          </span>
        </div>
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(memberDay / 14) * 100}%` }}
          />
        </div>
      </div>

      {/* The one thing */}
      {!sprintDone ? (
        <Card className="p-6 md:p-8 border border-border shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-primary mb-2">
            Today's action
          </p>
          <h2 className="font-heading font-semibold text-2xl md:text-3xl mb-3 text-foreground">
            Day {sprintDay}: {todays.title}
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">{todays.teaser}</p>
          <Link to={`/app/day/${sprintDay}`}>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Open today's action <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="p-6 md:p-8 border border-border shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-primary mb-2">
            Sprint complete
          </p>
          <h2 className="font-heading font-semibold text-2xl mb-3 text-foreground">
            Keep the rhythm going
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Log today's numbers and browse the library when you have a question.
          </p>
          <Link to="/app/progress">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Log today <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </Card>
      )}

      {/* Secondary tabs */}
      <div className="grid sm:grid-cols-3 gap-3">
        <SecondaryTile
          to="/app/progress"
          icon={<LineChart className="h-4 w-4" />}
          label="Progress"
          sub="Log today"
        />
        <SecondaryTile
          to={libraryUnlocked ? "/app/library" : "#"}
          icon={libraryUnlocked ? <BookOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          label="Library"
          sub={libraryUnlocked ? "Recipes · movement · guides" : "Opens on Day 6"}
          disabled={!libraryUnlocked}
        />
        <SecondaryTile
          to="/app/ask"
          icon={<MessageCircleQuestion className="h-4 w-4" />}
          label="Ask"
          sub="Search answered questions"
        />
      </div>

      <p className="text-xs text-muted-foreground text-center pt-2">
        Educational only — not medical advice. Always consult your healthcare provider.
      </p>
    </div>
  );
}

function SecondaryTile({
  to,
  icon,
  label,
  sub,
  disabled,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  disabled?: boolean;
}) {
  const inner = (
    <Card
      className={`p-4 border border-border transition-colors ${
        disabled ? "opacity-60 cursor-not-allowed" : "hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      <div className="flex items-center gap-2 text-foreground">
        <span className="text-primary">{icon}</span>
        <span className="font-medium text-sm">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </Card>
  );
  if (disabled) return inner;
  return <Link to={to}>{inner}</Link>;
}
