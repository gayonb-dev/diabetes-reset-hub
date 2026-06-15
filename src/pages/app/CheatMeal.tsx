import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

interface CheatMeal {
  id: string;
  logged_at: string;
  meal_description: string | null;
  fast_start_at: string | null;
  week_start_date: string;
}

function startOfWeek(d: Date) {
  const out = new Date(d);
  const day = out.getDay(); // 0 Sun
  out.setDate(out.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function CheatMeal() {
  const { user, subscription } = useAuth();
  const [meals, setMeals] = useState<CheatMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [startFast, setStartFast] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const currentProgramDay = useMemo(() => {
    const start = subscription?.created_at ? new Date(subscription.created_at) : new Date();
    return Math.max(1, Math.floor((startOfDay(new Date()).getTime() - startOfDay(start).getTime()) / 86400000) + 1);
  }, [subscription]);

  const refresh = async () => {
    if (!user) return;
    const sb: any = supabase;
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

  const thisWeekStart = startOfWeek(new Date());
  const thisWeekKey = thisWeekStart.toISOString().slice(0, 10);
  const usedThisWeek = meals.find((m) => m.week_start_date === thisWeekKey);
  const isEvening = new Date().getHours() >= 17;
  const isUnlocked = currentProgramDay >= 21;

  const eligibility: { ok: boolean; reason?: string } = !isUnlocked
    ? { ok: false, reason: `Unlocks on Day 21. You're on Day ${currentProgramDay}.` }
    : usedThisWeek
    ? { ok: false, reason: `You've used your cheat meal this week. Next available: ${new Date(thisWeekStart.getTime() + 7 * 86400000).toLocaleDateString()}.` }
    : !isEvening
    ? { ok: false, reason: "Cheat meal is only available after 5 PM — it's always the last meal of the day." }
    : { ok: true };

  const logCheatMeal = async () => {
    if (!user) return;
    setBusy(true);
    const now = new Date();
    const sb: any = supabase;
    const { error } = await sb.from("cheat_meals").insert({
      member_id: user.id,
      logged_at: now.toISOString(),
      meal_description: description || null,
      week_start_date: thisWeekKey,
      fast_start_at: startFast ? now.toISOString() : null,
    });
    if (error) {
      setBusy(false);
      toast({ title: "Couldn't log meal", description: error.message, variant: "destructive" });
      return;
    }

    if (startFast) {
      await sb.from("if_fasting_log").insert({
        member_id: user.id,
        fast_start_at: now.toISOString(),
        planned_duration_hours: 14,
        window_type: "14_10",
        status: "active",
      });
    }

    setBusy(false);
    setOpen(false);
    setDescription("");
    toast({
      title: "Logged",
      description: startFast ? "Enjoy it. Your fast starts now — 14 hours until your eating window opens tomorrow." : "Cheat meal recorded.",
    });
    refresh();
  };

  // Week calendar
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(thisWeekStart);
    d.setDate(thisWeekStart.getDate() + i);
    return d;
  });
  const usedOnDay = usedThisWeek ? new Date(usedThisWeek.logged_at).getDay() : -1;
  const today = new Date().getDay();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-semibold text-2xl text-primary flex items-center gap-2">
          <Utensils className="h-6 w-6" /> Cheat Meal
        </h1>
        <p className="text-sm text-muted-foreground">One per week, your evening meal. Fast begins right after.</p>
      </div>

      {/* Rules */}
      <Card className="p-4 border border-accent/40 bg-accent-muted">
        <ul className="text-sm space-y-1 text-foreground">
          <li>• 1 cheat meal per week</li>
          <li>• Last meal of the day only</li>
          <li>• Your fasting window begins immediately after</li>
          <li>• Unlocked after 21 days of compliance</li>
        </ul>
      </Card>

      {/* Week calendar */}
      <Card className="p-5 border border-border">
        <p className="text-sm font-medium mb-3">This week</p>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((d, i) => {
            const isUsed = i === usedOnDay;
            const isPast = i < today;
            const label = ["S", "M", "T", "W", "T", "F", "S"][i];
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-tertiary-fg">{label}</span>
                <div
                  className={`h-10 w-10 rounded-full border-2 flex items-center justify-center text-sm ${
                    isUsed
                      ? "bg-accent border-accent text-white"
                      : isPast
                      ? "border-bg-subtle bg-bg-subtle text-tertiary-fg"
                      : "border-border bg-card"
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
            className="w-full h-[52px] bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Log my cheat meal
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Log your cheat meal</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs text-muted-foreground">What did you have? (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., jerk chicken with rice, a slice of cake..."
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Start 14-hour fast now</p>
                <p className="text-xs text-muted-foreground">Begins your fasting timer immediately</p>
              </div>
              <Switch checked={startFast} onCheckedChange={setStartFast} />
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
        <p className="text-sm font-medium mb-3">Past cheat meals</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : meals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cheat meals logged yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {meals.map((m) => (
              <div key={m.id} className="py-3 text-sm">
                <div className="flex justify-between items-start">
                  <span className="font-medium">
                    {new Date(m.logged_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  {m.fast_start_at && (
                    <span className="text-xs text-[#22C55E]">Fast started</span>
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
