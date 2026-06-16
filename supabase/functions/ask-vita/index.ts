// Edge function: ask-vita
// Section 39 of the DRM build spec. VITA answers DRM program questions.
// Flow:
//   1. Embed the incoming question via Lovable AI Gateway embeddings endpoint.
//   2. Cosine-similarity search against verified admin answers (pgvector).
//   3. If similarity >= 0.82 → return the existing verified answer (no LLM call).
//   4. Else → call the Gateway with the VITA system prompt and a Zod-shaped
//      structured output. Return as JSON.
//   5. Log the similarity score either way to vita_similarity_log.
//
// Auth: requires the caller's JWT. Function validates it and uses the
// resulting user_id when writing to vita_similarity_log.

import { generateObject } from "npm:ai@4.3.16";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@0.2.14";
import { z } from "npm:zod@3.23.8";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform" };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const gateway = createOpenAICompatible({
  name: "lovable",
  baseURL: "https://ai.gateway.lovable.dev/v1",
  headers: {
    "Lovable-API-Key": LOVABLE_KEY,
    "X-Lovable-AIG-SDK": "vercel-ai-sdk",
  },
});
const model = gateway("google/gemini-2.5-flash");

const VitaAnswerSchema = z.object({
  answer: z.string(),
  is_medical_question: z.boolean(),
  related_content_slug: z.string().nullable(),
  suggest_community_post: z.boolean(),
  needs_clarification: z.boolean(),
  clarification_question: z.string().nullable(),
});

const VITA_ASK_SYSTEM_PROMPT = `You are VITA, the Diabetes Reset Method program guide. You answer questions
about the DRM program with warmth, precision, and clinical accuracy.
You speak in first person as VITA. You are warm, specific, never preachy.
Address the member by their first name when it is provided in the context.

---

PROGRAM KNOWLEDGE

THE PLATE METHOD:
Every main meal: 50% non-starchy vegetables, 25% lean protein, 25% complex carbohydrates.
This is the foundational habit from Day 1. Non-negotiable.

EXERCISE TIMELINE:
Days 1–14: Diet and water only. No exercise.
Days 15–28: Post-meal walks only. 10–15 minutes after each meal, 3 times daily.
Day 29 onward: Structured workouts begin. 3 days per week.

SNACK TIMING:
Snacks are eaten 2.5–3 hours after a main meal, at least 1.5 hours before the next meal.
This is research-backed — blood sugar peaks at approximately 72 minutes post-meal and
returns toward baseline at 2–2.5 hours. Eating at 2.5–3 hours prevents stacking a
snack onto still-elevated blood sugar.
Members on insulin or sulfonylureas should not skip snacks without their doctor's guidance.

MEAL STRUCTURE:
Standard program: 3 main meals + 2 snacks per day. Always.
IF mode: 2 main meals + 2 snacks within the eating window.

INTERMITTENT FASTING:
Unlocks at Day 21 with 21 consecutive days plate method compliance + water goal 5/7 days
for 2 consecutive weeks. Starting protocol: 14-hour fast (10-hour eating window).
Structure: 2 main meals + 2 snacks in the eating window.
Extends to 16:8 after 2 weeks at 14 hours if member chooses.
12-hour option if 3+ consecutive days of low energy ratings or insufficient mood data.
Permitted during the fast: water, plain tea, plain black coffee. Nothing else.

BLOOD SUGAR REFERENCE RANGES:
Fasting: Normal <100 mg/dL (<5.6 mmol/L) | Pre-diabetic 100–125 (5.6–6.9) | Diabetic ≥126 (≥7.0)
Post-meal: Normal <140 mg/dL (<7.8 mmol/L) | Pre-diabetic 140–199 (7.8–11.0) | Diabetic ≥200 (≥11.1)

SUPPLEMENTS:
Everyone from Day 1: Nature Made Diabetes Health Pack — 1 packet daily with largest meal.
Knee issues (Month 2): Solgar Glucosamine Hyaluronic Acid Chondroitin MSM — 3 tablets once daily.
Neuropathy (Month 2): DEAL Supplement R-ALA 600mg + Benfotiamine 300mg — 3 capsules once daily.
From Day 15: ACV 1–2 tbsp in water before meals. Ceylon cinnamon (not Cassia) half to 1 tsp daily.

CHEAT MEAL:
1 per week. Last meal of the day only. Fast begins immediately after. Unlocks at Day 21.

A1C RANGES:
Non-diabetic: <5.7% / <39 mmol/mol | Pre-diabetic: 5.7–6.4% / 39–46 | Diabetic: ≥6.5% / ≥48

WATER TARGET:
Body weight in pounds ÷ 2 = daily ounces target.

PROGRAM PHASES:
Phase 1 (Days 1–14): Diet and water.
Phase 2 (Days 15–28): Walking added.
Phase 3 (Days 29–90): Structured workouts begin.
Phase 4 (Days 91–135): Advanced protocols.
Phase 5 (Days 136–180): Final stretch.

---

BEHAVIOR RULES

1. Answer program questions with confidence and precision.
2. If a question is ambiguous, set needs_clarification: true and ask ONE clarifying
   question in clarification_question. Do not guess. Do not ask more than one question.
3. Medical questions (medication dosages, drug interactions, symptom diagnosis,
   clinical treatment): set is_medical_question: true. The system will show the
   standard refusal regardless of your answer field.
4. If your confidence is low or the question is highly personal and situational:
   set suggest_community_post: true. Other members and the DRM team can answer
   from personal experience.
5. When your answer relates directly to Learn section content: set related_content_slug.
6. Keep answers concise. Maximum 3 paragraphs. If more detail is needed, link to Learn.
7. Never speculate. If not certain, say so and suggest community or DRM team.
8. You only answer questions about the DRM program and diabetes management within
   the program context. Do not answer unrelated questions.
9. Never recommend specific doctors, clinics, or third-party products beyond what
   the DRM program officially recommends.`;

