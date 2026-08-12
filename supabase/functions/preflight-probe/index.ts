// TEMPORARY read-only preflight probe. Deleted immediately after Stage 1.
// Never returns secret values or digests — only booleans.

const enc = new TextEncoder();

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const PROBE_TOKEN = "probe-7f3a91c4d2e84b60a1c5";

Deno.serve(async (req) => {
  if (req.headers.get("x-probe-token") !== PROBE_TOKEN) {
    return new Response("forbidden", { status: 403 });
  }

  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "").trim();
  const pay = (Deno.env.get("STRIPE_PAYMENT_WEBHOOK_SECRET") ?? "").trim();
  const sub = (Deno.env.get("STRIPE_SUBSCRIPTION_WEBHOOK_SECRET") ?? "").trim();

  const result: Record<string, unknown> = {
    allowed_origins_entry_count: allowed ? allowed.split(",").length : 0,
    payment_secret_nonempty: pay.length > 0,
    subscription_secret_nonempty: sub.length > 0,
    payment_secret_prefix_ok: pay.startsWith("whsec_"),
    subscription_secret_prefix_ok: sub.startsWith("whsec_"),
    secrets_differ: (await sha256(pay)) !== (await sha256(sub)),
    legacy_webhook_secret_present: (Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "").trim().length > 0,
  };

  const key = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  result.stripe_key_class = key.startsWith("sk_live_") || key.startsWith("rk_live_")
    ? "live"
    : key.startsWith("sk_test_") || key.startsWith("rk_test_")
    ? "test"
    : "unknown";

  try {
    const h = { Authorization: `Bearer ${key}` };
    const we = await fetch("https://api.stripe.com/v1/webhook_endpoints?limit=100", { headers: h });
    const wj = await we.json();
    result.webhook_endpoints = (wj?.data ?? []).map((e: Record<string, unknown>) => ({
      id: e.id,
      url: e.url,
      status: e.status,
      livemode: e.livemode,
      application: e.application,
      api_version: e.api_version,
      enabled_events: e.enabled_events,
    }));
  } catch (e) {
    result.stripe_error = String(e);
  }

  return new Response(JSON.stringify(result, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
