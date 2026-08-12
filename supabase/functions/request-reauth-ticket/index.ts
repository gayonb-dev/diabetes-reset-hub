// P3: single-use server action ticket for export / account deletion.
//
// The ticket is bound to the verified user, to one action, and expires in at
// most ten minutes. It is consumed exactly once. No client timestamp, boolean,
// local-storage value, or typed confirmation word is accepted in its place.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsFor, preflight, json, requireAllowedOrigin } from "../_shared/cors.ts";
import { newToken, sha256Hex } from "../_shared/session.ts";

const TTL_MINUTES = 10;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const originBlocked = requireAllowedOrigin(req);
  if (originBlocked) return originBlocked;
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }

  const action = String(body.action ?? "");
  if (action !== "export" && action !== "delete") {
    return json(req, { error: "invalid_action" }, 400);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(req, { error: "unauthenticated" }, 401);

  // Re-verify the password against Auth: this is the reauthentication step.
  const password = body.password;
  const { data: userData, error: userErr } = await admin.auth.getUser(authHeader.slice(7));
  if (userErr || !userData?.user?.email) return json(req, { error: "unauthenticated" }, 401);

  if (typeof password !== "string" || password.length === 0) {
    return json(req, { error: "reauthentication_required" }, 401);
  }

  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: signInErr } = await anon.auth.signInWithPassword({
    email: userData.user.email,
    password,
  });
  if (signInErr) return json(req, { error: "reauthentication_failed" }, 401);

  const { data: rl } = await admin.rpc("consume_rate_limit", {
    p_bucket: `reauth:${userData.user.id}`,
    p_window_seconds: 600,
    p_limit: 5,
  });
  if (rl === false) return json(req, { error: "rate_limited" }, 429);

  const token = newToken();
  const now = new Date();
  const { error } = await admin.from("reauth_tickets").insert({
    user_id: userData.user.id,
    action,
    token_hash: await sha256Hex(token),
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + TTL_MINUTES * 60_000).toISOString(),
  });
  if (error) {
    console.error("ticket mint failed", error.message);
    return json(req, { error: "ticket_mint_failed" }, 500);
  }

  return json(req, { ticket: token, action, expires_in_seconds: TTL_MINUTES * 60 });
});
