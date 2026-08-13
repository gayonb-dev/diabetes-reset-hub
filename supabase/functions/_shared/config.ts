// P2: server-controlled configuration reader.
//
// Every gate that members must not be able to flip lives in public.app_config,
// which has no anon/authenticated grants and no RLS policies. Browser code
// cannot read it and cannot change it. Missing rows fail closed.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export type ConfigKey =
  | "ai_health_enabled"
  | "email_delivery_enabled"
  | "email_test_allowlist"
  | "auth_email_enabled"
  | "transactional_automation_enabled"
  | "marketing_email_enabled"
  | "dexcom_enabled"
  | "stripe_mode"
  | "stripe_deletion_enabled"
  | "phi_notice_version"
  | "retention_mode";

const cache = new Map<string, { value: unknown; at: number }>();
const TTL_MS = 30_000;

export async function getConfig<T = unknown>(
  admin: SupabaseClient,
  key: ConfigKey,
  fallback: T,
): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;

  const { data, error } = await admin
    .from("app_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error || !data) {
    // Fail closed: the caller's fallback is always the restrictive value.
    return fallback;
  }
  cache.set(key, { value: data.value, at: Date.now() });
  return data.value as T;
}

/** The AI-health gate. Defaults false and can only be changed server-side. */
export async function aiHealthEnabled(admin: SupabaseClient): Promise<boolean> {
  return (await getConfig<boolean>(admin, "ai_health_enabled", false)) === true;
}

/** Current privacy-notice version consent must be captured against. */
export async function noticeVersion(admin: SupabaseClient): Promise<string> {
  return await getConfig<string>(admin, "phi_notice_version", "unset");
}

/** Dexcom integration gate. Defaults false; enforced before any credential read. */
export async function dexcomEnabled(admin: SupabaseClient): Promise<boolean> {
  return (await getConfig<boolean>(admin, "dexcom_enabled", false)) === true;
}

/** "test" | "live". Defaults to "test" so a mismatch fails closed in production. */
export async function stripeMode(admin: SupabaseClient): Promise<string> {
  return await getConfig<string>(admin, "stripe_mode", "test");
}

/** Gate for Stripe cancellation performed by the account-deletion worker. */
export async function stripeDeletionEnabled(admin: SupabaseClient): Promise<boolean> {
  return (await getConfig<boolean>(admin, "stripe_deletion_enabled", false)) === true;
}

/**
 * Key-class agreement check: a live-mode deployment must not hold a test key
 * and vice versa. Returns null when it agrees, or a reason string when it does
 * not. The secret value itself is never returned or logged.
 */
export function stripeKeyClassMismatch(mode: string, key: string): string | null {
  if (!key) return "no Stripe credential configured";
  const isTest = key.startsWith("sk_test_") || key.startsWith("rk_test_");
  const isLive = key.startsWith("sk_live_") || key.startsWith("rk_live_");
  if (!isTest && !isLive) return "unrecognised Stripe key class";
  if (mode === "live" && !isLive) return "stripe_mode=live but the configured key is not a live key";
  if (mode === "test" && !isTest) return "stripe_mode=test but the configured key is not a test key";
  return null;
}

/** Whether outbound mail may be delivered to this address. */
export async function emailAllowed(
  admin: SupabaseClient,
  to: string,
): Promise<boolean> {
  const enabled = await getConfig<boolean>(admin, "email_delivery_enabled", false);
  if (!enabled) return false;
  const allow = await getConfig<string[]>(admin, "email_test_allowlist", []);
  if (!Array.isArray(allow) || allow.length === 0) return false;
  return allow.map((a) => String(a).toLowerCase()).includes(to.toLowerCase());
}

/** Test-only: drops the memoised values so a flag flip is observed immediately. */
export function clearConfigCache(): void {
  cache.clear();
}
