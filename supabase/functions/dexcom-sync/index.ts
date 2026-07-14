// dexcom-sync — verify_jwt = false; auth enforced in code via three explicit branches:
//   1) x-cron-secret header (constant-time compare) → cron mode: iterate every connection.
//   2) Bearer JWT → sync ONLY the authenticated user's own connection; body.member_id is ignored.
//   3) Neither → 401.
// Fetches new EGV readings from Dexcom since last_sync_at and inserts them into blood_sugar_readings
// as source='dexcom' / reading_type='cgm'. Uses a partial unique index on (member_id, external_id)
// for dedup.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CLIENT_ID = Deno.env.get("DEXCOM_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("DEXCOM_CLIENT_SECRET")!;
const ENV = Deno.env.get("DEXCOM_ENVIRONMENT") || "sandbox";
const TOKEN_ENC_KEY = Deno.env.get("DEXCOM_TOKEN_ENC_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SRV_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const DEXCOM_BASE =
  ENV === "production" ? "https://api.dexcom.com" : "https://sandbox-api.dexcom.com";

const admin = createClient(SB_URL, SRV_KEY, { auth: { persistSession: false } });

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function timingSafeEqual(a: string, b: string): boolean {
  const A = new TextEncoder().encode(a);
  const B = new TextEncoder().encode(b);
  if (A.length !== B.length) return false;
  let d = 0;
  for (let i = 0; i < A.length; i++) d |= A[i] ^ B[i];
  return d === 0;
}
async function aesGcmDecrypt(ct: Uint8Array, iv: Uint8Array): Promise<string> {
  const keyBytes = hexToBytes(TOKEN_ENC_KEY.slice(0, 64));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
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

// bytea from PostgREST arrives as base64 or "\x…" hex; normalize to Uint8Array.
function coerceBytea(v: unknown): Uint8Array {
  if (v instanceof Uint8Array) return v;
  if (typeof v === "string") {
    if (v.startsWith("\\x")) return hexToBytes(v.slice(2));
    const bin = atob(v);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  throw new Error("unsupported bytea");
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type ConnRow = {
  member_id: string;
  access_token_enc: unknown;
  token_iv: unknown;
  refresh_token_enc: unknown;
  refresh_iv: unknown;
  expires_at: string;
  last_sync_at: string | null;
};

async function refreshIfNeeded(conn: ConnRow): Promise<string> {
  const soon = new Date(Date.now() + 120 * 1000).toISOString();
  if (conn.expires_at > soon) {
    return await aesGcmDecrypt(coerceBytea(conn.access_token_enc), coerceBytea(conn.token_iv));
  }
  const refresh = await aesGcmDecrypt(
    coerceBytea(conn.refresh_token_enc),
    coerceBytea(conn.refresh_iv),
  );
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refresh,
    grant_type: "refresh_token",
    redirect_uri: Deno.env.get("DEXCOM_REDIRECT_URI")!,
  });
  const resp = await fetch(`${DEXCOM_BASE}/v2/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body,
  });
  const t = await resp.json();
  if (!resp.ok) throw new Error(`refresh_failed:${resp.status}:${JSON.stringify(t)}`);
  const accEnc = await aesGcmEncrypt(t.access_token);
  const refEnc = await aesGcmEncrypt(t.refresh_token);
  const expiresAt = new Date(Date.now() + (t.expires_in - 30) * 1000).toISOString();
  await admin
    .from("dexcom_connections")
    .update({
      access_token_enc: accEnc.ct,
      token_iv: accEnc.iv,
      refresh_token_enc: refEnc.ct,
      refresh_iv: refEnc.iv,
      expires_at: expiresAt,
    })
    .eq("member_id", conn.member_id);
  return t.access_token as string;
}

async function syncOne(conn: ConnRow): Promise<{ inserted: number; through: string }> {
  const accessToken = await refreshIfNeeded(conn);
  // Dexcom /v3/users/self/egvs requires startDate/endDate up to 24h span; loop if needed.
  const now = new Date();
  const start = conn.last_sync_at
    ? new Date(new Date(conn.last_sync_at).getTime() - 60_000)
    : new Date(now.getTime() - 24 * 3600 * 1000);
  let cursor = start;
  let totalInserted = 0;
  while (cursor < now) {
    const chunkEnd = new Date(Math.min(cursor.getTime() + 23 * 3600 * 1000, now.getTime()));
    const url = new URL(`${DEXCOM_BASE}/v3/users/self/egvs`);
    url.searchParams.set("startDate", cursor.toISOString().replace(/\.\d{3}Z$/, ""));
    url.searchParams.set("endDate", chunkEnd.toISOString().replace(/\.\d{3}Z$/, ""));
    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}`, "Cache-Control": "no-cache" },
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`egv_fetch_failed:${r.status}:${JSON.stringify(body)}`);
    const records: Array<{ systemTime: string; value: number; recordId?: string }> =
      body.records ?? body.egvs ?? [];
    if (records.length) {
      const rows = records
        .filter((rec) => typeof rec.value === "number" && rec.systemTime)
        .map((rec) => ({
          member_id: conn.member_id,
          value_mgdl: Math.round(rec.value),
          reading_type: "cgm",
          measured_at: new Date(rec.systemTime + "Z").toISOString().replace("ZZ", "Z"),
          notes: null,
          source: "dexcom",
          external_id: rec.recordId || rec.systemTime,
        }));
      if (rows.length) {
        const { error } = await admin
          .from("blood_sugar_readings")
          .upsert(rows, { onConflict: "member_id,external_id", ignoreDuplicates: true });
        if (error) throw new Error(`insert_failed:${error.message}`);
        totalInserted += rows.length;
      }
    }
    cursor = chunkEnd;
  }
  const through = now.toISOString();
  await admin
    .from("dexcom_connections")
    .update({ last_sync_at: through, last_sync_status: "ok", last_sync_error: null })
    .eq("member_id", conn.member_id);
  return { inserted: totalInserted, through };
}

