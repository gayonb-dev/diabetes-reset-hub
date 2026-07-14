// dexcom-auth — JWT-protected (verify_jwt default true).
// Actions:
//   authorize_url : mint HMAC-signed single-use state, opportunistically purge expired nonces, return Dexcom login URL.
//   exchange      : verify HMAC (constant-time), verify nonce not-used, exchange code for tokens, encrypt, upsert, delete nonce, fire an immediate sync.
//   disconnect    : delete this member's dexcom_connections row.
//   status        : summary for Settings UI.
//   sync_now      : call dexcom-sync for this member using the cron secret.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CLIENT_ID = Deno.env.get("DEXCOM_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("DEXCOM_CLIENT_SECRET")!;
const ENV = Deno.env.get("DEXCOM_ENVIRONMENT") || "sandbox";
const REDIRECT_URI = Deno.env.get("DEXCOM_REDIRECT_URI")!;
const TOKEN_ENC_KEY = Deno.env.get("DEXCOM_TOKEN_ENC_KEY")!;
const STATE_SIGNING_KEY = Deno.env.get("DEXCOM_STATE_SIGNING_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SRV_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const DEXCOM_BASE =
  ENV === "production" ? "https://api.dexcom.com" : "https://sandbox-api.dexcom.com";

const admin = createClient(SB_URL, SRV_KEY, { auth: { persistSession: false } });

function b64url(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
async function hmacSign(key: string, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}
async function aesGcmEncrypt(plain: string): Promise<{ ct: Uint8Array; iv: Uint8Array }> {
  const keyBytes = hexToBytes(TOKEN_ENC_KEY.slice(0, 64));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)),
  );
  return { ct, iv };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireUser(req: Request): Promise<{ userId: string } | Response> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });
  const sb = createClient(SB_URL, ANON, { global: { headers: { Authorization: auth } } });
  const { data, error } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
  if (error || !data?.claims?.sub) return json(401, { error: "unauthorized" });
  return { userId: data.claims.sub as string };
}

async function purgeExpiredNonces() {
  await admin.from("state_nonces").delete().lt("expires_at", new Date().toISOString());
}

async function authorizeUrl(userId: string): Promise<Response> {
  purgeExpiredNonces().catch(() => {});
  const nonce = crypto.randomUUID();
  const exp = Date.now() + 10 * 60 * 1000;
  const { error } = await admin.from("state_nonces").insert({
    nonce,
    member_id: userId,
    purpose: "dexcom_oauth",
    expires_at: new Date(exp).toISOString(),
  });
  if (error) return json(500, { error: "nonce_insert_failed" });

  const payload = b64url(new TextEncoder().encode(JSON.stringify({ m: userId, n: nonce, e: exp })));
  const sig = b64url(await hmacSign(STATE_SIGNING_KEY, payload));
  const state = `${payload}.${sig}`;

  const url = new URL(`${DEXCOM_BASE}/v2/oauth2/login`);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "offline_access");
  url.searchParams.set("state", state);
  return json(200, { url: url.toString() });
}

async function exchange(userId: string, code: string, state: string): Promise<Response> {
  const dot = state.lastIndexOf(".");
  if (dot < 0) return json(400, { error: "bad_state" });
  const payload = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = await hmacSign(STATE_SIGNING_KEY, payload);
  if (!timingSafeEqual(b64urlDecode(sig), expected)) {
    return json(400, { error: "bad_state_signature" });
  }
  let parsed: { m: string; n: string; e: number };
  try {
    parsed = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
  } catch {
    return json(400, { error: "bad_state_payload" });
  }
  if (parsed.e < Date.now()) return json(400, { error: "state_expired" });
  if (parsed.m !== userId) return json(403, { error: "state_user_mismatch" });

  // Atomically mark nonce used: only proceeds if used_at was NULL.
  const { data: consumed, error: nonceErr } = await admin
    .from("state_nonces")
    .update({ used_at: new Date().toISOString() })
    .eq("nonce", parsed.n)
    .eq("member_id", userId)
    .is("used_at", null)
    .select("nonce")
    .maybeSingle();
  if (nonceErr || !consumed) return json(400, { error: "nonce_replay_or_missing" });

  // Exchange code for tokens.
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
  });
  const resp = await fetch(`${DEXCOM_BASE}/v2/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body,
  });
  const tokJson = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error("dexcom token exchange failed", resp.status, tokJson);
    return json(502, { error: "token_exchange_failed", details: tokJson });
  }
  const { access_token, refresh_token, expires_in } = tokJson as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  const accEnc = await aesGcmEncrypt(access_token);
  const refEnc = await aesGcmEncrypt(refresh_token);
  const expiresAt = new Date(Date.now() + (expires_in - 30) * 1000).toISOString();

  const { error: upErr } = await admin.from("dexcom_connections").upsert(
    {
      member_id: userId,
      access_token_enc: accEnc.ct,
      token_iv: accEnc.iv,
      refresh_token_enc: refEnc.ct,
      refresh_iv: refEnc.iv,
      expires_at: expiresAt,
      environment: ENV,
      last_sync_status: "connected",
      last_sync_error: null,
    },
    { onConflict: "member_id" },
  );
  if (upErr) {
    console.error("connection upsert failed", upErr);
    return json(500, { error: "upsert_failed" });
  }

  // Delete consumed nonce (single-use enforced by both used_at and this delete).
  await admin.from("state_nonces").delete().eq("nonce", parsed.n);

  // Fire an immediate sync (best-effort, don't block response).
  fetch(`${SB_URL}/functions/v1/dexcom-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-cron-secret": CRON_SECRET },
    body: JSON.stringify({ member_id: userId }),
  }).catch((e) => console.error("post-connect sync failed", e));

  return json(200, { ok: true });
}

async function disconnect(userId: string): Promise<Response> {
  const { error } = await admin.from("dexcom_connections").delete().eq("member_id", userId);
  if (error) return json(500, { error: error.message });
  return json(200, { ok: true });
}

async function status(userId: string): Promise<Response> {
  const { data } = await admin
    .from("dexcom_connections")
    .select("environment,last_sync_at,last_sync_status,last_sync_error")
    .eq("member_id", userId)
    .maybeSingle();
  return json(200, {
    connected: !!data,
    environment: data?.environment ?? ENV,
    last_sync_at: data?.last_sync_at ?? null,
    last_sync_status: data?.last_sync_status ?? null,
    last_sync_error: data?.last_sync_error ?? null,
  });
}

async function syncNow(userId: string): Promise<Response> {
  const resp = await fetch(`${SB_URL}/functions/v1/dexcom-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-cron-secret": CRON_SECRET },
    body: JSON.stringify({ member_id: userId }),
  });
  const body = await resp.json().catch(() => ({}));
  return json(resp.ok ? 200 : 502, body);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const gate = await requireUser(req);
    if (gate instanceof Response) return gate;
    const { userId } = gate;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    switch (action) {
      case "authorize_url":
        return await authorizeUrl(userId);
      case "exchange":
        if (typeof body?.code !== "string" || typeof body?.state !== "string")
          return json(400, { error: "code+state required" });
        return await exchange(userId, body.code, body.state);
      case "disconnect":
        return await disconnect(userId);
      case "status":
        return await status(userId);
      case "sync_now":
        return await syncNow(userId);
      default:
        return json(400, { error: "unknown_action" });
    }
  } catch (e) {
    console.error("dexcom-auth error", e);
    return json(500, { error: e instanceof Error ? e.message : "server_error" });
  }
});
