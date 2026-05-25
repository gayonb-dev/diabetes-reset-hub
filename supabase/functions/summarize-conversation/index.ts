// Phase B1: Rolling conversation summarizer
// Called fire-and-forget from chat-agent every ~10 user turns.
// Reads all messages in a conversation, generates a 2-3 sentence summary
// (PHI-aware: include health context but mark with [PHI] tag so downstream
// surfaces know not to render in non-PHI contexts), writes to conversations.summary.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { conversation_id } = await req.json();
    if (!conversation_id) {
      return new Response(JSON.stringify({ error: "conversation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: msgs } = await supabase
      .from("messages")
      .select("role, content, contains_phi")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    if (!msgs || msgs.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transcript = msgs
      .map((m) => `${m.role.toUpperCase()}${m.contains_phi ? " [PHI]" : ""}: ${m.content}`)
      .join("\n");

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
              "Summarize this customer chat in 2-3 short sentences for an agent's future memory. Capture: who they are, what they're trying to solve, key objections, and any commitments. If health info appeared, prefix that sentence with '[PHI]'. Plainspoken. No marketing fluff.",
          },
          { role: "user", content: transcript },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("summarize ai error", res.status, t);
      throw new Error(`summarize ai ${res.status}`);
    }

    const data = await res.json();
    const summary = data?.choices?.[0]?.message?.content ?? null;
    if (!summary) {
      return new Response(JSON.stringify({ ok: true, skipped: "no summary" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("conversations")
      .update({ summary })
      .eq("id", conversation_id);

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-conversation fatal", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
