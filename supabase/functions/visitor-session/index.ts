// P1: opaque visitor session lifecycle.
//
// actions:
//   start       -> issue a new session token (no identifier comes from the browser)
//   merge       -> bind the active anonymous session to the verified member, once
//   delete_chat -> delete this session's conversation, messages, consent and
//                  derived records, then revoke the token
//
// A visitor ID or conversation ID is never accepted as authorization.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { preflight, json, requireAllowedOrigin } from "../_shared/cors.ts";
import {
  issueVisitorSession,
  issueSessionForProfile,
  readSessionToken,
  resolveVisitorSession,
  revokeSession,
  verifiedUserId,
} from "../_shared/session.ts";
import { aiHealthEnabled, noticeVersion } from "../_shared/config.ts";
import { consumeRateLimit, purgeExpiredRateLimits } from "../_shared/ratelimit.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const blocked = requireAllowedOrigin(req);
  if (blocked) return blocked;
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

  // ---------- start ----------
  if (action === "start") {
    // PRIMARY control: partitioned by an HMAC of the platform-verified,
    // caller-unmodifiable ingress value (see _shared/ratelimit.ts). Fails
    // closed when no trusted value or no HMAC key is available.
    const perCaller = await consumeRateLimit(admin, {
      scope: "session_start",
      principal: { kind: "ip", req },
      windowSeconds: 300,
      limit: 20,
    });
    if (!perCaller) return json(req, { error: "rate_limited" }, 429);

    // SECONDARY abuse ceiling only, deliberately far above the per-caller
    // limit so it can never be the effective control for a single visitor.
    const ceiling = await consumeRateLimit(admin, {
      scope: "session_start_ceiling",
      principal: { kind: "global", scope: "anonymous" },
      windowSeconds: 300,
      limit: 5000,
    });
    if (!ceiling) return json(req, { error: "rate_limited" }, 429);
    // Opportunistic 24-hour purge of expired rate-limit rows.
    await purgeExpiredRateLimits(admin);


    try {
      const { token, session } = await issueVisitorSession(admin, req);
      return json(req, {
        session_token: token,
        expires_at: session.expires_at,
        ai_health_available: await aiHealthEnabled(admin),
        notice_version: await noticeVersion(admin),
      });
    } catch (e) {
      console.error("session start failed", (e as Error).message);
      return json(req, { error: "session_start_failed" }, 500);
    }
  }


  const token = readSessionToken(req, body);
  const session = await resolveVisitorSession(admin, token);

  // ---------- merge ----------
  if (action === "merge") {
    const userId = await verifiedUserId(admin, req);
    if (!userId) return json(req, { error: "unauthenticated" }, 401);
    if (!session) return json(req, { error: "no_active_session" }, 401);

    // Single transaction, at most once, never overwrites an existing binding.
    const { data, error } = await admin.rpc("merge_visitor_session_into_member", {
      p_session_id: session.id,
      p_user_id: userId,
    });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("already_bound")) return json(req, { error: "already_bound" }, 409);
      if (msg.includes("session_already_merged")) return json(req, { error: "already_merged" }, 409);
      console.error("merge failed", msg);
      return json(req, { error: "merge_failed" }, 500);
    }

    // Rotate the session after a successful merge.
    await revokeSession(admin, session.id);
    const rotated = await issueSessionForProfile(
      admin, req, session.visitor_profile_id, session.id, userId,
    );
    return json(req, { ok: true, merged: data, session_token: rotated.token });
  }

  // ---------- delete_chat ----------
  if (action === "delete_chat") {
    if (!session) return json(req, { error: "no_active_session" }, 401);

    const { data, error } = await admin.rpc("delete_visitor_session_data", {
      p_session_id: session.id,
    });
    if (error) {
      console.error("delete_chat failed", error.message);
      return json(req, { error: "delete_failed" }, 500);
    }
    await revokeSession(admin, session.id);

    return json(req, {
      ok: true,
      deleted: data,
      // Processor deletion is only claimed once verified. It is not verified here.
      processor_deletion: {
        claimed: false,
        status: "not_verified",
        note:
          "Records held by external processors are tracked separately and are not claimed as deleted.",
      },
    });
  }

  return json(req, { error: "unknown_action" }, 400);
});
