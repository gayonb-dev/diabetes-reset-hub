// Part 7 — abuse-control RUNTIME.
//
// This half touches Deno and the database. All wording and every numeric
// limit lives in `abusePolicy.ts`, which is pure and directly unit-tested;
// this file only decides which bucket to consume.
//
// Server-to-server callers (Stripe webhooks, scheduled cron) are deliberately
// NOT routed through here: they have no browser origin, their authenticity is
// established by signature or shared secret, and throttling them would drop
// legitimate lifecycle events.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { consumeRateLimit, type Principal } from "./ratelimit.ts";
import { LIMITS, rateLimitedBody, type RateLimitBody } from "./abusePolicy.ts";

export { LIMITS };

export interface GuardOptions {
  scope: string;
  windowSeconds: number;
  limit: number;
  /** Present for authenticated endpoints; falls back to the keyed ingress IP. */
  userId?: string | null;
  /** True for export/deletion: changes the wording to a temporary throttle. */
  rightsEndpoint?: boolean;
}

export interface GuardResult {
  allowed: boolean;
  status: number;
  body: RateLimitBody;
}

/**
 * Consumes one unit from the caller's bucket. Returns `allowed: false` with a
 * ready-to-send body when the caller is over the limit.
 *
 * The principal is the verified user whenever there is one, because a per-user
 * bucket cannot be escaped by changing network. It falls back to the keyed
 * ingress address only for genuinely unauthenticated callers.
 */
export async function guardRequest(
  admin: SupabaseClient,
  req: Request,
  opts: GuardOptions,
): Promise<GuardResult> {
  const principal: Principal = opts.userId
    ? { kind: "user", id: opts.userId }
    : { kind: "ip", req };

  const ok = await consumeRateLimit(admin, {
    scope: opts.scope,
    principal,
    windowSeconds: opts.windowSeconds,
    limit: opts.limit,
  });

  const body = rateLimitedBody({
    windowSeconds: opts.windowSeconds,
    rightsEndpoint: opts.rightsEndpoint,
  });

  return ok
    ? { allowed: true, status: 200, body }
    : { allowed: false, status: 429, body };
}
