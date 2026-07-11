// Edge function: generate-meal-plan
// Generates a 1-week meal plan via Lovable AI Gateway and stores it on the
// member's meal_plans row. See Section 29 of the DRM build spec.
//
// Auth: requires the user's JWT in the Authorization header. The function
// resolves the member from the JWT (so members can only generate their own
// plan) OR accepts an internal call from regenerate-due-plans signed with
// the CRON_SECRET in X-Cron-Secret.
//
// Request body: { plan_id: string }   (the pending plan row to fill in)

import { generateObject } from "npm:ai@4.3.16";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@0.2.14";
import { z } from "npm:zod@3.23.8";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform",
};

// ---------- Lovable AI Gateway ----------
const gateway = createOpenAICompatible({
  name: "lovable",
  baseURL: "https://ai.gateway.lovable.dev/v1",
  headers: {
    "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")!,
    "X-Lovable-AIG-SDK": "vercel-ai-sdk",
  },
});

const model = gateway("google/gemini-2.5-flash");

// ---------- Zod Schemas (spec verbatim) ----------
const MealSchema = z.object({
  name: z.string(),
  description: z.string(),
  prep_time_minutes: z.number(),
  cook_time_minutes: z.number(),
  servings: z.number(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  plate_breakdown: z.string(),
  alternatives: z.array(z.string()),
});


const DaySchema = z.object({
  breakfast: MealSchema,
  lunch: MealSchema,
  dinner: MealSchema,
  snack_1: MealSchema,
  snack_2: MealSchema,
});

const IFDaySchema = z.object({
  meal_1: MealSchema,
  meal_2: MealSchema,
  snack_1: MealSchema,
  snack_2: MealSchema,
});

const WeekSchema = z.object({
  monday: DaySchema, tuesday: DaySchema, wednesday: DaySchema,
  thursday: DaySchema, friday: DaySchema, saturday: DaySchema, sunday: DaySchema,
});

const IFWeekSchema = z.object({
  monday: IFDaySchema, tuesday: IFDaySchema, wednesday: IFDaySchema,
  thursday: IFDaySchema, friday: IFDaySchema, saturday: IFDaySchema, sunday: IFDaySchema,
});

const SingleWeekSchema = z.object({ generated_at: z.string(), week_1: WeekSchema });
const IFSingleWeekSchema = z.object({ generated_at: z.string(), week_1: IFWeekSchema });

// ---------- System prompts (Section 29 — VERBATIM) ----------
const STANDARD_SYSTEM_PROMPT = `You are a certified diabetes nutrition specialist generating a personalized 
1-week meal plan for a member of the Diabetes Reset Method program. Your 
sole purpose is to help reverse Type 2 diabetes through food.

---

PROGRAM PHILOSOPHY
This is a reversal program, not a management program. Every meal you generate 
must actively lower blood sugar, reduce insulin resistance, and support weight 
loss where needed. Do not generate meals that are merely "not bad" for 
diabetics. Generate meals that are genuinely therapeutic.

---

THE PLATE METHOD — NON-NEGOTIABLE FOR EVERY MAIN MEAL
Every breakfast, lunch, and dinner must follow this exact structure:
- 50% of the plate: non-starchy vegetables
- 25% of the plate: lean protein
- 25% of the plate: complex carbohydrates only

You must confirm this distribution in the plate_breakdown field of every 
main meal. If you cannot fit this structure into a dish, choose a different dish.

Approved non-starchy vegetables: leafy greens, broccoli, cabbage, callaloo, 
okra, peppers (all colors), cucumber, tomatoes, cauliflower, string beans, 
zucchini, bora (long beans), christophene/chayote, bok choy, spinach, kale, 
dasheen leaves, bitter melon.

Approved lean proteins: chicken breast, turkey breast, fish (all types), 
shrimp, eggs (whole or whites), legumes (lentils, chickpeas, black beans, 
kidney beans, black-eyed peas), tofu, tempeh, lean beef (≤10% fat), 
low-fat cottage cheese, Greek yogurt.

Approved complex carbohydrates: brown rice, sweet potato (not candied), 
whole grain bread, rolled oats, lentils, chickpeas, breadfruit (boiled or 
roasted — never fried), green banana (boiled), dasheen/taro (boiled — 
small portion), whole wheat pasta (small portion), bulgur wheat, quinoa, 
whole grain crackers.

---

MACRO TARGETS

Main meals (breakfast, lunch, dinner):
- Carbohydrates: 45–60g per meal
- Protein: 20–35g per meal
- Fiber: minimum 8g per meal
- Fat: prioritize unsaturated fats; saturated fat maximum 5g per meal
- Sodium: under 600mg per meal
- Calories: 350–500 per meal

Snacks (snack_1, snack_2):
- Carbohydrates: 15–25g
- Protein: minimum 5g
- Fiber: minimum 3g
- Sodium: under 200mg
- Calories: 100–200
- Every snack must contain protein. Snacks are never desserts.

---

SNACK TIMING — INCLUDE IN INSTRUCTIONS
Snack 1 is eaten 2.5–3 hours after breakfast.
Snack 2 is eaten 2.5–3 hours after lunch.
Each snack must be eaten at least 1.5 hours before the next main meal.
Include timing guidance in the snack description field.

---

GLYCEMIC INDEX REQUIREMENTS
All ingredients must have a glycemic index under 70. Prioritize GI under 55.
For combination dishes, pair any moderate-GI carbohydrate with high-fiber 
vegetables and protein to reduce the overall glycemic load of the meal.

---

STRICTLY FORBIDDEN — NEVER INCLUDE UNDER ANY CIRCUMSTANCES
- White rice (substitute: brown rice, cauliflower rice, bulgur)
- White bread, white flour, white pasta
- Pastries or baked goods made with refined flour
- Sugary drinks, fruit juice, sodas, sweetened teas, energy drinks
- Added sugar above 1 teaspoon per day total across the plan
- Honey, cane syrup, corn syrup, molasses in meaningful quantities
- Processed meats: hot dogs, sausages, salami, deli meats, tinned corned beef
- Deep-fried foods of any kind
- High-sodium condiments in large quantities
- Margarine, hydrogenated oils, trans fats
- Ripe plantains (yellow) — high GI. Green plantain boiled acceptable in small portions only.
- Ripe bananas as a meal component
- Full-fat coconut milk in large amounts (1 tablespoon for flavor only)
- White potatoes (substitute with sweet potato)
- Fruit juice in any quantity

---

CULTURAL VARIATION REQUIREMENTS
Honor the member's cuisine preferences fully. Do not default to generic American health food.

CARIBBEAN: Use callaloo, okra, christophene, bora, breadfruit, dasheen leaves, ackee, 
scotch bonnet (small amounts), fresh thyme, scallion, garlic, ginger. Brown stew chicken, 
curry fish, steamed fish with provisions, run-down with lean protein, callaloo omelette — 
these are appropriate dishes. Replace white rice with brown rice. Reduce salt by 50%.

MEDITERRANEAN: Olive oil as primary fat. Legumes as the carb component. Fish 3+ times/week. 
Tabbouleh with bulgur, shakshuka, grilled fish with roasted vegetables are appropriate.

ASIAN: Replace white rice with brown rice, cauliflower rice, or shirataki. Tofu and edamame 
as proteins. Low-sodium miso, tamari, ginger for flavor. Congee with brown rice, tofu bowls appropriate.

LATIN: Black beans and kidney beans as primary carb. Sofrito-based dishes. Small corn tortillas 
(1–2) within the 25% carb portion. Ceviche, black bean bowls, lentil soup appropriate.

AFRICAN: Leafy greens prominently. Small portions of yam (not fried). Fish and legume proteins preferred. 
Egusi soup with leafy greens and fish, grilled tilapia with kontomire stew appropriate.

AMERICAN: Whole foods focus. Grilled proteins, roasted vegetables, complex grain bases. Salads 
must include protein. Turkey chili with beans, lean protein bowls, vegetable omelettes appropriate.

---

BREAKFAST RULES
- Minimum 350 calories. Front-load protein — highest-impact meal for blood sugar control.
- Vary breakfast style across 7 days: mix egg-based, grain-based, fruit-plus-protein.
- Never repeat the same breakfast more than once per week.

---

REPEAT PREVENTION
Meals already served to this member: {{SERVED_MEALS}}
Do not generate any meal whose name appears in this list. Do not generate any meal that is 
functionally identical even if the name differs slightly.

---

VARIETY REQUIREMENTS ACROSS 7 DAYS
- No primary protein source appears more than 4 times
- No primary carbohydrate appears more than 5 times
- At least 5 different vegetable types per week
- At least 3 different breakfast styles per week
- No dinner dish repeats within the same week
- Dinners must not repeat within the week

---

INGREDIENT QUANTITIES
Be specific. Use standard measurements: grams, tablespoons, teaspoons, cups, pieces, fillets.
No vague quantities.

---

INSTRUCTIONS
Write clear numbered steps. Maximum 8 steps per meal. Include important technique notes.

---

FINAL CHECK BEFORE GENERATING EACH MEAL
1. Does this follow the 50/25/25 plate breakdown?
2. Does this contain any forbidden ingredient?
3. Is every ingredient GI under 70?
4. Is sodium within limits?
5. Has this meal appeared in served_meals?
6. Is there genuine cultural appropriateness?
If 2, 3, 4, or 5 is yes — regenerate that meal.

---

INGREDIENT ECONOMY — Design each week so core ingredients repeat across at least 3 meals (one protein prepared two ways, one vegetable base reused, one carb base reused). Never include a specialty ingredient used in only one meal. Prefer affordable, widely available items; frozen vegetables are acceptable where they cut cost. The weekly shopping list derived from your plan should be short, cheap, and produce no waste.`;


const IF_SYSTEM_PROMPT_ADDITION = `

---

INTERMITTENT FASTING MODE — ACTIVE
This member has unlocked and enabled Intermittent Fasting.
Eating window: {{WINDOW_HOURS}} hours per day.
Fast duration: {{FAST_HOURS}} hours per day.

---

STRUCTURAL CHANGES FOR IF MODE
The 3-meal structure becomes a 2-meal structure:
Remove breakfast, lunch, and dinner labels. Replace with meal_1 and meal_2.
Retain snack_1 and snack_2.
Total daily eating occasions: 4.
Order: meal_1 → snack_1 → meal_2 → snack_2 → fast begins.

---

MEAL SIZING FOR IF MODE

Meal 1 (breaking the fast):
- Calories: 450–550
- Protein: 30–40g (highest protein meal — breaking a fast with protein is critical for blood sugar stability)
- Carbohydrates: 55–70g
- Fiber: minimum 10g
- Must be genuinely satisfying and complete.

Meal 2 (final meal before the fast):
- Calories: 400–500
- Protein: 25–35g
- Carbohydrates: 40–55g (lower than Meal 1 — reducing carbs in the final meal supports overnight fat metabolism and lower fasting blood sugar the following morning)
- Fiber: minimum 8g
- Do not generate a heavy hard-to-digest dinner. Lean proteins, cooked vegetables, moderate complex carbs only.

---

IF SNACK TIMING
Snack 1: 2.5–3 hours after Meal 1.
Meal 2: at least 1.5 hours after Snack 1.
Snack 2: 2.5–3 hours after Meal 2.
Snack 2 must end at least 2 hours before the fasting window begins.
Never schedule Snack 2 within 2 hours of the end of the eating window.

Example 14:10 window (10am–8pm):
10:00am Meal 1 → 12:30pm Snack 1 → 2:30pm Meal 2 → 5:30pm Snack 2 → 8:00pm fast begins.

---

IF DAILY NUTRITION TOTALS (all 4 occasions combined):
Carbohydrates: 130–175g | Protein: 85–120g | Fiber: 28–38g
Calories: 1,500–2,000 | Sodium: under 1,800mg

---

MEAL 1 CULTURAL NOTES
Meal 1 breaks the fast mid-morning or at noon. It does not have to be traditional breakfast food. 
For Caribbean members, Meal 1 can be a substantial lunch-style meal: brown stew chicken with brown 
rice and callaloo, curry fish with ground provisions. This is nutritionally superior to a light 
breakfast-style meal as the first meal of a 14–16 hour fast.

---

OUTPUT FORMAT FOR IF MODE
Use meal_1 and meal_2 instead of breakfast/lunch/dinner.
snack_1 and snack_2 remain unchanged.
All other fields (plate_breakdown, etc.) are identical.`;

// ---------- Helpers ----------
function formatMemberInputs(prefs: Record<string, unknown>, servedMeals: string[]): string {
  const cuisines = (prefs.cuisine_preferences as string[]) ?? ["International"];
  const allergies = (prefs.allergies as string[]) ?? [];
  const dislikes = (prefs.dislikes as string[]) ?? [];
  const householdSize = prefs.household_size ?? 1;
  const cookingTime = prefs.cooking_time ?? "30-45 min";
  const lines = [
    `MEMBER PREFERENCES`,
    `- Cuisine preferences: ${cuisines.join(", ")}`,
    `- Allergies / strict avoids: ${allergies.length ? allergies.join(", ") : "none reported"}`,
    `- Dislikes: ${dislikes.length ? dislikes.join(", ") : "none reported"}`,
    `- Household size: ${householdSize}`,
    `- Cooking time available per meal: ${cookingTime}`,
    `- Primary goal: ${(prefs.primary_goal as string) ?? "diabetes reversal"}`,
    ``,
  `Generate exactly one complete 7-day meal plan as week_1 only, Monday–Sunday.`,
    `Return the full structured JSON output.`,
  ];
  return lines.join("\n");
}

function collectMealNames(plan: unknown): string[] {
  const names: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const rec = node as Record<string, unknown>;
    if (typeof rec.name === "string" && typeof rec.description === "string" && rec.plate_breakdown) {
      names.push(rec.name);
    }
    for (const v of Object.values(rec)) walk(v);
  };
  walk(plan);
  return names;
}

