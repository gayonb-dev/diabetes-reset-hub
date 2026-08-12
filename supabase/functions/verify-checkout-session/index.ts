// Prompt 4 (final) — strict, read-only checkout verification for /payment-success.
//
// This function NEVER provisions. The signed Stripe webhook remains the only
// provisioning path. Here we only read Stripe + local state and report one of
// four states. The response body is deliberately minimal: `{ state }`. No email,
// product, price, amount, order, payment-intent, subscription or customer data
// is echoed back, and no internal failure detail is leaked.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsFor, preflight } from "../_shared/cors.ts";
import { stripeKeyClassMismatch, stripeMode } from "../_shared/config.ts";
import {
  decideCheckoutState,
  normalizeEmail,
  SESSION_ID_RE,
  type CheckoutState,
  type LineItemFacts,
  type LocalFacts,
  type SessionFacts,
} from "../_shared/membershipOffer.ts";

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const corsHeaders = corsFor(req);
  const json = (state: CheckoutState) =>
    new Response(JSON.stringify({ state }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { sessionId } = (await req.json().catch(() => ({}))) as { sessionId?: string };

    // Client input is only ever a session id, and only its shape is trusted.
    if (typeof sessionId !== "string" || !SESSION_ID_RE.test(sessionId)) {
      return json("unverified");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const mode = await stripeMode(admin);
    const config = {
      productId: Deno.env.get("STRIPE_PRODUCT_ID") || "",
      monthlyPriceId: Deno.env.get("STRIPE_PRICE_ID_MONTHLY") || "",
      stripeMode: mode,
      keyClassMismatch: stripeKeyClassMismatch(mode, stripeKey),
    };
    if (!config.productId || !config.monthlyPriceId) return json("error");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ── Stripe facts (server-retrieved, never client-supplied) ──
    let raw: Stripe.Checkout.Session;
    try {
      raw = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items.data.price", "payment_intent", "subscription"],
      });
    } catch (err) {
      const code = (err as { statusCode?: number })?.statusCode;
      // A genuinely unknown session id is "unverified"; anything else (network,
      // rate limit, outage) is "error" because we cannot distinguish failure
      // from absence.
      console.error("verify-checkout-session: stripe retrieve failed", code ?? "unknown");
      return json(code === 404 ? "unverified" : "error");
    }

    const sub = raw.subscription && typeof raw.subscription === "object"
      ? (raw.subscription as Stripe.Subscription)
      : null;
    const trialDays =
      sub?.trial_start && sub?.trial_end
        ? Math.round((sub.trial_end - sub.trial_start) / 86400)
        : null;

    const lineItems: LineItemFacts[] = (raw.line_items?.data ?? []).map((li) => {
      const price = li.price as Stripe.Price | null;
      const product = price?.product;
      return {
        priceId: price?.id ?? null,
        productId: typeof product === "string" ? product : (product?.id ?? null),
        unitAmount: price?.unit_amount ?? null,
        currency: price?.currency ?? null,
        recurringInterval: price?.recurring?.interval ?? null,
        quantity: li.quantity ?? null,
      };
    });

    const intent = raw.payment_intent;
    const session: SessionFacts = {
      sessionId,
      status: raw.status ?? null,
      paymentStatus: raw.payment_status ?? null,
      livemode: raw.livemode === true,
      mode: raw.mode ?? null,
      currency: raw.currency ?? null,
      amountTotal: raw.amount_total ?? null,
      email: normalizeEmail(raw.customer_email || raw.customer_details?.email || null),
      trialDays,
      paymentIntentStatus:
        intent && typeof intent === "object" ? ((intent as Stripe.PaymentIntent).status ?? null) : null,
      lineItems,
    };

    // ── Local facts ──
    let local: LocalFacts;
    try {
      const { data: orders, error: orderErr } = await admin
        .from("orders")
        .select("id, customer_email")
        .eq("stripe_session_id", sessionId);
      if (orderErr) throw orderErr;

      const orderCount = orders?.length ?? 0;
      const orderEmail = orderCount === 1 ? (orders![0].customer_email as string | null) : null;

      let accountExists = false;
      let roleAssigned = false;
      let subscriptionPresent = false;

      const email = session.email;
      if (orderCount === 1 && email) {
        const { data: prof } = await admin
          .from("profiles")
          .select("user_id")
          .eq("user_id", await userIdForEmail(admin, email))
          .maybeSingle();
        const userId = prof?.user_id as string | undefined;
        if (userId) {
          accountExists = true;
          const [{ data: roles }, { data: subs }] = await Promise.all([
            admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "member"),
            admin.from("subscriptions").select("id, status").eq("user_id", userId),
          ]);
          roleAssigned = (roles?.length ?? 0) > 0;
          subscriptionPresent = (subs?.length ?? 0) > 0;
        }
      }

      local = { orderCount, orderEmail, accountExists, roleAssigned, subscriptionPresent };
    } catch (err) {
      console.error("verify-checkout-session: local lookup failed");
      void err;
      return json("error");
    }

    return json(decideCheckoutState(session, local, config));
  } catch (err) {
    console.error("verify-checkout-session: unexpected failure");
    void err;
    return json("error");
  }
});

/** Resolve the auth user id for a normalized email, or a non-matching uuid. */
async function userIdForEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<string> {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const hit = data?.users?.find((u) => (u.email || "").toLowerCase() === email);
  return hit?.id ?? "00000000-0000-0000-0000-000000000000";
}
