// P1: opaque server-side visitor sessions and verified member identity.
//
// The browser never holds a visitor UUID or a database primary key it can send
// as authorization. It holds one opaque random token. The server hashes it and
// looks the session up. A visitor or conversation ID presented by a caller is
// never accepted as proof of anything.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { IP_HMAC_KEY_ENV, ingressIpHmac } from "./ratelimit.ts";

export interface VisitorSession {
  id: string;
  visitor_profile_id: string;
  user_id: string | null;
  expires_at: string;
  revoked_at: string | null;
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function newToken(): string {
  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  return Array.from(raw).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Keyed HMAC of a value under IP_HMAC_KEY. Returns null when the key is
 * missing so callers fail closed instead of persisting a raw value.
 */
export async function hmacHex(value: string, keyEnv = IP_HMAC_KEY_ENV): Promise<string | null> {
  const secret = Deno.env.get(keyEnv);
  if (!secret || !value) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}


export function readSessionToken(req: Request, body?: Record<string, unknown>): string | null {
  const header = req.headers.get("x-visitor-session");
  if (header && /^[a-f0-9]{64}$/i.test(header)) return header;
  const fromBody = body?.session_token;
  if (typeof fromBody === "string" && /^[a-f0-9]{64}$/i.test(fromBody)) return fromBody;
  return null;
}

/** Idle timeout: a session unused for 30 minutes is dead. */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Resolves an active session. Returns null when the token is unknown, revoked,
 * past its 24-hour absolute expiry, or idle for more than 30 minutes. An idle
 * session is revoked on discovery so it can never be resurrected.
 */
export async function resolveVisitorSession(
  admin: SupabaseClient,
  token: string | null,
): Promise<VisitorSession | null> {
  if (!token) return null;
  const hash = await sha256Hex(token);
  const { data, error } = await admin
    .from("visitor_sessions")
    .select("id, visitor_profile_id, user_id, expires_at, revoked_at, last_seen_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (error || !data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;

  const lastSeen = new Date((data as unknown as { last_seen_at: string }).last_seen_at).getTime();
  if (Number.isFinite(lastSeen) && Date.now() - lastSeen > IDLE_TIMEOUT_MS) {
    await admin
      .from("visitor_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("revoked_at", null);
    return null;
  }

  await admin
    .from("visitor_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", data.id);

  return data as VisitorSession;
}


/** Issues a brand-new visitor profile + session. */
export async function issueVisitorSession(
  admin: SupabaseClient,
  req: Request,
): Promise<{ token: string; session: VisitorSession }> {
  const { data: profile, error: pErr } = await admin
    .from("visitor_profiles")
    .insert({ anonymous_id: crypto.randomUUID(), source: "chat" })
    .select("id")
    .single();
  if (pErr || !profile) throw new Error("could not create visitor profile");

  return await issueSessionForProfile(admin, req, profile.id, null);
}

export async function issueSessionForProfile(
  admin: SupabaseClient,
  req: Request,
  visitorProfileId: string,
  rotatedFrom: string | null,
  userId: string | null = null,
): Promise<{ token: string; session: VisitorSession }> {
  const token = newToken();
  // No raw address is read or stored. `ingressIpHmac` yields a keyed digest
  // only when a platform-verified ingress header and IP_HMAC_KEY both exist;
  // otherwise the column stays null.
  const ipDigest = await ingressIpHmac(req);
  const ua = req.headers.get("user-agent") ?? "";

  const { data, error } = await admin
    .from("visitor_sessions")
    .insert({
      token_hash: await sha256Hex(token),
      visitor_profile_id: visitorProfileId,
      user_id: userId,
      ip_hmac: ipDigest,
      user_agent_hash: ua ? await sha256Hex(ua) : null,
      rotated_from: rotatedFrom,
    })
    .select("id, visitor_profile_id, user_id, expires_at, revoked_at")
    .single();
  if (error || !data) throw new Error("could not issue session");
  return { token, session: data as VisitorSession };
}

export async function revokeSession(admin: SupabaseClient, sessionId: string) {
  await admin
    .from("visitor_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("revoked_at", null);
}

/** Verified member identity from the Authorization bearer JWT. Null if absent/invalid. */
export async function verifiedUserId(
  admin: SupabaseClient,
  req: Request,
): Promise<string | null> {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const { data, error } = await admin.auth.getUser(header.slice(7));
  if (error || !data?.user) return null;
  return data.user.id;
}

/**
 * Deletion lifecycle lock, evaluated server-side for edge functions.
 * Any failure to determine status denies access.
 */
export async function deletionLockActive(
  admin: SupabaseClient,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return true;
  const { data, error } = await admin
    .from("deletion_jobs")
    .select("state, identity_verified_at")
    .eq("user_id", userId);
  if (error || data === null) return true; // fail closed
  return data.some(
    (j) =>
      j.identity_verified_at !== null &&
      ["access_blocked", "in_progress", "waiting_for_processor", "reconciled", "partial", "failed"]
        .includes(j.state),
  );
}
