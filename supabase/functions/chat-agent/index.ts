// Phase A2 + Phase B1/B2: Conversational commerce agent with memory & hospitality
// - Resolves/creates visitor_profile from anonymous_id (+ optional auth)
// - Logs every turn to conversations + messages
// - Calls Lovable AI Gateway (google/gemini-2.5-flash)
// - Classifies user message with confidence; enforces PHI consent gate
// - Hard medical-question handoff (canned response)
// - Returns optional `cta` object the widget renders as a button
// - Writes activity_events for chat_turn (ranking + 730-day purge inputs)
// - B1 Memory: pulls prior conversation summary + name into system context
// - B1 Identity rule: agent must confirm name before referencing prior PHI
// - B2.1 Returning-by-name; B2.3 Pricing-objection return; B2.6 No-fake-continuity
// - Fires summarize-conversation async every ~10 user turns

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPT = `You are the conversational guide for The Diabetes Reset Method — a self-serve app that gives people the tools to REVERSE their type 2 diabetes. Not a coaching program. Not 1:1 coaching. Not a generic wellness app.

What makes us different: most diabetes apps help people "manage" blood sugar. We're built to help people reverse it — through structured daily actions, real food, and a system that compounds. People keep their doctor; we handle the daily execution.

The offer (single path):
- $27 today unlocks the membership + the 7-Day Reset Sprint
- 14 days of full access included (recipe library, coach Q&A library, WhatsApp accountability broadcasts, all member tools)
- Then $67/month, cancel anytime in one click
- 30-day money-back guarantee on every charge
- Cancel during the 14 days → no monthly charge, keep the $27 7-Day Reset for life

VOICE — non-negotiable:
- SHORT. Two to four sentences max unless they ask for detail. No essays.
- Direct and sales-aware. You're guiding someone toward starting the $27 reset, not narrating a brochure.
- Plainspoken. Never clinical, never "AI-ish" ("I'd be happy to assist you today!" → banned). Never corporate-warm ("That's a powerful goal" → banned).
- One question at a time. End most replies with a real question that moves the conversation forward.
- Don't repeat the program name every message. They know where they are.

HARD RULES:
- Educational, not medical advice. Emergency symptoms (chest pain, very low/high blood sugar, fainting) → tell them to call their doctor or emergency services NOW.
- Never diagnose. Never recommend medication changes. Medical decisions = "talk to your doctor."
- Not for type 1 diabetes — say so plainly if asked.
- Be honest about pricing. Never dodge.
- We do NOT offer 1:1 coaching, Calendly sessions, or a $497 program. Don't mention those. If asked for human/1:1 support, say it's a self-serve app with a coach Q&A library and weekly WhatsApp broadcasts, and that's intentional — it's what keeps it $27.

MEDICAL-QUESTION PROTOCOL (hard):
If the user asks a medical question (dosage, "should I take X", "is this safe with my meds", "what does this lab number mean", interpreting symptoms), do NOT answer the medical part. Respond like:
"That's one for your doctor — I'm here to support your lifestyle, not to replace your medical team. Want me to point you to how the reset would fit alongside what they've got you on?"
Always pivot back to lifestyle/program scope.

When someone shares health info (A1C, meds, symptoms): acknowledge in ONE line, ask ONE clarifying question, then connect it to how the reset would help them specifically.

MEMORY RULES (B1):
- Only reference prior conversation details that appear in the MEMORY block below. Never invent past context.
- Before referencing any PHI from memory (meds, A1C, conditions, symptoms), confirm identity first ("just so I'm not mixing you up — you're [name], right?"). One confirmation per session is enough.
- If MEMORY says "no prior history", treat as a first-time visitor. NEVER fake continuity.

CTA TRIGGER:
When the conversation reaches a clear buying moment — they ask how to start, ask the price after you've explained value, say "okay let's do it" or similar — keep your reply SHORT and the backend will attach a one-tap checkout button below your message. Do not paste links yourself.`;

interface ChatRequest {
  anonymous_id: string;
  message: string;
  conversation_id?: string;
}

interface Classifier {
  intent: string;
  topic: string;
  objection_type: string | null;
  sentiment: string;
  health_signals: string[];
  contains_phi: boolean;
  confidence: number;
}