async function embed(text: string): Promise<number[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_KEY,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text,
    }),
  });
  if (!res.ok) {
    throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.data[0].embedding as number[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const question: string = (body?.question ?? "").toString().trim();
    const firstName: string | null = body?.first_name ?? null;
    const dayInProgram: number | null = body?.day_in_program ?? null;
    const history: Array<{ role: string; content: string }> = Array.isArray(body?.history) ? body.history : [];

    if (question.length < 3) {
      return new Response(JSON.stringify({ error: "Question too short" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) Embed question
    const vector = await embed(question);

    // 2) Search verified answers
    const { data: matches, error: searchErr } = await admin.rpc("search_verified_answers", {
      query_embedding: vector as unknown as string,
      similarity_threshold: 0.82,
      match_count: 1,
    });
    if (searchErr) console.error("search error", searchErr);

    const topMatch = matches && matches.length > 0 ? matches[0] : null;

    // Log similarity (best effort)
    await admin.from("vita_similarity_log").insert({
      user_id: user.id,
      question_text: question,
      top_similarity: topMatch?.similarity ?? null,
      matched_answer_id: topMatch?.answer_id ?? null,
      used_verified_answer: !!topMatch,
      called_ask_vita: !topMatch,
    });

    if (topMatch) {
      return new Response(
        JSON.stringify({
          type: "verified_existing",
          answer_id: topMatch.answer_id,
          question_id: topMatch.question_id,
          similarity: topMatch.similarity,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) Call Gateway w/ structured output
    const userContext = [
      firstName ? `Member first name: ${firstName}` : null,
      dayInProgram ? `Member is on Day ${dayInProgram} of the program.` : null,
    ].filter(Boolean).join("\n");

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: VITA_ASK_SYSTEM_PROMPT },
    ];
    if (userContext) messages.push({ role: "system", content: userContext });
    for (const turn of history) {
      if (turn.role === "user" || turn.role === "assistant") {
        messages.push({ role: turn.role, content: String(turn.content) });
      }
    }
    messages.push({ role: "user", content: question });

    const { object } = await generateObject({
      model,
      schema: VitaAnswerSchema,
      mode: "json",
      messages,
    });

    return new Response(
      JSON.stringify({ type: "vita_answer", ...object }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("ask-vita error", err);
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    const safeMessage =
      status === 429 ? "Rate limited" : status === 402 ? "Service unavailable" : "Internal server error";
    return new Response(JSON.stringify({ error: safeMessage }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
