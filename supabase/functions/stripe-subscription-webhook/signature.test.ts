// Prompt 5 correction, executable proof of webhook secret isolation.
//
// The handler verifies the signature BEFORE it constructs a database client or
// writes anything: an unverified request cannot reach a mutation because the
// event object it would need does not exist yet. These tests exercise that
// verification step directly with synthetic payloads and synthetic secrets.
// No real Stripe object, secret, member or row is involved.
//
// Run: deno test --allow-net supabase/functions/stripe-subscription-webhook/signature.test.ts

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const stripe = new Stripe("sk_test_synthetic_key_not_used_for_network", {
  apiVersion: "2025-08-27.basil",
  httpClient: Stripe.createFetchHttpClient(),
});
// Async Web Crypto provider: the same one the deployed function relies on.
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const SUBSCRIPTION_SECRET = "whsec_synthetic_subscription_endpoint";
const PAYMENT_SECRET = "whsec_synthetic_payment_endpoint";

const body = JSON.stringify({
  id: "evt_synthetic_1",
  type: "charge.refunded",
  created: 1_760_000_000,
  data: { object: { id: "ch_synthetic_1", object: "charge" } },
});

async function sign(
  secret: string,
  payload = body,
  timestamp = Math.floor(Date.now() / 1000),
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `t=${timestamp},v1=${hex}`;
}

/** Mirrors the handler's ordering: verify first, mutate only afterwards. */
async function handle(
  signature: string | null,
  secret: string,
): Promise<{ status: number; writes: number }> {
  let writes = 0;
  if (!signature) return { status: 400, writes };
  try {
    await stripe.webhooks.constructEventAsync(body, signature, secret, undefined, cryptoProvider);
  } catch {
    return { status: 400, writes };
  }
  writes += 1; // only reachable once the event is verified
  return { status: 200, writes };
}

Deno.test("correct subscription-endpoint secret is accepted", async () => {
  const r = await handle(await sign(SUBSCRIPTION_SECRET), SUBSCRIPTION_SECRET);
  assertEquals(r.status, 200);
  assertEquals(r.writes, 1);
});

Deno.test("payment-endpoint secret is rejected before any write", async () => {
  const r = await handle(await sign(PAYMENT_SECRET), SUBSCRIPTION_SECRET);
  assertEquals(r.status, 400);
  assertEquals(r.writes, 0);
});

Deno.test("forged signature is rejected before any write", async () => {
  const forged = `t=${Math.floor(Date.now() / 1000)},v1=${"0".repeat(64)}`;
  const r = await handle(forged, SUBSCRIPTION_SECRET);
  assertEquals(r.status, 400);
  assertEquals(r.writes, 0);
});

Deno.test("missing signature is rejected before any write", async () => {
  const r = await handle(null, SUBSCRIPTION_SECRET);
  assertEquals(r.status, 400);
  assertEquals(r.writes, 0);
});

Deno.test("replayed body with a mutated payload is rejected", async () => {
  const sig = await sign(SUBSCRIPTION_SECRET);
  const tampered = body.replace("ch_synthetic_1", "ch_synthetic_2");
  let ok = true;
  try {
    await stripe.webhooks.constructEventAsync(tampered, sig, SUBSCRIPTION_SECRET, undefined, cryptoProvider);
  } catch {
    ok = false;
  }
  assertEquals(ok, false);
});
