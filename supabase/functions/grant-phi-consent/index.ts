// Phase A3: PHI consent endpoint
// Records explicit health-data opt-in for a visitor profile.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const POLICY_VERSION = "2026-05-25-v1";

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
      .select("id")
      .eq("anonymous_id", anonymous_id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "visitor not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const ua = req.headers.get("user-agent") ?? null;

    await supabase.from("phi_consent").insert({
      visitor_profile_id: profile.id,
      user_id: userId,
      policy_version: POLICY_VERSION,
      ip_address: ip,
      user_agent: ua,
    });

    return new Response(JSON.stringify({ ok: true, policy_version: POLICY_VERSION }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("grant-phi-consent error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
