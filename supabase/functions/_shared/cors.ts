// Canonical CORS headers for all edge functions.
//
// Import this instead of declaring an inline copy — a per-function allow-list
// drifts the moment the Supabase browser client starts sending a new header
// (that is exactly what broke dexcom-auth: the client sends
// `x-supabase-client-platform`, the function only allowed four headers, and the
// browser blocked the request before any POST left the page).

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Headers for the CORS preflight (OPTIONS) response.
 *
 * Echoes back whatever `Access-Control-Request-Headers` the browser asked for,
 * so the allow-list can never drift behind the client. Falls back to the static
 * list when the header is absent. `Vary` is required so the Cloudflare edge
 * caches one response per requested-header set.
 */
export function preflightHeaders(req: Request): Record<string, string> {
  const requested = req.headers.get("Access-Control-Request-Headers");
  return {
    ...corsHeaders,
    "Access-Control-Allow-Headers":
      requested && requested.trim().length > 0
        ? requested
        : corsHeaders["Access-Control-Allow-Headers"],
    Vary: "Access-Control-Request-Headers",
  };
}
