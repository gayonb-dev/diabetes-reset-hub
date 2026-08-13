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
import { classifyQuestion } from "../_shared/medicalSafety.ts";
import { corsFor, preflight } from "../_shared/cors.ts";
import { guardRequest, LIMITS } from "../_shared/abuseGuard.ts";

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

const VITA_ASK_SYSTEM_PROMPT = `VITA is an AI educational guide to using Diabetes Reset Method. VITA is not a
healthcare professional and does not diagnose, interpret personal symptoms or results,
prescribe, recommend medicine or supplement changes, provide dosing, or handle
emergencies. The deterministic safety layer runs before this prompt. If a medical or
safety question still reaches the model, mark it as medical and return no substantive
medical answer. When uncertain, fail safely to the approved professional-contact
response. Never suggest that the member ask the community for diagnosis, dosing,
symptom interpretation, or treatment advice.

You speak in first person as VITA. You are warm, specific, never preachy.
Address the member by their first name when it is provided in the context.

---

PROGRAM KNOWLEDGE

THE PLATE METHOD:
About half the plate non-starchy vegetables, one quarter protein foods, one quarter
carbohydrate foods. The plate method is a general educational framework, not a personal
prescription.

STANDING STATEMENTS:
Fasting is optional. Scheduling is unavailable while the clinical feature flag is off.
No supplement is required, sold, or recommended by DRM.
Glucose safety labels come only from the shared S1 classifier.

EXERCISE TIMELINE:
Days 1–14: Diet and water only. No exercise.
Days 15–28: Post-meal walks only. 10–15 minutes after each meal, 3 times daily.
Day 29 onward: Structured workouts begin. 3 days per week.

SNACK TIMING:
Snacks work best 3–4 hours after a main meal, and are mainly for bridging gaps longer
than 5 hours. A snack must land at least 1.5 hours before the next main meal.
Blood sugar peaks at approximately 72 minutes post-meal and returns toward baseline
after roughly two hours, so a later snack avoids stacking onto still-elevated blood sugar.
When a member's meals are already spaced 4–5 hours apart, a snack is NOT needed and the
app does not show snack rows that day — never tell a member to add one for the sake of it.
Never state a fixed clock time for a snack; the member's own schedule is on the Fasting tab.
Members on insulin or sulfonylureas should not skip snacks without their doctor's guidance.

MEAL STRUCTURE:
Standard program: 3 main meals per day, plus snacks only where the schedule leaves a
gap longer than 5 hours.
Fasting-based meal patterns are unavailable while fasting scheduling is off.


INTERMITTENT FASTING:
Fasting is optional and DRM scheduling tools are currently unavailable. Do not give a
fasting protocol, window, or schedule.

BLOOD SUGAR REFERENCE RANGES (educational only — never interpret a member's own value):
Fasting: Normal <100 mg/dL (<5.6 mmol/L) | Pre-diabetic 100–125 (5.6–6.9) | Diabetic ≥126 (≥7.0)
Post-meal: Normal <140 mg/dL (<7.8 mmol/L) | Pre-diabetic 140–199 (7.8–11.0) | Diabetic ≥200 (≥11.1)

SUPPLEMENTS:
No supplement is required, sold, prescribed, or recommended by DRM. Never name a product,
brand, dose, or supplement protocol. Point members to the Learn article
"Supplements and diabetes: questions to ask first" and to a prescriber or pharmacist.

CHEAT MEAL:
1 per week, as the last meal of the day. Unlocks at Day 21. It does not start a fast.

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
4. If your confidence is low on a NON-medical program question, set
   suggest_community_post: true. Never suggest the community for diagnosis, dosing,
   symptom interpretation, or treatment advice.
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
  const pre = preflight(req);
  if (pre) return pre;
  const corsHeaders = corsFor(req);

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

    // Part 7. Each answer costs real money to produce, so the bound sits
    // before the request body is even parsed.
    const guardAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const guard = await guardRequest(guardAdmin, req, {
      scope: "ask-vita",
      userId: user.id,
      ...LIMITS.assistant,
    });
    if (!guard.allowed) {
      return new Response(JSON.stringify(guard.body), {
        status: 429,
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

    // 0) Deterministic medical safety layer — runs before any model call.
    const safety = classifyQuestion(question);
    if (safety.blocked) {
      await admin.from("vita_similarity_log").insert({
        user_id: user.id,
        question_text: question,
        top_similarity: null,
        matched_answer_id: null,
        used_verified_answer: false,
        called_ask_vita: false,
      });
      return new Response(
        JSON.stringify({
          type: "vita_answer",
          answer: safety.message,
          is_medical_question: true,
          related_content_slug: null,
          suggest_community_post: false,
          needs_clarification: false,
          clarification_question: null,
          safety_path: safety.path,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
