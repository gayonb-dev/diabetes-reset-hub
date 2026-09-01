// P3: retention worker, REPORT ONLY.
//
// This function calculates what WOULD be eligible under the retention policy
// and writes nothing. It performs no delete, no update, and no purge, including
// against synthetic staging rows. Converting it to an enforcing worker is a
// separate, explicitly approved change.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsFor, preflight, json } from "../_shared/cors.ts";
import { getConfig } from "../_shared/config.ts";

const INACTIVITY_DAYS = 730;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const secret = Deno.env.get("CRON_INTERNAL_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return json(req, { error: "unauthorized" }, 401);
  }

  const mode = await getConfig<string>(admin, "retention_mode", "report_only");
  if (mode !== "report_only") {
    return json(req, { error: "enforcing_retention_not_authorized", mode }, 409);
  }

  const cutoff = new Date(Date.now() - INACTIVITY_DAYS * 86_400_000).toISOString();

  const count = async (table: string, col: string) => {
    const { count: c, error } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .lt(col, cutoff);
    return error ? { table, error: error.message } : { table, eligible: c ?? 0 };
  };

  const report = {
    generated_at: new Date().toISOString(),
    mode: "report_only",
    purged: 0,
    deleted_rows: 0,
    inactivity_days: INACTIVITY_DAYS,
    cutoff,
    buckets: [
      await count("visitor_profiles", "last_activity_at"),
      await count("conversations", "last_message_at"),
      await count("messages", "created_at"),
      await count("activity_events", "event_at"),
      await count("visitor_sessions", "expires_at"),
    ],
    note:
      "Report only. No rows were deleted, updated, or purged. Enforcement requires separate approval.",
  };

  console.log("retention-report", JSON.stringify(report));
  return json(req, report);
});
