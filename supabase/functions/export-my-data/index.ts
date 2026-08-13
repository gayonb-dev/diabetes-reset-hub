// P3: member data export.
//
// Requires a verified JWT AND a single-use reauth ticket bound to "export".
// One snapshot produces both a readable ZIP (README + named CSVs) and a
// machine-readable JSON. Neither payload is returned inline: each is stored as
// a one-time artifact reachable for at most five minutes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsFor, preflight, json, requireAllowedOrigin } from "../_shared/cors.ts";
import { sha256Hex, newToken, verifiedUserId, deletionLockActive } from "../_shared/session.ts";
import { buildSnapshot, snapshotReadme } from "../_shared/exportBuild.ts";
import { guardRequest, LIMITS } from "../_shared/abuseGuard.ts";
import { buildZip, toCsv } from "../_shared/zip.ts";

const TTL_SECONDS = 300;

function toHex(bytes: Uint8Array): string {
  return "\\x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const originBlocked = requireAllowedOrigin(req);
  if (originBlocked) return originBlocked;
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);
  const ctype = req.headers.get("content-type") ?? "";
  if (!ctype.includes("application/json")) {
    return json(req, { error: "unsupported_media_type" }, 415);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json(req, { error: "invalid_json" }, 400); }

  const userId = await verifiedUserId(admin, req);
  if (!userId) return json(req, { error: "unauthenticated" }, 401);

  // Part 7. A TEMPORARY, self-expiring throttle on a rights endpoint. It slows
  // a burst; it never refuses the right. The window is short and the message
  // offers a human route, so no one can be locked out of their own data.
  const exportGuard = await guardRequest(admin, req, {
    scope: "export-my-data",
    userId,
    rightsEndpoint: true,
    ...LIMITS.rights,
  });
  if (!exportGuard.allowed) return json(req, exportGuard.body, 429);

  const ticket = req.headers.get("x-reauth-ticket") ?? body.ticket;
  if (typeof ticket !== "string" || !ticket) {
    return json(req, { error: "reauth_ticket_required" }, 401);
  }
  const { data: consumed, error: cErr } = await admin.rpc("consume_reauth_ticket", {
    p_token_hash: await sha256Hex(ticket),
    p_user_id: userId,
    p_action: "export",
  });
  if (cErr || consumed !== true) return json(req, { error: "invalid_or_expired_ticket" }, 401);

  if (await deletionLockActive(admin, userId)) {
    return json(req, { error: "account_deletion_in_progress" }, 423);
  }

  // Rate limit: five exports per hour per member.
  const { data: rl } = await admin.rpc("consume_rate_limit", {
    p_bucket: `export:${userId}`,
    p_window_seconds: 3600,
    p_limit: 5,
  });
  if (rl === false) return json(req, { error: "rate_limited" }, 429);

  // Housekeeping: expired artifacts are removed on every export.
  await admin.rpc("purge_expired_export_artifacts");

  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const email = userData?.user?.email ?? "";

  const snapshot = await buildSnapshot(admin, userId, email);

  const jsonBytes = new TextEncoder().encode(JSON.stringify(snapshot, null, 2));
  const zipBytes = buildZip([
    { name: "README.txt", data: snapshotReadme(snapshot) },
    { name: "export.json", data: jsonBytes },
    ...Object.entries(snapshot.categories).map(([name, rows]) => ({
      name: `${name}.csv`,
      data: rows.length ? toCsv(rows) : "(no records)\r\n",
    })),
  ]);

  const now = new Date();
  const links: Record<string, string> = {};
  for (const [format, bytes] of [["json", jsonBytes], ["zip", zipBytes]] as const) {
    const token = newToken();
    const { error } = await admin.from("export_artifacts").insert({
      user_id: userId,
      format,
      token_hash: await sha256Hex(token),
      content: toHex(bytes),
      byte_size: bytes.length,
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + TTL_SECONDS * 1000).toISOString(),
    });
    if (error) {
      console.error("artifact store failed", error.message);
      return json(req, { error: "export_failed" }, 500);
    }
    links[format] = `${Deno.env.get("SUPABASE_URL")}/functions/v1/download-export?t=${token}`;
  }

  return json(req, {
    ok: true,
    expires_in_seconds: TTL_SECONDS,
    single_use: true,
    categories: snapshot.meta.categories_included,
    row_counts: snapshot.meta.row_counts,
    download: links,
  }, 200, {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
});
