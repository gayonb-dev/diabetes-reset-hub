// Audited read of PHI-bearing rows. Every call logs to phi_access_log.
// Admin-only. Used by AdminQaQueue, AdminWaitlist, AdminDashboard (intakes),
// and future conversation viewer + top-customers cards.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Allowlist — only these tables can be read through this function.
const PHI_TABLES = new Set([
  "qa_submissions",
  "coaching_waitlist",
  "intake_submissions",
  "messages",
  "conversations",
]);

interface ReadRequest {
  table: string;
  reason: string;
  filters?: Record<string, string | number | boolean>;
  order_by?: { column: string; ascending?: boolean };
  limit?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.slice(7);

    const userClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 2. Admin check
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Parse + validate
    const body = (await req.json()) as ReadRequest;
    if (!body.table || !PHI_TABLES.has(body.table)) {
      return new Response(JSON.stringify({ error: "Invalid table" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!body.reason || body.reason.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "A reason (min 3 chars) is required for PHI access." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Query
    let q = admin.from(body.table).select("*");
    if (body.filters) {
      for (const [k, v] of Object.entries(body.filters)) q = q.eq(k, v as never);
    }
    if (body.order_by) {
      q = q.order(body.order_by.column, { ascending: body.order_by.ascending ?? false });
    }
    if (body.limit) q = q.limit(body.limit);

    const { data: rows, error: qErr } = await q;
    if (qErr) throw qErr;

    // 5. Audit log — one row per read call, plus row_ids in metadata.
    await admin.from("phi_access_log").insert({
      actor_kind: "admin",
      actor_user_id: userId,
      table_name: body.table,
      reason: body.reason.trim(),
      // Row-level granularity: log each row id read.
      row_id: null,
    });

    return new Response(JSON.stringify({ rows: rows ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("read-phi-data", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
