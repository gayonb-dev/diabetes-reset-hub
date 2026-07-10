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
import { Vita } from "@/components/vita/Vita";

type ActionRow = {
  id: string;
  day_number: number;
  action_title: string;
  action_description: string | null;
  sub_tasks: unknown;
};

export default function DayDetail() {
  const { day } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentProgramDay = useProgramDay();
  const { recordAction } = useGamification();
  const dayN = Math.max(1, Number(day) || 1);
  const isLocked = dayN > currentProgramDay;

  const [action, setAction] = useState<ActionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: a } = await supabase
        .from("daily_actions")
        .select("id, day_number, action_title, action_description, sub_tasks")
        .eq("day_number", dayN)
        .eq("is_extension_day", false)
        .maybeSingle();
      if (cancelled) return;
      setAction((a as ActionRow | null) ?? null);

      const { data: prog } = await supabase
        .from("member_daily_progress")
        .select("status, notes")
        .eq("member_id", user.id)
        .eq("day_number", dayN)
        .maybeSingle();
      if (cancelled) return;
      if (prog?.status === "completed") {
        setCompleted(true);
        setNotes((prog.notes as string) || "");
      } else {
        setCompleted(false);
        setNotes("");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, dayN]);

  const handleComplete = async () => {
    if (!user || isLocked || !action) return;
    setSaving(true);
    const { error } = await supabase
      .from("member_daily_progress")
      .upsert(
        {
          member_id: user.id,
          action_id: action.id,
          day_number: dayN,
          status: "completed",
          notes,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "member_id,action_id" },
      );
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    setCompleted(true);
    recordAction("daily_action").catch(() => {});
    toast({ title: `Day ${dayN} complete ✓`, description: "Nice work. See you tomorrow." });
    setTimeout(() => navigate("/app"), 1200);
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
        <h1 className="font-heading font-bold text-3xl md:text-4xl mb-3">
          {loading ? "…" : action?.action_title ?? "Today's action"}
        </h1>
      </div>

      {loading ? (
        <Card className="p-6">
          <div className="h-4 w-2/3 rounded bg-muted animate-pulse mb-3" />
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
        </Card>
      ) : !action ? (
        <Card className="p-6 text-center space-y-3">
          <div className="flex justify-center">
            <Vita posture="neutral" size={96} />
          </div>
          <h3 className="font-heading font-bold text-lg">Today's action is being prepared.</h3>
          <p className="text-sm text-muted-foreground">
            Check back shortly — new days are added regularly.
          </p>
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {action.action_description}
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-heading font-bold mb-4">Today's one action</h3>

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
        </>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Educational only — not medical advice.
      </p>
    </div>
  );
}
