// Phase A2: Conversational commerce agent
// - Resolves/creates visitor_profile from anonymous_id (+ optional auth)
// - Logs every turn to conversations + messages
// - Calls Lovable AI Gateway (google/gemini-2.5-flash) for response
// - Classifies user message (intent, topic, objection_type, sentiment, health_signals, contains_phi)
// - Enforces PHI consent gate before persisting any message flagged as PHI
// - Updates last_activity_at (drives 730-day retention)

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

When someone shares health info (A1C, meds, symptoms): acknowledge in ONE line, ask ONE clarifying question, then connect it to how the reset would help them specifically.`;

interface ChatRequest {
  anonymous_id: string;
  message: string;
  conversation_id?: string;
  phi_consent_granted?: boolean;
}

async function classifyMessage(content: string): Promise<{
  intent: string;
  topic: string;
  objection_type: string | null;
  sentiment: string;
  health_signals: string[];
  contains_phi: boolean;
}> {
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
              "Classify the user's message. Respond ONLY with JSON matching this shape: {\"intent\":\"question|objection|sharing|greeting|purchase_intent|other\",\"topic\":\"pricing|diabetes_management|food|meds|program_details|emotion|other\",\"objection_type\":\"price|time|trust|skepticism|none\",\"sentiment\":\"positive|neutral|negative|distressed\",\"health_signals\":[\"strings like 'A1C 8.2','metformin','insulin','neuropathy'\"],\"contains_phi\":true|false}. contains_phi is true if the user shares any personal health information (lab numbers, medications, diagnoses, symptoms, hospitalizations).",
          },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    return JSON.parse(raw);
  } catch (e) {
    console.error("classify error", e);
    return {
      intent: "other",
      topic: "other",
      objection_type: null,
      sentiment: "neutral",
      health_signals: [],
      contains_phi: false,
    };
  }
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

    // Resolve optional auth user
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id ?? null;
    }

    // Get or create visitor profile
    const { data: existingProfile } = await supabase
      .from("visitor_profiles")
      .select("*")
      .eq("anonymous_id", body.anonymous_id)
      .maybeSingle();

    let profile = existingProfile;
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
      // Link to auth user (high-confidence merge: both client and server agree)
      await supabase
        .from("visitor_profiles")
        .update({ user_id: userId, last_activity_at: new Date().toISOString() })
        .eq("id", profile.id);
      profile.user_id = userId;
    } else {
      await supabase
        .from("visitor_profiles")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", profile.id);
    }

    // Get or create conversation
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

    // Classify the user message
    const classifier = await classifyMessage(body.message);

    // PHI gate: if contains_phi, require existing consent
    if (classifier.contains_phi) {
      const { data: consent } = await supabase
        .from("phi_consent")
        .select("id")
        .eq("visitor_profile_id", profile.id)
        .is("revoked_at", null)
        .maybeSingle();

      if (!consent) {
        // Do NOT persist the PHI message. Ask for consent first.
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

    // Load short history for context (last 20 turns of this conversation)
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Call Lovable AI for assistant reply
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiRes.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error", aiRes.status, txt);
      throw new Error(`AI gateway error ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const assistantText =
      aiData?.choices?.[0]?.message?.content ?? "Sorry, I lost that thought. Can you say it again?";

    // Persist assistant message
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      visitor_profile_id: profile.id,
      role: "assistant",
      content: assistantText,
      classifier: {},
      contains_phi: false,
    });

    // Touch conversation
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    return new Response(
      JSON.stringify({
        conversation_id: conversationId,
        assistant_message: assistantText,
        needs_phi_consent: false,
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
