import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

import { corsFor } from "../_shared/cors.ts";
import { assignImmutableOwner } from "../_shared/orderOwnership.ts";
import { sendEmail as sendGatedEmail } from "../_shared/email.ts";

const ADMIN_EMAIL = "support@diabetesresetmethod.com";
const FROM_EMAIL = "The 5-Day Diabetes Reset <hello@diabetesresetmethod.com>";

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Every send goes through the central gate in _shared/email.ts. The legacy
// `apiKey` parameter is retained for call-site compatibility and ignored: the
// key is read inside the gate, and no request is made while the gate is closed.
async function sendEmail(_apiKey: string | undefined, to: string, subject: string, html: string) {
  const gateAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const result = await sendGatedEmail(gateAdmin, { from: FROM_EMAIL, to, subject, html });
  if (!result.sent) console.warn("outbound email suppressed or failed:", result.reason);
  return result;
}

function buildWelcomeEmail(name: string, origin: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #085041; font-size: 24px;">Welcome to The Diabetes Reset Tiny Challenge! 🎉</h1>
      
      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        Hi ${esc(name)},
      </p>
      
      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        Your deposit has been received, and your spot is confirmed.
      </p>
      
      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        Over the next 5 days, we'll focus on simple steps that help you:
      </p>
      
      <ul style="color: #333; font-size: 15px; line-height: 2;">
        <li>✅ Reset your hydration</li>
        <li>✅ Improve your plate</li>
        <li>✅ Add safe movement</li>
        <li>✅ Build momentum</li>
        <li>✅ Prepare for long-term results</li>
      </ul>
      
      <div style="background: #f0f7ef; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #085041; font-size: 18px; margin-top: 0;">Your Next Steps:</h2>
        <ol style="color: #333; font-size: 15px; line-height: 2;">
          <li><strong>Complete your intake form</strong> — so we can personalize your experience</li>
          <li><strong>Review your Starter Kit</strong> — attached below</li>
          <li><strong>Reply with your preferred start date and time</strong></li>
          <li><strong>Watch for your Day 1 reminder on WhatsApp</strong></li>
        </ol>
      </div>
      
      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        WhatsApp will be your main support channel during the Tiny Challenge, so please watch for our messages there.
      </p>
      
      <a href="${origin}/intake" 
         style="display: inline-block; background: #085041; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 10px 0;">
        Complete Your Intake Form →
      </a>
      
      <a href="${origin}/book" 
         style="display: inline-block; background: white; color: #085041; border: 2px solid #085041; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 10px 10px;">
        Book Your Sessions →
      </a>
      
      <p style="font-size: 15px; color: #333; line-height: 1.6; margin-top: 20px;">
        Take it one day at a time. Everything you need for the next few days is inside your membership.
      </p>
      
      <p style="font-size: 13px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
        This is not medical advice. Always consult your healthcare provider before making dietary changes.
      </p>
    </div>
  `;
}

function buildAdminNotificationEmail(name: string, email: string, phone: string, amount: string, origin: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #085041; font-size: 24px;">🎉 New Purchase!</h1>
      
      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        A new client just purchased the 5-Day Diabetes Reset Challenge.
      </p>
      
      <div style="background: #f0f7ef; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Name</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${esc(name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Email</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${esc(email)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Phone</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${esc(phone) || "Not provided"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Amount</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${esc(amount)}</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size: 14px; color: #333; line-height: 1.6;">
        <strong>Action needed:</strong> Send a WhatsApp welcome message and the Starter Kit to this client.
      </p>
      
      <a href="${origin}/admin" 
         style="display: inline-block; background: #085041; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 10px 0;">
        View in Dashboard →
      </a>
    </div>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsFor(req) });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const signature = req.headers.get("stripe-signature");
    // Each webhook function is a distinct endpoint with its own Stripe
    // signing secret. There is deliberately no shared-secret fallback.
    const webhookSecret = Deno.env.get("STRIPE_PAYMENT_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("STRIPE_PAYMENT_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsFor(req), "Content-Type": "application/json" } }
      );
    }

    if (!signature) {
      return new Response(
        JSON.stringify({ error: "No signature provided" }),
        { status: 400, headers: { ...corsFor(req), "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Webhook signature verification failed" }),
        { status: 400, headers: { ...corsFor(req), "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Received webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const nowIso = new Date().toISOString();

        // Update order status
        const { error: updateError } = await supabaseAdmin
          .from("orders")
          .update({
            status: "completed",
            stripe_payment_intent_id: session.payment_intent as string,
            updated_at: nowIso,
          })
          .eq("stripe_session_id", session.id);

        if (updateError) {
          console.error("Error updating order:", updateError);
        } else {
          console.log("Order completed for session:", session.id);
        }

        // P1 legacy retirement: this webhook no longer reads the retired
        // browser-generated identifier from Stripe session metadata, never
        // looks a visitor profile up by it, and never binds a profile or
        // purchase activity to an account from it. A valid Stripe signature
        // authenticates the event, not the identity claims a browser once put
        // inside it. Any such value still present on historical Stripe objects
        // is processor-side residue: it is not read, logged, copied, exported
        // or claimed erased. Order completion above is driven solely by the
        // Stripe session -> order relationship.

        // Batch 2 closeout: bind the order to its member through an immutable
        // owner column so `orders` RLS never has to fall back to an email
        // comparison. The address comes from the signed Stripe session or the
        // stored order row; caller metadata is never consulted. The write is
        // conditional on user_id IS NULL, so a replay changes nothing.
        {
          const ownership = await assignImmutableOwner(
            supabaseAdmin as unknown as Parameters<typeof assignImmutableOwner>[0],
            session.id,
            session.customer_email ?? session.customer_details?.email ?? null,
          );
          console.log("[payment-webhook] order ownership:", ownership.reason);
        }




        // Get customer details from order (for emails)
        const { data: orderData } = await supabaseAdmin
          .from("orders")
          .select("customer_name, customer_email, customer_phone, amount")
          .eq("stripe_session_id", session.id)
          .single();

        if (orderData) {
          const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
          const origin = session.success_url?.split("?")[0] || "https://diabetesresetmethod.com";

          if (RESEND_API_KEY) {
            await sendEmail(
              RESEND_API_KEY,
              orderData.customer_email,
              "Welcome to The Diabetes Reset Tiny Challenge 🎉",
              buildWelcomeEmail(orderData.customer_name, origin)
            );
            console.log("Welcome email sent to:", orderData.customer_email);

            await sendEmail(
              RESEND_API_KEY,
              ADMIN_EMAIL,
              `🎉 New Purchase: ${orderData.customer_name} — $${(orderData.amount / 100).toFixed(2)}`,
              buildAdminNotificationEmail(
                orderData.customer_name,
                orderData.customer_email,
                orderData.customer_phone || "",
                `$${(orderData.amount / 100).toFixed(2)}`,
                origin
              )
            );
            console.log("Admin notification sent to:", ADMIN_EMAIL);
          } else {
            console.error("RESEND_API_KEY not configured, skipping emails");
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { error: updateError } = await supabaseAdmin
          .from("orders")
          .update({ 
            status: "expired",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_session_id", session.id);

        if (updateError) {
          console.error("Error updating expired order:", updateError);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { error: updateError } = await supabaseAdmin
          .from("orders")
          .update({ 
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        if (updateError) {
          console.error("Error updating failed order:", updateError);
        }
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsFor(req), "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsFor(req), "Content-Type": "application/json" }, status: 500 }
    );
  }
});
