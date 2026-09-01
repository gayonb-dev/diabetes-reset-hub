// Exact-origin CORS allowlist (audit finding 2).
//
// There is no wildcard, no domain-suffix regular expression, and no hardcoded
// localhost. The allowlist is exactly the set of normalized origins supplied
// through `ALLOWED_ORIGINS` (comma separated). `APP_URL` is read for backward
// compatibility and is likewise treated as a set of exact origins.
//
// Staging lists its exact preview origin. Production lists the DRM production
// origin plus any additional owner-approved exact origin. Nothing else is
// accepted, an unrelated Lovable project, a lookalike domain, localhost, and
// a missing Origin are all rejected.

function normalize(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.origin.toLowerCase();
  } catch {
    return null;
  }
}

function envOrigins(): Set<string> {
  const raw = `${Deno.env.get("ALLOWED_ORIGINS") ?? ""},${Deno.env.get("APP_URL") ?? ""}`;
  const out = new Set<string>();
  for (const part of raw.split(",")) {
    const o = normalize(part);
    if (o) out.add(o);
  }
  return out;
}

export function allowedOrigins(): string[] {
  return Array.from(envOrigins()).sort();
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const normalized = normalize(origin);
  if (!normalized) return false;
  return envOrigins().has(normalized);
}

const BASE_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-visitor-session, x-reauth-ticket",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "600",
  Vary: "Origin",
};

/** Headers for a request. Omits the allow-origin header for unknown origins. */
export function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  if (isAllowedOrigin(origin)) {
    return { ...BASE_HEADERS, "Access-Control-Allow-Origin": normalize(origin!)! };
  }
  return { ...BASE_HEADERS };
}

/** Standard preflight handling. Returns null when this is not a preflight. */
export function preflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  const headers = corsFor(req);
  if (!headers["Access-Control-Allow-Origin"]) {
    return new Response("origin not allowed", { status: 403 });
  }
  return new Response("ok", { headers });
}

/**
 * Browser-facing guard. Rejects BEFORE any work is performed when the request
 * carries no Origin or an unapproved Origin. Omitting the response header is
 * not sufficient, a non-browser client would ignore it.
 *
 * Returns a 403 Response to return immediately, or null to continue.
 */
export function requireAllowedOrigin(req: Request): Response | null {
  const origin = req.headers.get("Origin");
  if (!isAllowedOrigin(origin)) {
    return new Response(
      JSON.stringify({ error: "origin_not_allowed" }),
      { status: 403, headers: { ...BASE_HEADERS, "Content-Type": "application/json" } },
    );
  }
  return null;
}

export function json(
  req: Request,
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), ...extra, "Content-Type": "application/json" },
  });
}
