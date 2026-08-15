// Phase A2 + Phase B1/B2: Conversational commerce agent with memory & hospitality
// - Resolves the visitor profile only from the opaque server-issued session
//   token (see _shared/session.ts); no browser-supplied identifier is accepted

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
import { corsFor, preflight, requireAllowedOrigin } from "../_shared/cors.ts";
import { consumeRateLimit } from "../_shared/ratelimit.ts";
import { readSessionToken, resolveVisitorSession } from "../_shared/session.ts";
import { aiHealthEnabled } from "../_shared/config.ts";
import {
  AI_HEALTH_UNAVAILABLE,
  EMERGENCY_LINE,
  isPossibleEmergency,
  isHealthRelated,
  matchFaq,
  isApprovedChatPath,
  fallbackUrl,
  type FaqAction,
} from "../_shared/copy.ts";


const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPT = `You are the conversational guide for The Diabetes Reset Method — a self-guided educational membership for adults managing Type 2 diabetes or prediabetes. Not a coaching program. Not 1:1 coaching. Not a medical service.

What it is: small daily actions, meal ideas, tracking tools, educational membership support and printable reports for health visits. It does not diagnose, treat, cure or promise to reverse diabetes, and you must never claim or imply otherwise. Members keep their own doctor; the membership supports daily execution only.

The offer (single path):
- US$27 for the first 14 days of membership
- Included: recipe and meal library, educational Q&A library, WhatsApp broadcasts, member tools
- Then US$67 per month until canceled, cancel anytime in one click
- 30-day refund policy on each charge (see the Refund Terms page)
- Cancel inside the first 14 days and there is no monthly charge


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

When someone shares health info (A1C, meds, symptoms): acknowledge in ONE line, ask ONE clarifying question, then point back to what the membership actually provides. Never promise an outcome.

MEMORY RULES (B1):
- Only reference prior conversation details that appear in the MEMORY block below. Never invent past context.
- Before referencing any PHI from memory (meds, A1C, conditions, symptoms), confirm identity first ("just so I'm not mixing you up — you're [name], right?"). One confirmation per session is enough.
- If MEMORY says "no prior history", treat as a first-time visitor. NEVER fake continuity.

CTA TRIGGER:
When the conversation reaches a clear buying moment — they ask how to start, ask the price after you've explained value, say "okay let's do it" or similar — keep your reply SHORT. The server attaches its own approved membership link to your message. Never paste, invent or describe a link or button yourself, and never refer to "the button below".`;

interface ChatRequest {
  session_token?: string;
  message: string;
  conversation_id?: string;
  /** Non-sensitive intent key of the previous server reply (e.g. "faq_about"). */
  last_intent?: string;
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

/**
 * Structured, server-approved action. The path always comes from the
 * PUBLIC_CHAT_DESTINATIONS allow-list — model output never produces a link.
 */
function buildAction(action: FaqAction | null) {
  if (!action || !isApprovedChatPath(action.path)) return null;
  return {
    type: "link" as const,
    label: action.label,
    path: action.path,
    href: fallbackUrl(action.path),
  };
}

function buildCta(intent: string) {
  if (intent === "purchase_intent") {
    return buildAction({ label: "View membership and pricing", path: "/#pricing" });
  }
  return null;
}


Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const originBlocked = requireAllowedOrigin(req);
  if (originBlocked) return originBlocked;
  const corsHeaders = corsFor(req);


