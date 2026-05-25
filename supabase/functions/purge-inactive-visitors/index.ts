// Phase A3: 730-day retention cron.
// Deletes visitor_profiles where last_activity_at < now() - 730 days.
// Cascades remove conversations, messages, phi_consent.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RETENTION_DAYS = 730;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: stale } = await supabase
      .from("visitor_profiles")
      .select("id")
      .lt("last_activity_at", cutoff);

    const count = stale?.length ?? 0;

    if (count > 0) {
      // Log access for each before purge
      const logs = stale!.map((p) => ({
        actor_kind: "system",
        visitor_profile_id: p.id,
        table_name: "visitor_profiles",
        row_id: p.id,
        reason: `auto_purge_${RETENTION_DAYS}_day_retention`,
      }));
      await supabase.from("phi_access_log").insert(logs);

      const { error } = await supabase
        .from("visitor_profiles")
        .delete()
        .lt("last_activity_at", cutoff);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ ok: true, purged: count, cutoff, retention_days: RETENTION_DAYS }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("purge-inactive-visitors error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
