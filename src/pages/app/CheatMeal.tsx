import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useProgramDay } from "@/hooks/useProgramDay";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Loader2, Utensils } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EmptyState from "@/components/ui/empty-state";
import { useWeekStart } from "@/hooks/useWeekStart";
import { startOfWeek, dayIndexInWeek, orderedDayLabels } from "@/lib/weekStart";

interface CheatMeal {
  id: string;
  logged_at: string;
  meal_description: string | null;
  fast_start_at: string | null;
  week_start_date: string;
}

// Week boundaries follow the member's week-start preference (see useWeekStart).


function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
void startOfDay; // reserved for local time calculations

export default function CheatMeal() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<CheatMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const currentProgramDay = useProgramDay();
  const { weekStart } = useWeekStart();


  const refresh = async () => {
    if (!user) return;
    const sb = supabase as unknown as SupabaseClient;
    const { data } = await sb
      .from("cheat_meals")
      .select("*")
      .eq("member_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(16);
    setMeals((data || []) as CheatMeal[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const thisWeekStart = startOfWeek(new Date(), weekStart);
  const thisWeekKey = thisWeekStart.toISOString().slice(0, 10);
  const usedThisWeek = meals.find((m) => m.week_start_date === thisWeekKey);
  const isEvening = new Date().getHours() >= 17;
  const isUnlocked = currentProgramDay >= 21;

  const eligibility: { ok: boolean; reason?: string } = !isUnlocked
    ? { ok: false, reason: `Unlocks on Day 21. You're on Day ${currentProgramDay}.` }
    : usedThisWeek
    ? { ok: false, reason: `You've logged your off-plan meal this week. Next available: ${new Date(thisWeekStart.getTime() + 7 * 86400000).toLocaleDateString()}.` }
    : !isEvening
    ? { ok: false, reason: "Off-plan meal logging is available after 5 PM." }
    : { ok: true };

  const logCheatMeal = async () => {
    if (!user) return;
    setBusy(true);
    const now = new Date();
    const sb = supabase as unknown as SupabaseClient;
    const { error } = await sb.from("cheat_meals").insert({
      member_id: user.id,
      logged_at: now.toISOString(),
      meal_description: description || null,
      week_start_date: thisWeekKey,
      fast_start_at: null,
    });
    if (error) {
      setBusy(false);
      toast({ title: "Couldn't log meal", description: error.message, variant: "destructive" });
      return;
    }

    setBusy(false);
    setOpen(false);
    setDescription("");
    toast({
      title: "Logged",
      description: "Off-plan meal recorded.",
    });
    refresh();
  };

  // Week calendar
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(thisWeekStart);
    d.setDate(thisWeekStart.getDate() + i);
    return d;
  });
  const usedOnDay = usedThisWeek ? dayIndexInWeek(new Date(usedThisWeek.logged_at).getDay(), weekStart) : -1;
  const today = dayIndexInWeek(new Date().getDay(), weekStart);
  const dayLabels = orderedDayLabels(weekStart).map((l) => l[0]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-semibold text-2xl text-primary flex items-center gap-2">
          <Utensils className="h-6 w-6" /> Off-Plan Meal
        </h1>
        <p className="text-sm text-muted-foreground">One note per week, as your evening meal. Food choices are yours.</p>
      </div>

      {/* Rules */}
      <Card className="p-4 border border-accent/40 bg-accent-muted">
        <ul className="text-sm space-y-1 text-foreground">
          <li>• 1 off-plan meal note per week</li>
          <li>• Last meal of the day only</li>
          <li>• Available from Day 21</li>
        </ul>
      </Card>

      {/* Week calendar */}
      <Card className="p-5 border border-border">
        <p className="text-sm font-medium mb-3">This week</p>
        <div className="flex gap-1.5 overflow-x-auto">
          {weekDays.map((d, i) => {
            const isUsed = i === usedOnDay;
            const isPast = i < today;
            const label = dayLabels[i];
            return (
              <div
                key={i}
                className="flex-1 min-w-[44px] h-14 rounded-lg border border-border bg-card flex flex-col items-center justify-center gap-0.5 shrink-0"
              >
                <span className="text-[10px] text-tertiary-fg">{label}</span>
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                    isUsed
                      ? "bg-accent text-white"
                      : isPast
                      ? "bg-muted text-tertiary-fg"
                      : "text-foreground"
                  }`}
                >
                  {isUsed ? "🍽" : d.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Log button */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            disabled={!eligibility.ok}
            className="w-full h-14 lg:h-[52px] bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Log my off-plan meal
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Log your off-plan meal</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs text-muted-foreground">What did you have? (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., jerk chicken with rice, a slice of cake, ..."
                rows={2}
              />
            </div>
            <Button
              onClick={logCheatMeal}
              disabled={busy}
              className="w-full h-[52px] bg-primary hover:bg-primary/90"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      {!eligibility.ok && <p className="text-xs text-muted-foreground text-center">{eligibility.reason}</p>}

      {/* Past meals */}
      <Card className="p-5 border border-border">
        <p className="text-sm font-medium mb-3">Past off-plan meals</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : meals.length === 0 ? (
          <EmptyState
            title="No off-plan meals logged yet"
            description={isUnlocked ? "Log your first when you're ready, one per week, evening only." : `Unlocks on Day 21. You're on Day ${currentProgramDay}.`}
            posture="encouraging"
            vitaSize={56}
          />
        ) : (
          <div className="divide-y divide-border">
            {meals.map((m) => (
              <div key={m.id} className="py-3 text-sm">
                <div className="flex justify-between items-start">
                  <span className="font-medium">
                    {new Date(m.logged_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  {m.fast_start_at && (
                    <span className="text-xs text-status-normal">Fast started</span>
                  )}
                </div>
                {m.meal_description && (
                  <p className="text-xs text-muted-foreground mt-1">{m.meal_description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
