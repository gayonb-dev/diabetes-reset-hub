// Edge function: regenerate-due-plans
// Cron-triggered nightly via pg_cron. Finds members with a current plan whose
// valid_until <= NOW() + 3 days, creates a new pending plan that starts the
// day after, then invokes generate-meal-plan with the cron secret.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const cutoff = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: due } = await admin
    .from("meal_plans")
    .select("id, member_id, valid_until, plan_type, preferences_snapshot")
    .eq("generation_status", "complete")
    .lte("valid_until", cutoff)
    .order("valid_until", { ascending: true })
    .limit(500);

  const results: { member_id: string; status: string }[] = [];

  for (const plan of due ?? []) {
    // Skip if a newer plan already exists for this member
    const { data: newer } = await admin
      .from("meal_plans")
      .select("id")
      .eq("member_id", plan.member_id)
      .gt("valid_from", plan.valid_until)
      .maybeSingle();
    if (newer) continue;

    const newFrom = new Date(plan.valid_until + "T00:00:00Z");
    newFrom.setUTCDate(newFrom.getUTCDate() + 1);
    const inserts = [0, 7, 14, 21].map((offset) => {
      const from = new Date(newFrom);
      from.setUTCDate(newFrom.getUTCDate() + offset);
      const until = new Date(from);
      until.setUTCDate(from.getUTCDate() + 6);
      return {
        member_id: plan.member_id,
        plan_type: plan.plan_type,
        generation_status: "pending",
        generation_trigger: "scheduled",
        valid_from: from.toISOString().slice(0, 10),
        valid_until: until.toISOString().slice(0, 10),
        preferences_snapshot: plan.preferences_snapshot ?? {},
        plan_data: {},
      };
    });

    const { data: inserted, error: insErr } = await admin
      .from("meal_plans")
      .insert(inserts)
      .select("id");

    if (insErr || !inserted?.length) {
      results.push({ member_id: plan.member_id, status: "insert_failed" });
      continue;
    }

    // Fire all four week generations in parallel.
    try {
      const generationResults = await Promise.all(inserted.map((row, index) => fetch(`${SUPABASE_URL}/functions/v1/generate-meal-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Cron-Secret": CRON_SECRET,
        },
        body: JSON.stringify({ plan_id: row.id, member_id: plan.member_id, plan_index: index + 1 }),
      })));
      const failed = generationResults.find((r) => !r.ok);
      results.push({ member_id: plan.member_id, status: failed ? `err_${failed.status}` : "queued" });
    } catch {
      results.push({ member_id: plan.member_id, status: "invoke_failed" });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
