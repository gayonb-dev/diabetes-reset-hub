/**
 * DEVELOPMENT/TEST-ONLY screenshot harness for the checkout-status screens.
 *
 * This module is imported dynamically behind `import.meta.env.DEV`, so Vite
 * removes the branch AND this module from any production bundle. It can never
 * be activated through a published URL, and it is never consulted by the real
 * verification path (see src/pages/PaymentSuccess.tsx).
 */
export type FixtureState = "checking" | "verified" | "processing" | "unverified" | "error";

const ALLOWED: FixtureState[] = ["checking", "verified", "processing", "unverified", "error"];

export function readDevFixture(search: string): FixtureState | null {
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(search).get("state_fixture");
  return ALLOWED.includes(value as FixtureState) ? (value as FixtureState) : null;
}
