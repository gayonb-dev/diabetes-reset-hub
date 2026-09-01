import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { buildCheckoutMetadata } from "./metadata.ts";
import { corsFor, preflight, requireAllowedOrigin } from "../_shared/cors.ts";
import { canonicalUrl } from "../_shared/canonicalUrl.ts";
import { guardRequest, LIMITS } from "../_shared/abuseGuard.ts";


// P1 legacy retirement: no browser-supplied identifier is accepted here, and
// Stripe metadata is built from an explicit allowlist of non-identity fields
// only (see ./metadata.ts). Caller-provided metadata objects are never spread
// or forwarded.
interface CheckoutRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  productId?: string;
  paymentPlan?: "full" | "installment";
}


// Prompt 4 closeout, retired offer keys. These are rejected with HTTP 410
// BEFORE any Stripe client is constructed, any Stripe call is made, or any
// order row is written. The retired $497 6-week program is permanently gone.
const RETIRED_PRODUCTS = new Set([
  "six-week-reset-497",
  "six-week-reset",
  "6-week-reset",
  "six-week-reset-installment",
  "coaching",
  "coaching-call",
  "coaching-program",
  "booking",
  "book",
]);

const PRODUCTS: Record<string, { name: string; description: string; amount: number; installmentAmount?: number; installmentCount?: number }> = {
  "five-day-reset-27": {
    name: "5-Day Diabetes Reset Challenge",
    description: "Small daily actions, meal ideas, tracking tools, education and printable reports for health visits.",
    amount: 2700,
  },
};


serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const originDenied = requireAllowedOrigin(req);
  if (originDenied) return originDenied;
  const corsHeaders = corsFor(req);

  try {
    // Only these fields are read. Any other caller-supplied property
    // (anonymousId, anonymous_id, visitor_id, visitor_profile_id, metadata, …)
    // is ignored and can never reach Stripe.
    const { customerName, customerEmail, customerPhone, productId = "five-day-reset-27", paymentPlan = "full" }: CheckoutRequest = await req.json();

    // Retired offers are rejected first: no Stripe client, no Stripe call,
    // no order row. HTTP 410 Gone with a safe replacement destination.
    if (RETIRED_PRODUCTS.has(productId)) {
      return new Response(
        JSON.stringify({
          error: "This offer is no longer available.",
          replacement: "/#pricing",
        }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }



    if (!customerName || !customerEmail) {
      return new Response(
        JSON.stringify({ error: "Customer name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const product = PRODUCTS[productId];
    if (!product) {
      return new Response(
        JSON.stringify({ error: "Invalid product" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Part 7. Checkout is unauthenticated by design, so the bucket is the
    // keyed ingress address. A real buyer checks out once; this only stops a
    // machine minting Stripe sessions in a loop.
    const guard = await guardRequest(supabaseAdmin, req, {
      scope: "create-checkout-session",
      ...LIMITS.checkout,
    });
    if (!guard.allowed) {
      return new Response(JSON.stringify(guard.body), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customers = await stripe.customers.list({
      email: customerEmail.toLowerCase(),
      limit: 1,
    });

    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }


    // Determine amount and checkout mode
    const isInstallment = paymentPlan === "installment" && product.installmentAmount;
    const amount = isInstallment ? product.installmentAmount! : product.amount;
    const productName = isInstallment
      ? `${product.name}, Payment 1 of ${product.installmentCount}`
      : product.name;

    // Set redirect based on product
    // B3: redirects come from the server-held canonical domain, never the
    // request Origin, so an approved www/preview caller still lands on the
    // canonical site after Stripe.
    const successUrl = canonicalUrl("/payment-success");
    const cancelUrl = canonicalUrl("/payment-cancelled");

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail.toLowerCase(),
      customer_creation: customerId ? undefined : "always",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
              description: product.description,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: buildCheckoutMetadata({
        customerName,
        customerPhone: customerPhone || "",
        productId,
        paymentPlan,
      }),

    });

    const { error: insertError } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: customerName,
        customer_email: customerEmail.toLowerCase(),
        customer_phone: customerPhone || null,
        amount,
        currency: "usd",
        status: "pending",
        product_name: productName,
        product_id: productId,
        stripe_session_id: session.id,
      });

    if (insertError) {
      console.error("Error saving order:", insertError);
    }

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Checkout session error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});