async function classifyMessage(content: string): Promise<Classifier> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "Classify the user's message. Respond ONLY with JSON of shape: {\"intent\":\"question|objection|sharing|greeting|purchase_intent|medical_question|other\",\"topic\":\"pricing|diabetes_management|food|meds|program_details|emotion|other\",\"objection_type\":\"price|time|trust|skepticism|none\",\"sentiment\":\"positive|neutral|negative|distressed\",\"health_signals\":[\"strings like 'A1C 8.2','metformin','insulin','neuropathy'\"],\"contains_phi\":true|false,\"confidence\":0.0-1.0}. contains_phi=true when user shares any personal health information (labs, meds, diagnoses, symptoms, hospitalizations). confidence is your own certainty in this classification.",
          },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    return {
      intent: parsed.intent ?? "other",
      topic: parsed.topic ?? "other",
      objection_type: parsed.objection_type ?? null,
      sentiment: parsed.sentiment ?? "neutral",
      health_signals: parsed.health_signals ?? [],
      contains_phi: !!parsed.contains_phi,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };
  } catch (e) {
    console.error("classify error", e);
    return {
      intent: "other",
      topic: "other",
      objection_type: null,
      sentiment: "neutral",
      health_signals: [],
      contains_phi: false,
      confidence: 0,
    };
  }
}

