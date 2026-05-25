// Phase A3: Deletion endpoint — full PHI purge within 24h.
// Performs the purge immediately and records the request for audit.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { anonymous_id } = await req.json();
    if (!anonymous_id) {
      return new Response(JSON.stringify({ error: "anonymous_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data } = await supabase.auth.getUser(authHeader.slice(7));
      userId = data?.user?.id ?? null;
    }

    const { data: profile } = await supabase
      .from("visitor_profiles")
      .select("id, user_id")
      .eq("anonymous_id", anonymous_id)
      .maybeSingle();

    // Authorization: anonymous visitor can delete own anonymous profile;
    // authenticated user can delete any profile linked to their user_id.
    if (profile?.user_id && profile.user_id !== userId) {
      return new Response(JSON.stringify({ error: "not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: request } = await supabase
      .from("deletion_requests")
      .insert({
        visitor_profile_id: profile?.id ?? null,
        user_id: userId,
        status: "pending",
      })
      .select()
      .single();

    if (profile) {
      // Log access (purge action)
      await supabase.from("phi_access_log").insert({
        actor_user_id: userId,
        actor_kind: userId ? "admin" : "system",
        visitor_profile_id: profile.id,
        table_name: "visitor_profiles",
        row_id: profile.id,
        reason: "user_requested_deletion",
      });

      // Cascade delete: visitor_profiles ON DELETE CASCADE removes conversations,
      // messages, phi_consent rows automatically.
      const { error: delErr } = await supabase
        .from("visitor_profiles")
        .delete()
        .eq("id", profile.id);

      if (delErr) {
        await supabase
          .from("deletion_requests")
          .update({ status: "failed", notes: delErr.message })
          .eq("id", request.id);
        throw delErr;
      }
    }

    await supabase
      .from("deletion_requests")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", request.id);

    return new Response(JSON.stringify({ ok: true, request_id: request.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("request-data-deletion error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
