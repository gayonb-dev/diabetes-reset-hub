import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, RefreshCw, Clock, Repeat2, Loader2 } from "lucide-react";
import { Vita } from "@/components/vita/Vita";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SnackLibrary } from "@/components/meals/SnackLibrary";

// ----- types -----
interface Ingredient { item: string; quantity: string; unit: string }
interface Alternative { name: string; description: string }
interface Meal {
  name: string;
  description: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
  plate_breakdown: { vegetables: string; protein: string; carbs: string };
  glycemic_rating: "low" | "medium" | "high";
  alternatives: Alternative[];
}
type Day = Record<string, Meal>; // breakfast/lunch/dinner/snack_1/snack_2 OR meal_1/meal_2/snack_1/snack_2
type Week = Record<string, Day>; // monday..sunday
interface PlanData {
  generated_at?: string;
  week_1?: Week;
  week_2?: Week;
}
interface PlanRow {
  id: string;
  status: string;
  plan_data: PlanData;
  plan_type: string;
  valid_from: string;
  created_at?: string;
}

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const STANDARD_SLOTS = ["breakfast", "lunch", "dinner", "snack_1", "snack_2"] as const;
const IF_SLOTS = ["meal_1", "snack_1", "meal_2", "snack_2"] as const;

const SLOT_LABEL: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack_1: "Snack 1",
  snack_2: "Snack 2",
  meal_1: "Meal 1",
  meal_2: "Meal 2",
};

const PLAN_PENDING_TIMEOUT_MS = 2 * 60 * 1000;

function isStalePending(plan: PlanRow | null) {
  if (!plan || plan.status !== "pending" || !plan.created_at) return false;
  return Date.now() - new Date(plan.created_at).getTime() > PLAN_PENDING_TIMEOUT_MS;
}

// ----- shopping list categorization (client-side, no API) -----
const CATEGORY_RULES: Array<{ category: string; tip: string; match: (item: string) => boolean }> = [
  {
    category: "Fresh Produce",
    tip: "This should be the largest section in your cart every week.",
    match: (s) => /\b(spinach|kale|callaloo|broccoli|cabbage|okra|pepper|cucumber|tomato|cauliflower|bean|zucchini|bora|christophene|chayote|bok choy|dasheen|melon|lettuce|onion|garlic|ginger|scallion|thyme|parsley|cilantro|lemon|lime|avocado|carrot|squash|pumpkin|sweet potato|breadfruit|plantain|fruit|berry|apple|banana|orange)\b/i.test(s),
  },
  {
    category: "Protein",
    tip: "Prioritize fish, eggs, and legumes.",
    match: (s) => /\b(chicken|turkey|fish|salmon|tilapia|cod|tuna|shrimp|tofu|tempeh|lentil|chickpea|bean|beef|pork)\b/i.test(s),
  },
  {
    category: "Dairy and Eggs",
    tip: "Plain full-fat Greek yogurt is your best option here.",
    match: (s) => /\b(egg|yogurt|milk|cheese|cottage)\b/i.test(s),
  },
  {
    category: "Pantry Staples",
    tip: "Check every label — if sugar appears in the first three ingredients, put it back.",
    match: (s) => /\b(rice|oat|quinoa|bulgur|pasta|bread|flour|oil|vinegar|spice|salt|pepper|stock|broth|soy|tamari|seed|nut|cinnamon)\b/i.test(s),
  },
];
function categorize(item: string): string {
  for (const rule of CATEGORY_RULES) if (rule.match(item)) return rule.category;
  return "Pantry Staples";
}

// ----- helpers -----
function programDayFrom(createdAt: string | null | undefined): number {
  if (!createdAt) return 1;
  return Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000) + 1);
}

