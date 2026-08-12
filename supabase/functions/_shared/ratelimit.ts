// Rate limiting and IP minimization.
//
// DESIGN DECISION (audit findings RL-02 / RL-03)
// ----------------------------------------------
// A raw client IP is never persisted, logged, or returned. Every IP-derived
// rate-limit bucket is an HMAC of ONE value: `cf-connecting-ip`.
//
// `cf-connecting-ip` is the only header this platform sets itself and that a
// caller provably cannot influence — empirically demonstrated on this
// deployment with the staging ingress probe: a request that supplies
// `cf-connecting-ip: <spoof>` yields exactly the same keyed digest as a clean
// request, while `x-forwarded-for`, `x-real-ip`, `true-client-ip`,
// `fly-client-ip` and `x-client-ip` are either absent or echo whatever the
// caller sent. Those headers are therefore NEVER read here, and there is no
// configurable header name and no caller-supplied fallback of any kind.
//
// When `cf-connecting-ip` is absent, `trustedIngressIp()` returns null, the IP
// principal FAILS CLOSED, and the caller is refused. A global bucket is never
// a primary control: one caller could exhaust it for everyone. It is only ever
// used as a declared abuse ceiling far above per-principal limits.
//
// Two callers behind one shared network legitimately share an IP-derived
// bucket. That is inherent to address-based partitioning and is not a defect.
//
// `IP_HMAC_KEY` is the single secret name used for every address-derived HMAC
// (session `ip_hmac` included). A missing key FAILS CLOSED: no raw-IP
// fallback, and no shared "unknown" bucket that would merge unrelated callers.


import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export const IP_HMAC_KEY_ENV = "IP_HMAC_KEY";

/** The single platform-proven, caller-unmodifiable ingress header. */
export const TRUSTED_IP_HEADER = "cf-connecting-ip";

/** Kept for reporting: the trusted header is fixed, never configuration. */
export function trustedIpHeaderName(): string {
  return TRUSTED_IP_HEADER;
}

/**
 * The platform-verified ingress address, or null when the platform did not set
 * one. No other header is ever consulted, so a caller cannot move, duplicate,
 * or escape its partition by supplying address headers.
 */
export function trustedIngressIp(req: Request): string | null {
  const value = req.headers.get(TRUSTED_IP_HEADER)?.trim();
  if (!value) return null;
  // The platform header carries exactly one address. A list would mean the
  // value did not come from the platform, so it is rejected, not parsed.
  if (value.includes(",")) return null;
  return value;
}


async function hmac(value: string): Promise<string | null> {
  const secret = Deno.env.get(IP_HMAC_KEY_ENV);
  if (!secret || !value) return null; // fail closed
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

/**
 * Keyed digest of the trusted ingress address, or null when there is no
 * trusted address or no key. Callers must treat null as "do not store".
 */
export async function ingressIpHmac(req: Request): Promise<string | null> {
  const ip = trustedIngressIp(req);
  if (!ip) return null;
  return await hmac(ip);
}

/**
 * Deterministic bucket key for an already-extracted trusted ingress value.
 * Exposed so the mapping can be unit-tested with synthetic values without
 * persisting or logging them. Returns null when the HMAC key is missing.
 */
export async function ipBucketKey(trustedValue: string): Promise<string | null> {
  const digest = await hmac(trustedValue);
  return digest ? `h:${digest}` : null;
}


export type Principal =
  | { kind: "session"; id: string }
  | { kind: "user"; id: string }
  | { kind: "global"; scope: string }
  | { kind: "ip"; req: Request };

/**
 * Atomic rate-limit consumption against a non-personal bucket key.
 * Returns false when the caller is over the limit OR when an IP principal was
 * requested and no trusted, keyed address is available (fail closed).
 */
export async function consumeRateLimit(
  admin: SupabaseClient,
  opts: { scope: string; principal: Principal; windowSeconds: number; limit: number },
): Promise<boolean> {
  let key: string;
  switch (opts.principal.kind) {
    case "session":
      key = `s:${opts.principal.id}`;
      break;
    case "user":
      key = `u:${opts.principal.id}`;
      break;
    case "global":
      key = `g:${opts.principal.scope}`;
      break;
    case "ip": {
      const digest = await ingressIpHmac(opts.principal.req);
      if (!digest) return false; // fail closed: never raw IP, never one shared bucket
      key = `h:${digest}`;
      break;
    }
  }
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_bucket: `${opts.scope}|${key}`,
    p_window_seconds: opts.windowSeconds,
    p_limit: opts.limit,
  });
  if (error) return false; // fail closed
  return data !== false;
}

/** Deletes rate-limit rows older than 24 hours. Safe and cheap to call often. */
export async function purgeExpiredRateLimits(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin.rpc("purge_expired_rate_limits");
  if (error) return -1;
  return typeof data === "number" ? data : 0;
}
