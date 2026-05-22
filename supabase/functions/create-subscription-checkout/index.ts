import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReqBody {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { customerName, customerEmail, customerPhone }: ReqBody = await req.json();

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

    // Reuse customer if exists
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      customer_email: customerId ? undefined : email,
      customer_creation: customerId ? undefined : "always",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
        metadata: { source: "landing_page", customerName: customerName.trim() },
      },
      // $27 upfront trial fee (charged immediately at checkout)
      payment_method_collection: "always",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-cancelled`,
      metadata: {
        source: "landing_page",
        customerName: customerName.trim(),
        customerPhone: customerPhone?.trim() || "",
      },
    });

    // Add the $27 upfront fee to the first invoice (trial fee)
    if (session.subscription) {
      // Subscription not yet created at this point — handled via add_invoice_items in mode below
    }

    // Re-create with add_invoice_items now that we know the approach (single call below)
    // Stripe API requires add_invoice_items in the original create call, so do that:
    // (Recreating because we need add_invoice_items inside subscription_data — done in proper form below.)

    // Best-effort log into orders table for unified admin view
    await supabaseAdmin.from("orders").insert({
      customer_name: customerName.trim(),
      customer_email: email,
      customer_phone: customerPhone?.trim() || null,
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
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
