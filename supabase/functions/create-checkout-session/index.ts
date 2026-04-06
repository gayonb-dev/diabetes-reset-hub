import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CheckoutRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  productId?: string;
  paymentPlan?: "full" | "installment";
}

const PRODUCTS: Record<string, { name: string; description: string; amount: number; installmentAmount?: number; installmentCount?: number }> = {
  "five-day-reset-27": {
    name: "5-Day Diabetes Reset Challenge",
    description: "Quick wins that lower sugar, jumpstart weight loss, and restore your energy in just 5 days.",
    amount: 2700,
  },
  "six-week-reset-497": {
    name: "6-Week Diabetes Reset Program",
    description: "Full transformation: 12 coaching sessions, custom meal plans, daily WhatsApp support, and more.",
    amount: 49700,
    installmentAmount: 26700,
    installmentCount: 2,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerName, customerEmail, customerPhone, productId = "five-day-reset-27", paymentPlan = "full" }: CheckoutRequest = await req.json();

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

    const customers = await stripe.customers.list({
      email: customerEmail.toLowerCase(),
      limit: 1,
    });

    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://lovable.dev";

    // Determine amount and checkout mode
    const isInstallment = paymentPlan === "installment" && product.installmentAmount;
    const amount = isInstallment ? product.installmentAmount! : product.amount;
    const productName = isInstallment
      ? `${product.name} — Payment 1 of ${product.installmentCount}`
      : product.name;

    // Set redirect based on product
    const successUrl = `${origin}/payment-success`;
    const cancelUrl = `${origin}/payment-cancelled`;

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
      metadata: {
        customerName,
        customerPhone: customerPhone || "",
        productId,
        paymentPlan,
      },
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
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});