async function markError(memberId: string, err: string) {
  await admin
    .from("dexcom_connections")
    .update({ last_sync_status: "error", last_sync_error: err.slice(0, 500) })
    .eq("member_id", memberId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Three-branch auth — no fallthrough.
    const cronHeader = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");
    let mode: "cron" | "user";
    let onlyMemberId: string | null = null;

    if (cronHeader && CRON_SECRET && timingSafeEqual(cronHeader, CRON_SECRET)) {
      mode = "cron";
    } else if (authHeader?.startsWith("Bearer ")) {
      const sb = createClient(SB_URL, ANON, { global: { headers: { Authorization: authHeader } } });
      const { data, error } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (error || !data?.claims?.sub) return json(401, { error: "unauthorized" });
      mode = "user";
      onlyMemberId = data.claims.sub as string;
    } else {
      return json(401, { error: "unauthorized" });
    }

    let q = admin
      .from("dexcom_connections")
      .select("member_id,access_token_enc,token_iv,refresh_token_enc,refresh_iv,expires_at,last_sync_at");
    if (mode === "user") q = q.eq("member_id", onlyMemberId!);
    const { data: rows, error } = await q;
    if (error) return json(500, { error: error.message });

    const results: Array<{ member_id: string; ok: boolean; inserted?: number; error?: string }> = [];
    for (const conn of (rows ?? []) as ConnRow[]) {
      try {
        const r = await syncOne(conn);
        results.push({ member_id: conn.member_id, ok: true, inserted: r.inserted });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("sync failed", conn.member_id, msg);
        await markError(conn.member_id, msg);
        results.push({ member_id: conn.member_id, ok: false, error: msg });
      }
    }
    return json(200, { mode, count: results.length, results });
  } catch (e) {
    console.error("dexcom-sync fatal", e);
    return json(500, { error: e instanceof Error ? e.message : "server_error" });
  }
});
