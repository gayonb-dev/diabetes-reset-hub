// Edge function: verify-community-answer
// Admin marks a community answer as verified. We then:
//  1. Set community_answers.is_verified = true
//  2. Build combined_text = "Q: <question>\n\nA: <answer>"
//  3. Embed via Lovable AI Gateway (openai/text-embedding-3-small → 1536 dims)
//  4. Upsert into community_answer_embeddings
// Per Section 42(9): embeddings are only generated at admin verification time.
//
// Auth: caller must be admin.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2.45.4/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;

async function embed(text: string): Promise<number[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_KEY,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: text }),
  });
  if (!res.ok) throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding as number[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc("has_role", { p_user_id: user.id, p_role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const { answer_id } = await req.json();
    if (!answer_id) return new Response(JSON.stringify({ error: "answer_id required" }), { status: 400, headers: corsHeaders });

    const { data: answer, error: ae } = await admin
      .from("community_answers")
      .select("id, content, question_id")
      .eq("id", answer_id)
      .maybeSingle();
    if (ae || !answer) throw new Error(ae?.message ?? "Answer not found");

    const { data: q } = await admin
      .from("community_questions")
      .select("content")
      .eq("id", answer.question_id)
      .maybeSingle();

    const combined = `Q: ${q?.content ?? ""}\n\nA: ${answer.content}`;
    const vector = await embed(combined);

    // Mark verified
    await admin.from("community_answers").update({ is_verified: true }).eq("id", answer_id);

    // Upsert embedding (delete + insert to keep it simple — no unique constraint on answer_id)
    await admin.from("community_answer_embeddings").delete().eq("answer_id", answer_id);
    const { error: ie } = await admin.from("community_answer_embeddings").insert({
      answer_id,
      question_id: answer.question_id,
      combined_text: combined,
      embedding: vector as unknown as string,
    });
    if (ie) throw new Error(ie.message);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("verify-community-answer", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
