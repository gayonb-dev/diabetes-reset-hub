// Edge function: cancel-subscription
// True in-app one-click cancel and reactivate. Sets cancel_at_period_end on
// the user's active Stripe subscription. Mirrors state into subscriptions.
//
// verify_jwt = true (see supabase/config.toml).

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supaAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: claims, error: claimsErr } = await supaAuth.auth.getClaims(auth.slice(7));
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;
    const email = String(claims.claims.email ?? "").toLowerCase();

    const body = await req.json().catch(() => ({}));
    const cancel = body?.cancel === true; // true = cancel_at_period_end, false = reactivate

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Find subscription id — prefer local row.
    const { data: subRow } = await supa
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let subscriptionId = subRow?.stripe_subscription_id as string | undefined;
    if (!subscriptionId && email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length) {
        const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "all", limit: 5 });
        const live = subs.data.find((s) => s.status === "active" || s.status === "trialing" || s.status === "past_due");
        subscriptionId = live?.id;
      }
    }

    if (!subscriptionId) {
      return new Response(JSON.stringify({ error: "no_active_subscription" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updated = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: cancel });

    // Mirror into local subscriptions table so the UI updates without waiting for the webhook.
    await supa
      .from("subscriptions")
      .update({
        cancel_at_period_end: updated.cancel_at_period_end,
        current_period_end: updated.current_period_end
          ? new Date(updated.current_period_end * 1000).toISOString()
          : null,
        status: updated.status,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscriptionId);

    return new Response(
      JSON.stringify({
        ok: true,
        cancel_at_period_end: updated.cancel_at_period_end,
        current_period_end: updated.current_period_end
          ? new Date(updated.current_period_end * 1000).toISOString()
          : null,
        status: updated.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("cancel-subscription error:", e);
    return new Response(
      JSON.stringify({ error: "internal", message: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
