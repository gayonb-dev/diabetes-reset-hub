import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Loader2, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useProgramDay } from "@/hooks/useProgramDay";
import { useGamification } from "@/hooks/useGamification";

const DAY_CONTENT: Record<number, { title: string; body: string; action: string }> = {
  1: {
    title: "Hydration Reset",
    body: "Most people with elevated blood sugar are chronically under-hydrated. Today: drink one full glass of water before each meal. That's it. No counting ounces, no apps. Just three glasses, three times.",
    action: "Drank water before each meal today",
  },
  2: {
    title: "Plate Method Basics",
    body: "At your next meal, build your plate this way: ½ non-starchy vegetables, ¼ lean protein, ¼ slow carbs. Use any plate you already own. No measuring cups required.",
    action: "Built one plate-method meal today",
  },
  3: {
    title: "Movement Snacks",
    body: "Walk for 5 minutes after your largest meal. That single walk lowers post-meal blood sugar by 10–20% for most people. Set a phone alarm if you'll forget.",
    action: "Took a 5-min walk after a meal",
  },
  4: {
    title: "Sugar Audit",
    body: "Look at the labels on three things you drink or eat regularly. Find the added sugars line. Don't change anything yet — just notice. Awareness is the first lever.",
    action: "Checked sugar on 3 items",
  },
  5: {
    title: "Build the Habit",
    body: "Stack today's reset onto something you already do. Example: 'After I brush my teeth, I drink a glass of water.' Pick one stack and write it down.",
    action: "Created one habit stack",
  },
  6: {
    title: "Consolidation",
    body: "You've unlocked the Library. Browse one recipe and one plate method that fits your life. The library is yours to use as a tool — not a homework list.",
    action: "Browsed the library",
  },
  7: {
    title: "Reflect & Plan",
    body: "What's one thing from this week you'll keep doing? Write it down. That's your starting commitment for the next 7 days.",
    action: "Wrote my one commitment",
  },
};

export default function DayDetail() {
  const { day } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentProgramDay = useProgramDay();
  const { recordAction } = useGamification();
  const dayN = Math.max(1, Math.min(7, Number(day) || 1));
  const content = DAY_CONTENT[dayN];
  const isLocked = dayN > currentProgramDay;

  const [notes, setNotes] = useState("");
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("member_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("day_number", dayN)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCompleted(true);
          setNotes(data.notes || "");
        }
      });
  }, [user, dayN]);

  const handleComplete = async () => {
    if (!user || isLocked) return;
    setSaving(true);
    const { error } = await supabase
      .from("member_progress")
      .upsert(
        { user_id: user.id, day_number: dayN, notes, completed_at: new Date().toISOString() },
        { onConflict: "user_id,day_number" },
      );
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    setCompleted(true);
    // Wire streak/XP pipeline
    recordAction("daily_action").catch(() => {});
    toast({ title: `Day ${dayN} complete ✓`, description: "Nice work. See you tomorrow." });
    if (dayN < 7) setTimeout(() => navigate("/app"), 1200);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link to="/app" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to dashboard
      </Link>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
          Day {dayN}
        </p>
        <h1 className="font-heading font-bold text-3xl md:text-4xl mb-3">{content.title}</h1>
      </div>

      <Card className="p-6">
        <p className="text-foreground leading-relaxed">{content.body}</p>
      </Card>

      <Card className="p-6">
        <h3 className="font-heading font-bold mb-2">Today's one action</h3>
        <p className="text-muted-foreground mb-4">{content.action}</p>

        {isLocked ? (
          <>
            <div className="rounded-md border border-dashed border-border bg-muted/40 p-4 mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              Unlocks on Day {dayN}. You're on Day {currentProgramDay}.
            </div>
            <Button disabled className="w-full">
              Locked
            </Button>
          </>
        ) : (
          <>
            <Textarea
              placeholder="Optional: how did it go? Any wins or blockers?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mb-4"
              rows={3}
            />
            {completed ? (
              <div className="flex items-center gap-2 text-primary font-semibold">
                <CheckCircle2 className="h-5 w-5" /> Day {dayN} marked complete
              </div>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={saving}
                className="w-full bg-primary hover:bg-primary-dark text-primary-foreground"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Mark Day Complete"
                )}
              </Button>
            )}
          </>
        )}
      </Card>

      {dayN < 7 && completed && !isLocked && (
        <Link to={`/app/day/${dayN + 1}`}>
          <Button variant="outline" className="w-full">
            Continue to Day {dayN + 1}
          </Button>
        </Link>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Educational only — not medical advice.
      </p>
    </div>
  );
}