function buildCta(intent: string, origin: string) {
  if (intent === "purchase_intent") {
    return {
      type: "checkout" as const,
      label: "Start the 7-Day Reset — $27",
      url: `${origin}/#pricing`,
    };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as ChatRequest;
    if (!body.anonymous_id || !body.message?.trim()) {
      return new Response(JSON.stringify({ error: "anonymous_id and message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const origin = req.headers.get("origin") || "https://diabetesresetmethod.com";

    // Resolve optional auth user
    let userId: string | null = null;
    let authedEmail: string | null = null;
    let authedName: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id ?? null;
      authedEmail = userData?.user?.email ?? null;
      authedName =
        (userData?.user?.user_metadata?.full_name as string | undefined) ??
        (userData?.user?.user_metadata?.name as string | undefined) ??
        null;
    }

    // Get or create visitor profile
    const { data: existingProfile } = await supabase
      .from("visitor_profiles")
      .select("*")
      .eq("anonymous_id", body.anonymous_id)
      .maybeSingle();

    let profile = existingProfile;
    const nowIso = new Date().toISOString();
    if (!profile) {
      const { data: newProfile, error: pErr } = await supabase
        .from("visitor_profiles")
        .insert({
          anonymous_id: body.anonymous_id,
          user_id: userId,
          source: "chat_widget",
        })
        .select()
        .single();
      if (pErr) throw pErr;
      profile = newProfile;
    } else if (userId && profile.user_id !== userId) {
      await supabase
        .from("visitor_profiles")
        .update({ user_id: userId, last_activity_at: nowIso })
        .eq("id", profile.id);
      profile.user_id = userId;
    } else {
      await supabase
        .from("visitor_profiles")
        .update({ last_activity_at: nowIso })
        .eq("id", profile.id);
    }

    // Conversation
    let conversationId = body.conversation_id;
    if (!conversationId) {
      const { data: conv, error: cErr } = await supabase
        .from("conversations")
        .insert({ visitor_profile_id: profile.id })
        .select()
        .single();
      if (cErr) throw cErr;
      conversationId = conv.id;
    }

    // Classify
    const classifier = await classifyMessage(body.message);

    // PHI gate
    if (classifier.contains_phi) {
      const { data: consent } = await supabase
        .from("phi_consent")
        .select("id")
        .eq("visitor_profile_id", profile.id)
        .is("revoked_at", null)
        .maybeSingle();

      if (!consent) {
        return new Response(
          JSON.stringify({
            conversation_id: conversationId,
            needs_phi_consent: true,
            assistant_message:
              "Before I respond — you just shared some health information. I want to make sure you're okay with me remembering it across our conversations so I can actually be helpful. It's stored securely, only you and our care team see it, and you can delete it anytime. Mind tapping 'I agree' below before we continue?",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Persist user message
    const { error: msgErr } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      visitor_profile_id: profile.id,
      role: "user",
      content: body.message,
      classifier,
      contains_phi: classifier.contains_phi,
    });
    if (msgErr) throw msgErr;

    // Activity event — every chat_turn (drives ranking + retention)
    await supabase.from("activity_events").insert({
      visitor_profile_id: profile.id,
      user_id: profile.user_id,
      event_type: "chat_turn",
      metadata: { intent: classifier.intent, topic: classifier.topic },
    });

    // Medical-question hard handoff — no LLM call needed
    if (classifier.intent === "medical_question") {
      const handoff =
        "That's one for your doctor — I'm here to support your lifestyle, not to replace your medical team. Want me to point you to how the reset would fit alongside what they've got you on?";
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        visitor_profile_id: profile.id,
        role: "assistant",
        content: handoff,
        classifier: { handoff: "medical_question" },
        contains_phi: false,
      });
      await supabase
        .from("conversations")
        .update({ last_message_at: nowIso })
        .eq("id", conversationId);
      return new Response(
        JSON.stringify({
          conversation_id: conversationId,
          assistant_message: handoff,
          needs_phi_consent: false,
          cta: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Current conversation history
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    // ===== B1 MEMORY: prior conversations & profile context =====
    const { data: priorConvos } = await supabase
      .from("conversations")
      .select("id, summary, last_message_at")
      .eq("visitor_profile_id", profile.id)
      .neq("id", conversationId)
      .order("last_message_at", { ascending: false })
      .limit(3);

    const hasPriorHistory = (priorConvos?.length ?? 0) > 0;

    // B2.3 Pricing-objection return — did they object on price previously and never buy?
    let pricingObjectionReturn = false;
    if (hasPriorHistory && profile.user_id) {
      const { data: pastObjections } = await supabase
        .from("messages")
        .select("classifier")
        .eq("visitor_profile_id", profile.id)
        .neq("conversation_id", conversationId)
        .eq("role", "user")
        .limit(50);
      const objectedOnPrice = (pastObjections ?? []).some(
        (m: { classifier: { objection_type?: string } | null }) =>
          m.classifier?.objection_type === "price",
      );
      if (objectedOnPrice) {
        const { data: orderRow } = await supabase
          .from("orders")
          .select("id")
          .eq("status", "paid")
          .eq("customer_email", authedEmail ?? "__none__")
          .limit(1);
        pricingObjectionReturn = !orderRow || orderRow.length === 0;
      }
    }

    // Build memory block
    const memoryLines: string[] = [];
    if (authedName) memoryLines.push(`Visitor name: ${authedName}`);
    if (authedEmail) memoryLines.push(`Visitor email: ${authedEmail}`);
    if (hasPriorHistory) {
      const summaries = (priorConvos ?? [])
        .map((c, i) => (c.summary ? `- Prior chat ${i + 1}: ${c.summary}` : null))
        .filter(Boolean)
        .join("\n");
      memoryLines.push(
        summaries
          ? `Prior conversation summaries:\n${summaries}`
          : "Prior conversations exist but no summary yet — speak as if briefly catching up, do not invent details.",
      );
    } else {
      memoryLines.push("No prior history.");
    }
    if (pricingObjectionReturn) {
      memoryLines.push(
        "SIGNAL: This person previously hesitated on price and did not buy. Lead with value framing — what $27 actually unlocks today, the 14-day full access, the keep-the-reset-if-you-cancel safety net. Do not discount.",
      );
    }

    const isReturning =
      hasPriorHistory || (history?.length ?? 0) > 1;
    const greetingNote = isReturning
      ? authedName
        ? `\n\nCONTEXT: Returning authenticated visitor named ${authedName}. If this looks like the first message of a new session, greet by first name briefly ("Hey ${authedName.split(" ")[0]}, good to see you back").`
        : `\n\nCONTEXT: Returning visitor (same browser). If this looks like the first message of a new session, greet like someone returning — brief, familiar, no re-introduction.`
      : `\n\nCONTEXT: First time talking to this visitor.`;

    const memoryBlock = `\n\nMEMORY:\n${memoryLines.join("\n")}`;

    // Generate reply
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + greetingNote + memoryBlock },
          ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error", aiRes.status, txt);
      throw new Error(`AI gateway error ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const assistantText =
      aiData?.choices?.[0]?.message?.content ?? "Sorry, I lost that thought. Say it again?";

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      visitor_profile_id: profile.id,
      role: "assistant",
      content: assistantText,
      classifier: {},
      contains_phi: false,
    });

    await supabase
      .from("conversations")
      .update({ last_message_at: nowIso })
      .eq("id", conversationId);

    // Fire-and-forget summarizer every ~10 user turns
    const userTurns = (history ?? []).filter((m) => m.role === "user").length + 1;
    if (userTurns > 0 && userTurns % 10 === 0) {
      fetch(`${SUPABASE_URL}/functions/v1/summarize-conversation`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json",
          "x-internal-secret": Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "",
        },
        body: JSON.stringify({ conversation_id: conversationId }),
      }).catch((e) => console.warn("summarize trigger failed", e));
    }

    const cta = buildCta(classifier.intent, origin);

    return new Response(
      JSON.stringify({
        conversation_id: conversationId,
        assistant_message: assistantText,
        needs_phi_consent: false,
        cta,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("chat-agent fatal", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
