import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsFor, preflight } from "../_shared/cors.ts";
import { canonicalUrl } from "../_shared/canonicalUrl.ts";


// Prompt 4 §7.2 — checkout collects name and email only. A phone number is not
// required to buy the membership, so it is no longer collected or stored.
interface ReqBody {
  customerName: string;
  customerEmail: string;
}

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const corsHeaders = corsFor(req);

  try {
    const { customerName, customerEmail }: ReqBody = await req.json();

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerName?.trim() || !customerEmail?.trim() || !emailRe.test(customerEmail.trim())) {
      return new Response(JSON.stringify({ error: "Invalid name or email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const email = customerEmail.trim().toLowerCase();
    const priceId = Deno.env.get("STRIPE_PRICE_ID_MONTHLY")!;
    const productId = Deno.env.get("STRIPE_PRODUCT_ID")!;
    const origin =
      req.headers.get("origin") || Deno.env.get("APP_URL") || "https://diabetesresetmethod.com";

    const customers = await stripe.customers.list({ email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    // One-time $27 line item (charged immediately) + recurring $67/mo line item with 14-day trial.
    // Per Stripe: in subscription mode, one-time line items are charged at checkout completion,
    // while the recurring price is held in trial.
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      customer_email: customerId ? undefined : email,
      customer_creation: customerId ? undefined : "always",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product: productId,
            unit_amount: 2700,
            tax_behavior: "inclusive",
          },
          quantity: 1,
        },
        { price: priceId, quantity: 1 },
      ],
      subscription_data: {
        trial_period_days: 14,
        trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
        metadata: {
          source: "landing_page",
          customer_name: customerName.trim(),
        },
      },
      payment_method_collection: "always",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      success_url: canonicalUrl("/payment-success?session_id={CHECKOUT_SESSION_ID}"),
      cancel_url: canonicalUrl("/payment-cancelled"),
      metadata: {
        source: "landing_page",
        customer_name: customerName.trim(),
      },
    });

    // Log pending order for unified admin view
    await supabaseAdmin.from("orders").insert({
      customer_name: customerName.trim(),
      customer_email: email,
      customer_phone: null,
      amount: 2700,
      currency: "usd",
      status: "pending",
      product_name: "Diabetes Reset Method Membership ($27 trial → $67/mo)",
      product_id: "membership-trial-27",
      stripe_session_id: session.id,
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("create-subscription-checkout error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