  try {
    // Reject oversized payloads before any authorization or processing work.
    const declared = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > 32_768) {
      return new Response(JSON.stringify({ error: "payload too large" }), {
        status: 413,
        headers: { ...corsFor(req), "Content-Type": "application/json" },
      });
    }
    const rawBody = await req.text();
    if (rawBody.length > 32_768) {
      return new Response(JSON.stringify({ error: "payload too large" }), {
        status: 413,
        headers: { ...corsFor(req), "Content-Type": "application/json" },
      });
    }
    let body: ChatRequest;
    try {
      body = JSON.parse(rawBody) as ChatRequest;
    } catch {
      return new Response(JSON.stringify({ error: "invalid JSON body" }), {
        status: 400,
        headers: { ...corsFor(req), "Content-Type": "application/json" },
      });
    }
    if (typeof body.message === "string" && body.message.length > 4000) {
      return new Response(JSON.stringify({ error: "message too long" }), {
        status: 400,
        headers: { ...corsFor(req), "Content-Type": "application/json" },
      });
    }
    if (!body.message?.trim()) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400,
        headers: { ...corsFor(req), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // ---- P4: the deletion lifecycle lock covers AI access too ----
    const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (bearer) {
      const { data: userData } = await supabase.auth.getUser(bearer);
      const uid = userData?.user?.id;
      if (uid) {
        const { data: locked, error: lockErr } = await supabase.rpc("deletion_lock_active", {
          p_user_id: uid,
        });
        // Fail closed: an indeterminate lookup denies access.
        if (lockErr || locked !== false) {
          return new Response(
            JSON.stringify({ error: "account_deletion_in_progress", locked: true }),
            { status: 423, headers: { ...corsFor(req), "Content-Type": "application/json" } },
          );
        }
      }
    }

    // ---- P1: authorization is the opaque session token, nothing else ----

    const session = await resolveVisitorSession(
      supabase,
      readSessionToken(req, body as unknown as Record<string, unknown>),
    );
    if (!session) {
      return new Response(JSON.stringify({ error: "no_active_session" }), {
        status: 401,
        headers: { ...corsFor(req), "Content-Type": "application/json" },
      });
    }

    // Bucket keyed by the opaque session id only. No address is read.
    const withinLimit = await consumeRateLimit(supabase, {
      scope: "chat",
      principal: { kind: "session", id: session.id },
      windowSeconds: 60,
      limit: 20,
    });
    if (!withinLimit) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...corsFor(req), "Content-Type": "application/json" },
      });
    }

    // ---- Deterministic emergency path: no storage, no processor, no AI ----
    if (isPossibleEmergency(body.message)) {
      return new Response(
        JSON.stringify({
          conversation_id: body.conversation_id ?? null,
          assistant_message: EMERGENCY_LINE,
          emergency: true,
          stored: false,
          cta: null,
          intent: "emergency",
          health_related: true,
        }),
        { headers: { ...corsFor(req), "Content-Type": "application/json" } },
      );
    }

    // ---- P2: AI-health gate. Closed by default, server-controlled. ----
    const healthGateOpen = await aiHealthEnabled(supabase);

    // ---- Deterministic membership FAQ (price / login / cancel) ----
    // While the health gate is closed the public chat answers these three
    // questions from approved server-held copy: no model call, no processor,
    // no stored content. Health wording never reaches this branch.
    if (!healthGateOpen) {
      const faq = matchFaq(body.message, body.last_intent ?? null);
      if (faq) {
        return new Response(
          JSON.stringify({
            conversation_id: body.conversation_id ?? null,
            assistant_message: faq.body,
            deterministic: true,
            stored: false,
            cta: buildAction(faq.action),
            intent: `faq_${faq.key}`,
            health_related: false,
          }),
          { headers: { ...corsFor(req), "Content-Type": "application/json" } },
        );
      }
    }
    if (!healthGateOpen && isHealthRelated(body.message)) {
      return new Response(
        JSON.stringify({
          conversation_id: body.conversation_id ?? null,
          ai_health_available: false,
          unavailable_state: AI_HEALTH_UNAVAILABLE,
          assistant_message: AI_HEALTH_UNAVAILABLE.body,
          stored: false,
          cta: null,
          intent: "health_unavailable",
          health_related: true,
        }),
        { headers: { ...corsFor(req), "Content-Type": "application/json" } },
      );
    }

    const nowIso = new Date().toISOString();
    const { data: profile } = await supabase
      .from("visitor_profiles")
      .select("*")
      .eq("id", session.visitor_profile_id)
      .maybeSingle();
    if (!profile) {
      return new Response(JSON.stringify({ error: "no_active_session" }), {
        status: 401,
        headers: { ...corsFor(req), "Content-Type": "application/json" },
      });
    }
    await supabase
      .from("visitor_profiles")
      .update({ last_activity_at: nowIso })
      .eq("id", profile.id);

    const userId = session.user_id;
    const authedEmail: string | null = null;
    const authedName: string | null = null;

    // ---- Conversation: a caller-supplied id is only honoured when it belongs
    //      to this session's visitor profile. It is never authorization. ----
    let conversationId: string | undefined;
    if (body.conversation_id) {
      const { data: owned } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", body.conversation_id)
        .eq("visitor_profile_id", profile.id)
        .maybeSingle();
      conversationId = owned?.id;
      if (!conversationId) {
        return new Response(JSON.stringify({ error: "conversation_not_found" }), {
          status: 403,
          headers: { ...corsFor(req), "Content-Type": "application/json" },
        });
      }
    }
    if (!conversationId) {
      const { data: conv, error: cErr } = await supabase
        .from("conversations")
        .insert({ visitor_profile_id: profile.id })
        .select()
        .single();
      if (cErr) throw cErr;
      conversationId = conv.id;
    }

    // Classify (non-health traffic only — health messages never reach the gateway)
    const classifier = await classifyMessage(body.message);

    // Belt and braces: if the classifier still flags PHI while the gate is
    // closed, refuse without storing and without a further processor call.
    if (!healthGateOpen && classifier.contains_phi) {
      return new Response(
        JSON.stringify({
          conversation_id: conversationId,
          ai_health_available: false,
          unavailable_state: AI_HEALTH_UNAVAILABLE,
          assistant_message: AI_HEALTH_UNAVAILABLE.body,
          stored: false,
          cta: null,
          intent: "health_unavailable",
          health_related: true,
        }),
        { headers: { ...corsFor(req), "Content-Type": "application/json" } },
      );
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
        "That's a question for your doctor — I'm not qualified to give medical advice. What I can help with is how the program works and whether it might be right for you.";
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
          intent: "medical_question",
          health_related: true,
        }),
        { headers: { ...corsFor(req), "Content-Type": "application/json" } },
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
        "SIGNAL: This person previously hesitated on price and did not buy. Lead with value framing — what $27 actually unlocks today, the 14 days of access at US$27, and that cancelling inside those 14 days avoids the monthly charge. Do not discount.",
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
        headers: { ...corsFor(req), "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402,
        headers: { ...corsFor(req), "Content-Type": "application/json" },
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

    const cta = buildCta(classifier.intent);
    const healthRelated =
      classifier.contains_phi ||
      classifier.topic === "diabetes_management" ||
      classifier.topic === "meds" ||
      (classifier.health_signals?.length ?? 0) > 0;

    return new Response(
      JSON.stringify({
        conversation_id: conversationId,
        assistant_message: assistantText,
        needs_phi_consent: false,
        cta,
        intent: classifier.intent,
        health_related: healthRelated,
      }),
      { headers: { ...corsFor(req), "Content-Type": "application/json" } },
    );

  } catch (e) {
    console.error("chat-agent fatal", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsFor(req), "Content-Type": "application/json" },
    });
  }
});