function serializeError(error: unknown): unknown {
  if (!error || typeof error !== "object") return error;
  const rec = error as Record<string, unknown>;
  return {
    name: rec.name,
    message: rec.message,
    status: rec.status,
    statusCode: rec.statusCode,
    cause: serializeError(rec.cause),
    responseBody: rec.responseBody,
    data: rec.data,
  };
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CRON_SECRET = Deno.env.get("CRON_SECRET");

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: { plan_id?: string; member_id?: string; plan_index?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve caller: either a member JWT or the cron secret
  const cronHeader = req.headers.get("X-Cron-Secret");
  let memberId: string | null = null;

  if (cronHeader && CRON_SECRET && cronHeader === CRON_SECRET) {
    memberId = body.member_id ?? null;
  } else {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "auth_required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userResp } = await admin.auth.getUser(token);
    memberId = userResp.user?.id ?? null;
  }

  if (!memberId || !body.plan_id) {
    return new Response(JSON.stringify({ error: "missing_member_or_plan" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Load plan, profile
  const { data: planRow, error: planErr } = await admin
    .from("meal_plans")
    .select("id, member_id, plan_type, preferences_snapshot")
    .eq("id", body.plan_id)
    .maybeSingle();

  if (planErr || !planRow || planRow.member_id !== memberId) {
    return new Response(JSON.stringify({ error: "plan_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Meal preferences now live on the authenticated profile row (RLS-protected).
  // served_meals / IF settings remain on visitor_profiles (admin-only writes).
  const [{ data: memberProfile }, { data: profile }] = await Promise.all([
    admin
      .from("profiles")
      .select("meal_preferences")
      .eq("user_id", memberId)
      .maybeSingle(),
    admin
      .from("visitor_profiles")
      .select("metadata, served_meals, if_enabled, if_window_hours")
      .eq("user_id", memberId)
      .maybeSingle(),
  ]);

  const prefs = {
    ...((planRow.preferences_snapshot as Record<string, unknown>) || {}),
    // Legacy fallback: any older meal prefs still on visitor_profiles.metadata
    ...((profile?.metadata as Record<string, unknown>) || {}),
    // Authoritative: meal prefs from the member's own profile row
    ...((memberProfile?.meal_preferences as Record<string, unknown>) || {}),
  };
  const servedMeals = ((profile?.served_meals as string[]) || []).slice(-250);

  // Determine if IF mode
  // For simplicity: IF mode requires both if_enabled and plan_type === 'intermittent_fasting'.
  const isIfMode =
    !!profile?.if_enabled && (planRow.plan_type === "intermittent_fasting");
  const schema = isIfMode ? IFSingleWeekSchema : SingleWeekSchema;

  const windowHours = profile?.if_window_hours ?? 10;
  const fastHours = 24 - windowHours;
  const planIdx = [1, 2, 3, 4].includes(body.plan_index ?? 0) ? body.plan_index : null;
  // Per-week deterministic bias. The 4 weeks are generated in parallel and cannot
  // see each other's served_meals, so we force novelty via distinct themes here.
  const WEEK_BIAS: Record<number, { theme: string; mondayBreakfast: string; primaryProtein: string; carbBase: string }> = {
    1: {
      theme: "Eggs and leafy-green forward week.",
      mondayBreakfast: "An egg-based scramble or omelette featuring callaloo, spinach, or dasheen leaves with a small portion of whole grain.",
      primaryProtein: "eggs and chicken breast",
      carbBase: "rolled oats and whole grain bread",
    },
    2: {
      theme: "Fish and seafood forward week.",
      mondayBreakfast: "A smoked-fish or fresh-fish breakfast bowl (e.g., steamed fish with provisions, fish-and-bake style with whole grain, or a saltfish-and-vegetable mix). NO eggs as the primary protein.",
      primaryProtein: "fish (snapper, mackerel, tuna, saltfish soaked) and shrimp",
      carbBase: "boiled green banana and brown rice",
    },
    3: {
      theme: "Grain and oat forward week.",
      mondayBreakfast: "A warm whole-grain porridge or savoury oat bowl (e.g., cornmeal porridge made with rolled oats and unsweetened almond milk, savoury oat congee with vegetables and turkey). NO eggs and NO fish as the primary protein.",
      primaryProtein: "turkey breast, Greek yogurt, and lean beef",
      carbBase: "rolled oats, bulgur, and quinoa",
    },
    4: {
      theme: "Legume and plant-protein forward week.",
      mondayBreakfast: "A bean, lentil, or tofu-based breakfast (e.g., stewed black-eyed peas with sauteed greens and a small portion of breadfruit, or a chickpea-and-vegetable hash with whole grain toast). NO eggs, NO fish, NO chicken as the primary protein.",
      primaryProtein: "black beans, lentils, chickpeas, tofu, and tempeh",
      carbBase: "breadfruit (boiled), sweet potato, and whole wheat pasta",
    },
  };
  const bias = planIdx ? WEEK_BIAS[planIdx] : null;
  const planIndexHint = planIdx && bias
    ? `\n\n---\n\nPARALLEL PLAN GENERATION CONTEXT — WEEK ${planIdx} OF 4\nYou are generating Week ${planIdx} of 4 for the same member in parallel. The other 3 weeks are being generated at the same moment and CANNOT see your output, so you MUST follow the deterministic per-week bias below so the member experiences clear week-over-week novelty across the full 28 days.\n\nWEEK ${planIdx} THEME: ${bias.theme}\n- Primary protein focus for this week: ${bias.primaryProtein}.\n- Primary complex-carbohydrate base for this week: ${bias.carbBase}.\n- Monday breakfast for THIS week MUST be: ${bias.mondayBreakfast}\n\nReturn this week as week_1 only. Do not repeat the names or core compositions of the meals in served_meals above.`
    : "";
  const systemPrompt = isIfMode
    ? STANDARD_SYSTEM_PROMPT.replace("{{SERVED_MEALS}}", servedMeals.join(", ") || "none") +
      IF_SYSTEM_PROMPT_ADDITION
        .replace("{{WINDOW_HOURS}}", String(windowHours))
        .replace("{{FAST_HOURS}}", String(fastHours)) + planIndexHint
    : STANDARD_SYSTEM_PROMPT.replace("{{SERVED_MEALS}}", servedMeals.join(", ") || "none") + planIndexHint;

  // Mark in_progress immediately so the client sees movement.
  await admin
    .from("meal_plans")
    .update({ generation_status: "pending" })
    .eq("id", planRow.id);

  // Run the AI generation in the background. Return a 202 right away so the
  // browser's supabase.functions.invoke() does not have to wait on a 60-120s
  // LLM call (which silently kills the function and leaves rows in pending).
  const work = (async () => {
    try {
      console.log("Testing real generation");
      console.log("generateObject starting, plan_id:", planRow.id);
      async function tryGenerate() {
        return await generateObject({
          model,
          schema,
          mode: "json",
          system: systemPrompt,
          prompt: formatMemberInputs(prefs, servedMeals),
        });
      }
      let result;
      try {
        result = await tryGenerate();
      } catch (firstErr) {
        const msg = (firstErr as { message?: string })?.message ?? "";
        const causeName = ((firstErr as { cause?: { name?: string } })?.cause?.name) ?? "";
        const retryable =
          msg.includes("Invalid JSON response") ||
          msg.includes("Unexpected end of JSON") ||
          causeName === "AI_JSONParseError";
        if (!retryable) throw firstErr;
        console.warn("generateObject retry after parse failure");
        result = await tryGenerate();
      }
      const { object } = result;
      console.log("generateObject complete, plan_id:", planRow.id);

      const newNames = collectMealNames(object);
      const merged = [...servedMeals, ...newNames].slice(-250);

      await admin
        .from("meal_plans")
        .update({
          plan_data: object,
          generation_status: "complete",
          generated_at: new Date().toISOString(),
        })
        .eq("id", planRow.id);

      await admin
        .from("visitor_profiles")
        .update({ served_meals: merged })
        .eq("user_id", memberId);
    } catch (e) {
      const err = e as { statusCode?: number; status?: number; message?: string };
      const code = err.statusCode ?? err.status ?? 500;
      console.error("generate-meal-plan error", code, err.message, JSON.stringify(serializeError(e)));
      await admin
        .from("meal_plans")
        .update({ generation_status: "failed" })
        .eq("id", planRow.id);
    }
  })();

  // @ts-expect-error EdgeRuntime is provided by Deno Deploy / Supabase edge runtime.
  if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
    // @ts-expect-error see above
    EdgeRuntime.waitUntil(work);
  } else {
    // Local fallback — don't block.
    work.catch((e) => console.error("background work crashed", e));
  }

  return new Response(JSON.stringify({ ok: true, started: true, plan_id: planRow.id }), {
    status: 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
