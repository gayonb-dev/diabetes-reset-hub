// P2/P3: read-only legacy consent count and disposition report.
//
// Old phi_consent rows are NOT valid consent. This endpoint counts them and
// states their disposition. It performs no migration, purge, or conversion.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsFor, preflight, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const secret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  if (!secret || req.headers.get("x-internal-secret") !== secret) {
    return json(req, { error: "unauthorized" }, 401);
  }

  const { count: total } = await admin
    .from("phi_consent").select("id", { count: "exact", head: true });
  const { count: bound } = await admin
    .from("phi_consent").select("id", { count: "exact", head: true }).not("user_id", "is", null);
  const { count: revoked } = await admin
    .from("phi_consent").select("id", { count: "exact", head: true }).not("revoked_at", "is", null);
  const { count: newConsent } = await admin
    .from("consent_records").select("id", { count: "exact", head: true });

  return json(req, {
    generated_at: new Date().toISOString(),
    legacy_table: "public.phi_consent",
    counts: {
      total_rows: total ?? 0,
      bound_to_member: bound ?? 0,
      unbound_anonymous: (total ?? 0) - (bound ?? 0),
      already_revoked: revoked ?? 0,
    },
    current_consent_records: newConsent ?? 0,
    disposition: {
      writes: "blocked by trigger and revoked grants",
      validity: "not valid consent for any new processing",
      export: "included, labelled legacy_phi_consent, IP and user-agent redacted",
      deletion: "included as a labelled legacy record",
      migration: "none performed; requires explicit later approval",
      purge: "none performed",
    },
  });
});
