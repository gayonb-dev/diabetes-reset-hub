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
  const [planRow, setPlanRow] = useState<{ id: string; status: string; plan_data: PlanData; plan_type: string; valid_from: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [weekIdx, setWeekIdx] = useState<1 | 2>(1);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [shoppingChecked, setShoppingChecked] = useState<Record<string, boolean>>({});

  const programDay = useMemo(() => programDayFrom(subscription?.created_at), [subscription]);

  // Load current plan + preferences. Poll while pending.
  useEffect(() => {
    if (!user) return;
    let active = true;
    let timer: number | undefined;

    async function load() {
      const { data: plan } = await supabase
        .from("meal_plans")
        .select("id, generation_status, plan_data, plan_type, valid_from")
        .eq("member_id", user!.id)
        .order("valid_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (plan) {
        setPlanRow({
          id: plan.id,
          status: plan.generation_status,
          plan_data: (plan.plan_data as PlanData) || {},
          plan_type: plan.plan_type,
          valid_from: plan.valid_from,
        });
        if (plan.generation_status === "pending") {
          timer = window.setTimeout(load, 3000);
        }
      }
      setLoading(false);
    }

    const { data: vp } = supabase
      .from("visitor_profiles")
      .select("metadata")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const meta = (data?.metadata as Record<string, unknown>) || {};
        setCuisines((meta.cuisine_preferences as string[]) ?? []);
      }) as unknown as { data: unknown };
    void vp;

    load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [user]);

  async function regenerate(newCuisines?: string[]) {
    if (!user) return;
    setRegenerating(true);
    try {
      // Persist cuisine preferences if changed
      if (newCuisines) {
        const { data: vp } = await supabase
          .from("visitor_profiles")
          .select("id, metadata")
          .eq("user_id", user.id)
          .maybeSingle();
        if (vp) {
          await supabase
            .from("visitor_profiles")
            .update({
              metadata: {
                ...((vp.metadata as Record<string, unknown>) || {}),
                cuisine_preferences: newCuisines,
              } as never,
            })
            .eq("id", vp.id);
        }
        setCuisines(newCuisines);
      }

      const today = new Date();
      const until = new Date(today);
      until.setDate(today.getDate() + 13);

      const { data: inserted } = await supabase
        .from("meal_plans")
        .insert({
          member_id: user.id,
          plan_type: planRow?.plan_type ?? "standard",
          generation_status: "pending",
          generation_trigger: "manual",
          valid_from: today.toISOString().slice(0, 10),
          valid_until: until.toISOString().slice(0, 10),
          preferences_snapshot: { cuisine_preferences: newCuisines ?? cuisines },
          plan_data: {},
        } as never)
        .select("id")
        .single();

      if (inserted?.id) {
        setPlanRow({
          id: inserted.id,
          status: "pending",
          plan_data: {},
          plan_type: planRow?.plan_type ?? "standard",
          valid_from: today.toISOString().slice(0, 10),
        });
        await supabase.functions.invoke("generate-meal-plan", { body: { plan_id: inserted.id } });
        // refetch
        const { data: updated } = await supabase
          .from("meal_plans")
          .select("id, generation_status, plan_data, plan_type, valid_from")
          .eq("id", inserted.id)
          .maybeSingle();
        if (updated) {
          setPlanRow({
            id: updated.id,
            status: updated.generation_status,
            plan_data: (updated.plan_data as PlanData) || {},
            plan_type: updated.plan_type,
            valid_from: updated.valid_from,
          });
        }
      }
    } catch (e) {
      toast({ title: "Couldn't regenerate", description: (e as Error).message, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSwap(slot: string, day: string, wIdx: number, alt: Alternative) {
    if (!planRow || !user) return;
    const data: PlanData = JSON.parse(JSON.stringify(planRow.plan_data));
    const weekKey = wIdx === 1 ? "week_1" : "week_2";
    const original = data[weekKey]?.[day]?.[slot];
    if (!original) return;
    // Replace name + description with the alternative; keep ingredients/instructions as a stub.
    data[weekKey]![day][slot] = {
      ...original,
      name: alt.name,
      description: alt.description,
    };
    await supabase.from("meal_plans").update({ plan_data: data as never }).eq("id", planRow.id);
    await supabase.from("meal_swaps").insert({
      plan_id: planRow.id,
      member_id: user.id,
      day,
      meal_type: slot,
      swapped_to: { name: alt.name, description: alt.description } as never,
    } as never);
    setPlanRow({ ...planRow, plan_data: data });
    toast({ title: "Swapped", description: alt.name });
  }

  // ----- Shopping list (client-side) -----
  const shopping = useMemo(() => {
    if (!planRow?.plan_data) return new Map<string, string[]>();
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
    const wk = weekIdx === 1 ? planRow.plan_data.week_1 : planRow.plan_data.week_2;
    walk(wk);
    const byCat = new Map<string, string[]>();
    const seen = new Set<string>();
    for (const it of items) {
      const key = it.item.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      const cat = categorize(it.item);
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(it.item);
    }
    return byCat;
  }, [planRow, weekIdx]);

  // ----- Render -----
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  // No plan at all
  if (!planRow) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <Vita posture="encouraging" size={64} />
        <p className="text-sm text-muted-foreground">You don't have a meal plan yet.</p>
        <Button onClick={() => regenerate(["International"])} disabled={regenerating}>
          Generate my plan
        </Button>
      </div>
    );
  }

  // Pending / failed states
  if (planRow.status === "pending") {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="flex justify-center"><Vita posture="encouraging" size={64} /></div>
        <p className="text-sm text-foreground font-medium">
          VITA is building your personalized meal plan.
        </p>
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          This takes about 10 seconds.
        </p>
      </div>
    );
  }

  if (planRow.status === "failed") {
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

  const week = (weekIdx === 1 ? planRow.plan_data.week_1 : planRow.plan_data.week_2) as Week | undefined;
  const slots = planRow.plan_type === "intermittent_fasting" ? IF_SLOTS : STANDARD_SLOTS;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-foreground">My Meals</h1>
          <p className="text-sm text-muted-foreground">
            14-day plan, personalized for you. Swap any meal — no waiting.
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
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-4 space-y-4">
          <div className="flex gap-2">
            {[1, 2].map((w) => (
              <button
                key={w}
                onClick={() => setWeekIdx(w as 1 | 2)}
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
                            planId={planRow.id}
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

        <TabsContent value="preferences" className="mt-4 space-y-4">
          <Card className="p-4 border-border space-y-3">
            <h3 className="font-medium text-foreground">Cuisine preferences</h3>
            <p className="text-xs text-muted-foreground">
              Pick the cuisines you'd like reflected in your plan. Changes take effect on the next regeneration.
            </p>
            <div className="flex flex-wrap gap-2">
              {["International", "Mediterranean", "Asian", "Latin", "African", "Caribbean", "American"].map((c) => {
                const on = cuisines.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() =>
                      setCuisines((p) => (on ? p.filter((x) => x !== c) : [...p, c]))
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs border transition-colors",
                      on
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <Button
              onClick={() => regenerate(cuisines)}
              disabled={regenerating || cuisines.length === 0}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {regenerating ? "Regenerating…" : "Save and regenerate"}
            </Button>
          </Card>
          <Badge variant="outline" className="text-[11px]">
            Day {programDay}
          </Badge>
        </TabsContent>
      </Tabs>
    </div>
  );
}
