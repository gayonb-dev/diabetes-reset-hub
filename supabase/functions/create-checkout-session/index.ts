import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerName, customerEmail, customerPhone }: CheckoutRequest = await req.json();

    // Validate required fields
    if (!customerName || !customerEmail) {
      return new Response(
        JSON.stringify({ error: "Customer name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Initialize Supabase with service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if a Stripe customer already exists
    const customers = await stripe.customers.list({ 
      email: customerEmail.toLowerCase(), 
      limit: 1 
    });
    
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Get the origin for redirect URLs
    const origin = req.headers.get("origin") || "https://lovable.dev";

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail.toLowerCase(),
      customer_creation: customerId ? undefined : "always",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "5-Day Diabetes Reset Challenge",
              description: "Quick wins that lower sugar, jumpstart weight loss, and restore your energy in just 5 days.",
            },
            unit_amount: 2700, // $27.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}?payment=success`,
      cancel_url: `${origin}?payment=cancelled`,
      metadata: {
        customerName,
        customerPhone: customerPhone || "",
      },
    });

    // Save pending order to database
    const { error: insertError } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: customerName,
        customer_email: customerEmail.toLowerCase(),
        customer_phone: customerPhone || null,
        amount: 2700,
        currency: "usd",
        status: "pending",
        product_name: "5-Day Diabetes Reset Challenge",
        product_id: "five-day-reset-27",
        stripe_session_id: session.id,
      });

    if (insertError) {
      console.error("Error saving order:", insertError);
      // Don't fail the checkout, just log the error
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
