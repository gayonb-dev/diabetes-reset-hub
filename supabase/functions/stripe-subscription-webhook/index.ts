import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const ADMIN_EMAIL = "support@diabetesresetmethod.com";

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "The Diabetes Reset Method <hello@diabetesresetmethod.com>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) console.error("Email send failed", await res.text());
  } catch (e) {
    console.error("Email send error:", e);
  }
}

function welcomeHtml(name: string, magicLink: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
    <h1 style="color:#7DAF76;font-size:24px;">Welcome to the Diabetes Reset Method, ${esc(name)}! 🎉</h1>
    <p style="font-size:16px;color:#333;line-height:1.6;">
      Your $27 is confirmed. You now have <strong>14 days of full app access</strong>, starting with the
      5-Day Diabetes Reset.
    </p>
    <p style="font-size:16px;color:#333;line-height:1.6;">
      Click below to log in and start Day 1:
    </p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${magicLink}" style="display:inline-block;background:#7DAF76;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
        Start Your Reset →
      </a>
    </p>
    <p style="font-size:13px;color:#666;">
      This link expires in 1 hour. If it expires, request a new one at
      <a href="${Deno.env.get("APP_URL") || "https://diabetesresetmethod.com"}/login" style="color:#7DAF76;">/login</a>.
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <p style="font-size:13px;color:#666;">
      <strong>Heads up about billing:</strong> Your 14-day trial ends on day 15, when your membership
      auto-renews at $67/month. Cancel anytime from your billing settings — no questions, no fees.
    </p>
    <p style="font-size:12px;color:#999;margin-top:24px;">
      Coaching content only, not medical advice. Always consult your healthcare provider.
    </p>
  </div>`;
}

function adminNotifHtml(name: string, email: string, phone: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
    <h2 style="color:#7DAF76;">🎉 New Member: ${esc(name)}</h2>
    <p>Email: ${esc(email)}<br>Phone: ${esc(phone) || "—"}<br>Plan: $27 trial → $67/mo</p>
    <p><a href="${Deno.env.get("APP_URL") || "https://diabetesresetmethod.com"}/admin">View admin</a></p>
  </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500, headers: corsHeaders });
    }
    if (!signature) return new Response("No signature", { status: 400, headers: corsHeaders });

    const body = await req.text();
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Sig verify failed:", err);
      return new Response("bad sig", { status: 400, headers: corsHeaders });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const RESEND = Deno.env.get("RESEND_API_KEY");
    const APP_URL = Deno.env.get("APP_URL") || "https://diabetesresetmethod.com";

    console.log("[sub-webhook] event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const email = (session.customer_email || session.customer_details?.email || "")
          .toLowerCase()
          .trim();
        const name =
          (session.metadata?.customer_name as string) ||
          session.customer_details?.name ||
          email.split("@")[0];
        const phone = (session.metadata?.customer_phone as string) || "";

        if (!email) {
          console.error("No email on session");
          break;
        }

        // 1. Mark order completed
        await sb
          .from("orders")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("stripe_session_id", session.id);

        // 2. Create or fetch user (auth)
        let userId: string | null = null;
        // Try find existing user via listUsers (paginate via email filter not available; use get by email pattern)
        const { data: existingList } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = existingList.users.find((u) => u.email?.toLowerCase() === email);
        if (existing) {
          userId = existing.id;
        } else {
          const { data: created, error: createErr } = await sb.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { full_name: name, phone },
          });
          if (createErr) {
            console.error("createUser error:", createErr);
            break;
          }
          userId = created.user!.id;
        }

        // 3. Assign member role (idempotent)
        await sb.from("user_roles").upsert(
          { user_id: userId, role: "member" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );

        // 4. Upsert subscription row
        const subId = session.subscription as string;
        let trialEnd: string | null = null;
        let periodEnd: string | null = null;
        let status = "trialing";
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
          periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;
          status = sub.status;
        }
        await sb.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: subId,
            stripe_customer_id: session.customer as string,
            status,
            tier: "standard",
            trial_end_date: trialEnd,
            current_period_end: periodEnd,
            day_number: 1,
            last_active_at: new Date().toISOString(),
          },
          { onConflict: "stripe_subscription_id" },
        );

        // 5. Generate magic link + send welcome email
        if (RESEND) {
          const { data: linkData } = await sb.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo: `${APP_URL}/auth/callback?next=/app/onboarding` },
          });
          const magicLink = linkData?.properties?.action_link;
          if (magicLink) {
            await sendEmail(RESEND, email, "Welcome to the Diabetes Reset Method 🎉", welcomeHtml(name, magicLink));
          }
          await sendEmail(RESEND, ADMIN_EMAIL, `🎉 New member: ${name}`, adminNotifHtml(name, email, phone));
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await sb
          .from("subscriptions")
          .update({
            status: sub.status,
            cancel_at_period_end: sub.cancel_at_period_end,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            trial_end_date: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.subscription) {
          await sb.from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", inv.subscription as string);
          const { data: subRow } = await sb
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", inv.subscription as string)
            .single();
          if (subRow?.user_id) {
            await sb.from("dunning_attempts").insert({
              user_id: subRow.user_id,
              stripe_invoice_id: inv.id,
              attempt_number: inv.attempt_count || 1,
              status: "failed",
              failure_reason: inv.last_finalization_error?.message || "Payment failed",
            });
            // Email member about failed payment
            if (RESEND) {
              const { data: userData } = await sb.auth.admin.getUserById(subRow.user_id);
              const email = userData?.user?.email;
              const name = (userData?.user?.user_metadata?.full_name as string) || email?.split("@")[0] || "";
              if (email) {
                const portalUrl = `${APP_URL}/app/billing`;
                const html = `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                  <h1 style="color:#c44; font-size:22px;">Payment issue with your Diabetes Reset membership</h1>
                  <p>Hi ${name},</p>
                  <p>Your last payment didn't go through (attempt ${inv.attempt_count || 1}).
                  Stripe will retry automatically, but your access will pause if it keeps failing.</p>
                  <p style="text-align:center;margin:24px 0;">
                    <a href="${portalUrl}" style="display:inline-block;background:#7DAF76;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
                      Update payment method →
                    </a>
                  </p>
                  <p style="font-size:13px;color:#666;">Questions? Reply to this email.</p>
                </div>`;
                await sendEmail(RESEND, email, "Action needed: update your payment method", html);
              }
            }
          }
        }
        break;
      }


      default:
        console.log("[sub-webhook] unhandled:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[sub-webhook] error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