function GlyBadge({ rating }: { rating: Meal["glycemic_rating"] }) {
  const tone = rating === "low" ? "bg-status-normal/15 text-status-normal" : rating === "medium" ? "bg-status-warning/15 text-status-warning" : "bg-status-danger/15 text-status-danger";
  return <span className={cn("text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded", tone)}>GI {rating}</span>;
}

function MealCard({ slot, meal, planId, day, weekIdx, onSwap }: {
  slot: string;
  meal: Meal;
  planId: string;
  day: string;
  weekIdx: number;
  onSwap: (slot: string, day: string, weekIdx: number, alt: Alternative) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAlts, setShowAlts] = useState(false);

  return (
    <Card className="border-border overflow-hidden">
      <button
        type="button"
        className="w-full text-left p-4 flex items-start justify-between gap-3"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {SLOT_LABEL[slot] ?? slot}
          </p>
          <h3 className="font-medium text-foreground mt-0.5 truncate">{meal.name}</h3>
          <div className="flex items-center gap-2 mt-1.5">
            <GlyBadge rating={meal.glycemic_rating} />
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {meal.prep_time_minutes + meal.cook_time_minutes} min
            </span>
            <span className="text-[11px] text-primary">✓ Plate compliant</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <p className="text-sm text-muted-foreground">{meal.description}</p>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-primary-muted/40 rounded p-2">
              <p className="font-medium text-primary">50% Veg</p>
              <p className="text-muted-foreground">{meal.plate_breakdown.vegetables}</p>
            </div>
            <div className="bg-accent-muted/40 rounded p-2">
              <p className="font-medium text-accent">25% Protein</p>
              <p className="text-muted-foreground">{meal.plate_breakdown.protein}</p>
            </div>
            <div className="bg-muted/60 rounded p-2">
              <p className="font-medium text-foreground">25% Carbs</p>
              <p className="text-muted-foreground">{meal.plate_breakdown.carbs}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-foreground mb-1">Ingredients</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {meal.ingredients.map((ing, i) => (
                <li key={i}>• {ing.quantity} {ing.unit} {ing.item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium text-foreground mb-1">Instructions</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
              {meal.instructions.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>

          <div className="border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setShowAlts((s) => !s)}
              className="text-xs text-accent inline-flex items-center gap-1.5 font-medium"
            >
              <Repeat2 className="h-3.5 w-3.5" />
              Don't like this? Swap →
            </button>
            {showAlts && (
              <div className="mt-2 space-y-1.5">
                {meal.alternatives.map((alt, i) => (
                  <button
                    key={i}
                    onClick={() => onSwap(slot, day, weekIdx, alt)}
                    className="w-full text-left rounded-md border border-border p-2 hover:border-accent transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">{alt.name}</p>
                    <p className="text-xs text-muted-foreground">{alt.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Meals() {
  const { user, subscription } = useAuth();
  const [plan1, setPlan1] = useState<PlanRow | null>(null);
  const [plan2, setPlan2] = useState<PlanRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [weekIdx, setWeekIdx] = useState<1 | 2 | 3 | 4>(1);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [shoppingChecked, setShoppingChecked] = useState<Record<string, boolean>>({});

  const programDay = useMemo(() => programDayFrom(subscription?.created_at), [subscription]);

  // Load the two most-recent active plans. Plan 1 = earlier valid_from, Plan 2 = later.
  useEffect(() => {
    if (!user) return;
    let active = true;
    let timer: number | undefined;

    async function load() {
      const { data } = await supabase
        .from("meal_plans")
        .select("id, generation_status, plan_data, plan_type, valid_from, created_at")
        .eq("member_id", user!.id)
        .order("valid_from", { ascending: false })
        .limit(2);

      if (!active) return;

      if (data && data.length > 0) {
        // data is newest-first; Plan 2 (later fortnight) is index 0, Plan 1 is index 1.
        const sorted = [...data].sort((a, b) => a.valid_from.localeCompare(b.valid_from));
        const toRow = (r: typeof data[number]): PlanRow => ({
          id: r.id,
          status: r.generation_status,
          plan_data: (r.plan_data as PlanData) || {},
          plan_type: r.plan_type,
          valid_from: r.valid_from,
          created_at: r.created_at,
        });
        setPlan1(toRow(sorted[0]));
        setPlan2(sorted[1] ? toRow(sorted[1]) : null);
        const anyPending = sorted.some((r) => {
          if (r.generation_status !== "pending") return false;
          return Date.now() - new Date(r.created_at).getTime() <= PLAN_PENDING_TIMEOUT_MS;
        });
        if (anyPending) timer = window.setTimeout(load, 3000);
      }
      setLoading(false);
    }

    supabase
      .from("profiles")
      .select("meal_preferences")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const meta = (data?.meal_preferences as Record<string, unknown>) || {};
        setCuisines((meta.cuisine_preferences as string[]) ?? []);
      });

    load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [user]);

  // Regenerate BOTH plans in parallel using current profile preferences.
  async function regenerate() {
    if (!user) return;
    setRegenerating(true);
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("meal_preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      const meta = (prof?.meal_preferences as Record<string, unknown>) || {};
      const snapshot = {
        cuisine_preferences: (meta.cuisine_preferences as string[]) ?? cuisines,
        protein_preferences: meta.protein_preferences ?? null,
        allergies: meta.allergies ?? [],
        cooking_time: meta.cooking_time ?? "20–45 min",
      };

      const today = new Date();
      const dayStr = (offset: number) => {
        const d = new Date(today);
        d.setDate(today.getDate() + offset);
        return d.toISOString().slice(0, 10);
      };

      const [{ data: r1, error: e1 }, { data: r2, error: e2 }] = await Promise.all([
        supabase
          .from("meal_plans")
          .insert({
            member_id: user.id,
            plan_type: plan1?.plan_type ?? "standard",
            generation_status: "pending",
            generation_trigger: "manual",
            valid_from: dayStr(0),
            valid_until: dayStr(13),
            preferences_snapshot: snapshot,
            plan_data: {},
          } as never)
          .select("id, plan_type, valid_from")
          .single(),
        supabase
          .from("meal_plans")
          .insert({
            member_id: user.id,
            plan_type: plan1?.plan_type ?? "standard",
            generation_status: "pending",
            generation_trigger: "manual",
            valid_from: dayStr(14),
            valid_until: dayStr(27),
            preferences_snapshot: snapshot,
            plan_data: {},
          } as never)
          .select("id, plan_type, valid_from")
          .single(),
      ]);
      if (e1 || e2) throw (e1 ?? e2);

      if (r1?.id) {
        setPlan1({ id: r1.id, status: "pending", plan_data: {}, plan_type: r1.plan_type, valid_from: r1.valid_from });
      }
      if (r2?.id) {
        setPlan2({ id: r2.id, status: "pending", plan_data: {}, plan_type: r2.plan_type, valid_from: r2.valid_from });
      }

      const generationResults = await Promise.all([
        r1?.id
          ? supabase.functions.invoke("generate-meal-plan", { body: { plan_id: r1.id, plan_index: 1 } })
          : Promise.resolve({ error: null }),
        r2?.id
          ? supabase.functions.invoke("generate-meal-plan", { body: { plan_id: r2.id, plan_index: 2 } })
          : Promise.resolve({ error: null }),
      ]);
      const generationError = generationResults.find((result) => result?.error)?.error;
      if (generationError) throw generationError;

      // Refetch
      const { data: updated } = await supabase
        .from("meal_plans")
        .select("id, generation_status, plan_data, plan_type, valid_from, created_at")
        .eq("member_id", user.id)
        .order("valid_from", { ascending: false })
        .limit(2);
      if (updated && updated.length > 0) {
        const sorted = [...updated].sort((a, b) => a.valid_from.localeCompare(b.valid_from));
        const toRow = (r: typeof updated[number]): PlanRow => ({
          id: r.id,
          status: r.generation_status,
          plan_data: (r.plan_data as PlanData) || {},
          plan_type: r.plan_type,
          valid_from: r.valid_from,
          created_at: r.created_at,
        });
        setPlan1(toRow(sorted[0]));
        setPlan2(sorted[1] ? toRow(sorted[1]) : null);
      }
    } catch (e) {
      toast({ title: "Couldn't regenerate", description: (e as Error).message, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  }

  // Map a global week index (1–4) to the underlying plan + week key.
  function resolveWeek(idx: 1 | 2 | 3 | 4): { plan: PlanRow | null; key: "week_1" | "week_2" } {
    if (idx === 1) return { plan: plan1, key: "week_1" };
    if (idx === 2) return { plan: plan1, key: "week_2" };
    if (idx === 3) return { plan: plan2, key: "week_1" };
    return { plan: plan2, key: "week_2" };
  }
  const current = resolveWeek(weekIdx);

  async function handleSwap(slot: string, day: string, wIdx: number, alt: Alternative) {
    if (!user) return;
    const { plan, key } = resolveWeek(wIdx as 1 | 2 | 3 | 4);
    if (!plan) return;
    const data: PlanData = JSON.parse(JSON.stringify(plan.plan_data));
    const original = data[key]?.[day]?.[slot];
    if (!original) return;
    data[key]![day][slot] = { ...original, name: alt.name, description: alt.description };
    await supabase.from("meal_plans").update({ plan_data: data as never }).eq("id", plan.id);
    await supabase.from("meal_swaps").insert({
      plan_id: plan.id,
      member_id: user.id,
      day,
      meal_type: slot,
      swapped_to: { name: alt.name, description: alt.description } as never,
    } as never);
    if (plan.id === plan1?.id) setPlan1({ ...plan, plan_data: data });
    else if (plan.id === plan2?.id) setPlan2({ ...plan, plan_data: data });
    toast({ title: "Swapped", description: alt.name });
  }

  // ----- Shopping list (client-side) — current week only -----
  const shopping = useMemo(() => {
    const { plan, key } = current;
    const wk = plan?.plan_data?.[key];
    const items: { item: string; quantity?: string; unit?: string }[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const rec = node as Record<string, unknown>;
      if (Array.isArray(rec.ingredients) && typeof rec.name === "string") {
        for (const ing of rec.ingredients as Ingredient[]) {
          items.push({ item: ing.item, quantity: ing.quantity, unit: ing.unit });
        }
      }
      for (const v of Object.values(rec)) walk(v);
    };
    walk(wk);
    const byCat = new Map<string, string[]>();
    const seen = new Set<string>();
    for (const it of items) {
      const k = it.item.toLowerCase().trim();
      if (seen.has(k)) continue;
      seen.add(k);
      const cat = categorize(it.item);
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(it.item);
    }
    return byCat;
  }, [current]);

  // ----- Render -----
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  // No plan at all
  if (!plan1) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <Vita posture="encouraging" size={64} />
        <p className="text-sm text-muted-foreground">You don't have a meal plan yet.</p>
        <Button onClick={() => regenerate()} disabled={regenerating}>
          Generate my plan
        </Button>
      </div>
    );
  }

  const anyFailed =
    plan1.status === "failed" || isStalePending(plan1) || (plan2 && (plan2.status === "failed" || isStalePending(plan2)));
  const anyPending =
    (plan1.status === "pending" && !isStalePending(plan1)) ||
    (plan2 && plan2.status === "pending" && !isStalePending(plan2));

  if ((anyPending || regenerating) && !anyFailed) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="flex justify-center"><Vita posture="encouraging" size={64} /></div>
        <p className="text-sm text-foreground font-medium">
          VITA is building your personalized 4-week meal plan.
        </p>
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          This takes about 15 seconds.
        </p>
      </div>
    );
  }

  if (anyFailed) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="flex justify-center"><Vita posture="concerned" size={64} /></div>
        <p className="text-sm text-foreground font-medium">
          Your plan generation is taking longer than expected.
        </p>
        <p className="text-xs text-muted-foreground">
          We'll send you a notification when it's ready. You can also retry now.
        </p>
        <Button onClick={() => regenerate()} disabled={regenerating}>
          {regenerating ? "Retrying…" : "Try again"}
        </Button>
      </div>
    );
  }

  const week = current.plan?.plan_data?.[current.key] as Week | undefined;
  const slots = (current.plan?.plan_type ?? "standard") === "intermittent_fasting" ? IF_SLOTS : STANDARD_SLOTS;
  const weekOptions: (1 | 2 | 3 | 4)[] = plan2 ? [1, 2, 3, 4] : [1, 2];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-foreground">My Meals</h1>
          <p className="text-sm text-muted-foreground">
            4-week plan, personalized for you. Swap any meal — no waiting.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => regenerate()} disabled={regenerating}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", regenerating && "animate-spin")} />
          Regenerate
        </Button>
      </div>

      <Tabs defaultValue="plan">
        <TabsList className="bg-muted">
          <TabsTrigger value="plan">My Meal Plan</TabsTrigger>
          <TabsTrigger value="shopping">Shopping List</TabsTrigger>
          <TabsTrigger value="snacks">Snacks</TabsTrigger>
        </TabsList>

        <TabsContent value="snacks" className="mt-4">
          <SnackLibrary dayNumber={programDay} />
        </TabsContent>

        <TabsContent value="plan" className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {weekOptions.map((w) => (
              <button
                key={w}
                onClick={() => setWeekIdx(w)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  weekIdx === w
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                Week {w}
              </button>
            ))}
          </div>

          {week ? (
            <div className="space-y-5">
              {DAY_KEYS.map((dayKey) => {
                const day = week[dayKey];
                if (!day) return null;
                return (
                  <div key={dayKey}>
                    <h2 className="font-medium text-foreground capitalize mb-2">{dayKey}</h2>
                    <div className="space-y-2">
                      {slots.map((slot) => {
                        const meal = day[slot];
                        if (!meal) return null;
                        return (
                          <MealCard
                            key={slot}
                            slot={slot}
                            meal={meal}
                            planId={current.plan!.id}
                            day={dayKey}
                            weekIdx={weekIdx}
                            onSwap={handleSwap}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data for this week.</p>
          )}
        </TabsContent>

        <TabsContent value="shopping" className="mt-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Generated from Week {weekIdx}'s meals. Checked items move to the bottom.
          </p>
          {[...shopping.entries()].map(([cat, items]) => {
            const tip = CATEGORY_RULES.find((c) => c.category === cat)?.tip;
            const sorted = [...items].sort((a, b) => Number(!!shoppingChecked[a]) - Number(!!shoppingChecked[b]));
            return (
              <Card key={cat} className="p-4 border-border">
                <h3 className="font-medium text-foreground">{cat}</h3>
                {tip && <p className="text-[11px] text-muted-foreground mt-0.5">{tip}</p>}
                <ul className="mt-3 space-y-1.5">
                  {sorted.map((item) => {
                    const checked = !!shoppingChecked[item];
                    return (
                      <li
                        key={item}
                        className={cn(
                          "flex items-center gap-2 text-sm",
                          checked && "text-muted-foreground line-through opacity-60",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            setShoppingChecked((p) => ({ ...p, [item]: Boolean(v) }))
                          }
                        />
                        <span>{item}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
          {shopping.size === 0 && (
            <p className="text-sm text-muted-foreground">No ingredients found in this week.</p>
          )}
        </TabsContent>
      </Tabs>

      <Badge variant="outline" className="text-[11px]">Day {programDay}</Badge>
    </div>
  );
}
