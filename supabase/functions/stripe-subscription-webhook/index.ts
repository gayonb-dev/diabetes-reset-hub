import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

import { corsFor } from "../_shared/cors.ts";
import { sendEmail as sendGatedEmail } from "../_shared/email.ts";
import { findUserByEmail, type AdminListUsersClient } from "../_shared/findUserByEmail.ts";
import {
  canonicalSubscriptionStatus,
  decideEventApplication,
  eventObjectId,
  subscriptionConditions,
} from "../_shared/billingCanonical.ts";
import { nextGraceMarker } from "../_shared/membershipLifecycle.ts";

const ADMIN_EMAIL = "support@diabetesresetmethod.com";
const FROM_EMAIL = "The Diabetes Reset Method <hello@diabetesresetmethod.com>";

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

function welcomeHtml(name: string, magicLink: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
    <h1 style="color:#085041;font-size:24px;">Welcome to the Diabetes Reset Method, ${esc(name)}! 🎉</h1>
    <p style="font-size:16px;color:#333;line-height:1.6;">
      Your $27 is confirmed. You now have <strong>14 days of full app access</strong>, starting with the
      5-Day Diabetes Reset.
    </p>
    <p style="font-size:16px;color:#333;line-height:1.6;">
      Click below to log in and start Day 1:
    </p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${magicLink}" style="display:inline-block;background:#085041;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
        Start Your Reset →
      </a>
    </p>
    <p style="font-size:13px;color:#666;">
      This link expires in 1 hour. If it expires, request a new one at
      <a href="${Deno.env.get("APP_URL") || "https://diabetesresetmethod.com"}/login" style="color:#085041;">/login</a>.
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
    <h2 style="color:#085041;">🎉 New Member: ${esc(name)}</h2>
    <p>Email: ${esc(email)}<br>Phone: ${esc(phone) || "—"}<br>Plan: $27 trial → $67/mo</p>
    <p><a href="${Deno.env.get("APP_URL") || "https://diabetesresetmethod.com"}/admin">View admin</a></p>
  </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    const signature = req.headers.get("stripe-signature");
    // Distinct endpoint, distinct signing secret. No shared fallback.
    const webhookSecret = Deno.env.get("STRIPE_SUBSCRIPTION_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("STRIPE_SUBSCRIPTION_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500, headers: corsFor(req) });
    }
    if (!signature) return new Response("No signature", { status: 400, headers: corsFor(req) });

    const body = await req.text();
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Sig verify failed:", err);
      return new Response("bad sig", { status: 400, headers: corsFor(req) });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const RESEND = Deno.env.get("RESEND_API_KEY");
    const APP_URL = Deno.env.get("APP_URL") || "https://diabetesresetmethod.com";

    console.log("[sub-webhook] event:", event.type);

    // -----------------------------------------------------------------
    // B4. Idempotency and ordering, before any state is touched.
    //
    // Stripe retries, and Stripe does not promise delivery order. Claiming
    // the event ID makes a redelivery a no-op, and comparing timestamps
    // stops an older event from rolling newer state backwards.
    // -----------------------------------------------------------------
    const rawObject = event.data.object as unknown as Record<string, unknown>;
    const objectId = eventObjectId(event.type, rawObject);
    const objectType = String((rawObject?.object as string) ?? "unknown");

    const { data: claimRows, error: claimErr } = await sb.rpc("claim_billing_event", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_created: new Date((event.created ?? 0) * 1000).toISOString(),
      p_object_id: objectId,
      p_object_type: objectType,
      p_livemode: event.livemode ?? null,
      p_synthetic: false,
    });
    if (claimErr) {
      // Never process without the ledger: that is how double-charging and
      // duplicate provisioning happen. Return 500 so Stripe retries.
      console.error("[sub-webhook] ledger claim failed:", claimErr.message);
      return new Response(JSON.stringify({ error: "ledger_unavailable" }), {
        status: 500,
        headers: { ...corsFor(req), "Content-Type": "application/json" },
      });
    }
    const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
    const decision = decideEventApplication({
      eventId: event.id,
      eventCreated: event.created ?? null,
      objectId,
      alreadyClaimed: claim?.claimed !== true,
      lastAppliedCreated: claim?.last_applied_created ?? null,
    });
    console.log("[sub-webhook] decision:", decision.action, decision.reason);

    if (decision.action === "skip_duplicate") {
      await sb.rpc("finalize_billing_event", {
        p_event_id: event.id,
        p_state: "skipped_duplicate",
        p_reason: decision.reason,
      });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsFor(req), "Content-Type": "application/json" },
        status: 200,
      });
    }

    // The payload in hand is stale or ambiguous. Its contents must not be
    // written. Re-retrieve the authoritative object from Stripe instead.
    let subscriptionOverride: Stripe.Subscription | null = null;
    if (decision.action === "refetch_current" && objectId?.startsWith("sub_")) {
      try {
        subscriptionOverride = await stripe.subscriptions.retrieve(objectId);
      } catch (e) {
        console.error("[sub-webhook] refetch failed:", (e as Error).message);
      }
    }

    const finalize = async (state: string, extra: Record<string, unknown> = {}) => {
      await sb.rpc("finalize_billing_event", {
        p_event_id: event.id,
        p_state: state,
        p_reason: decision.reason,
        p_order_status: (extra.orderStatus as string) ?? null,
        p_sub_status: (extra.subStatus as string) ?? null,
        p_conditions: (extra.conditions as Record<string, unknown>) ?? {},
      });
    };
    const appliedState = decision.action === "refetch_current" ? "refetched_current" : "applied";

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
        // B2: resolve the account beyond the first 200 users. A member whose
        // account sits past page one must never be treated as a new signup.
        const existing = await findUserByEmail(sb as unknown as AdminListUsersClient, email);
        if (existing) {
          userId = existing.userId;
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
        await finalize(appliedState, {
          orderStatus: "paid",
          subStatus: canonicalSubscriptionStatus(status),
          conditions: subscriptionConditions({ status, trialEnd }),
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // When the decision was `refetch_current`, the payload in hand is
        // stale and the authoritative object retrieved from Stripe is used
        // in its place.
        const sub = subscriptionOverride ?? (event.data.object as Stripe.Subscription);
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
        await finalize(appliedState, {
          subStatus: canonicalSubscriptionStatus(sub.status),
          conditions: subscriptionConditions({
            status: sub.status,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            trialEnd: sub.trial_end,
          }),
        });
        break;
      }

      // B5. A verified success ends the failure episode: the grace marker is
      // cleared so a later, unrelated failure starts a fresh seven days
      // rather than inheriting an exhausted window.
      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = inv.subscription as string | null;
        if (subId) {
          await sb
            .from("subscriptions")
            .update({ grace_started_at: null, updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", subId);
        }
        await finalize(appliedState, { orderStatus: "paid" });
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.subscription) {
          const { data: existingRow } = await sb
            .from("subscriptions")
            .select("user_id, grace_started_at")
            .eq("stripe_subscription_id", inv.subscription as string)
            .maybeSingle();

          // B5. Grace starts at the FIRST verified failure of this episode.
          // Repeated retries do not extend it.
          const graceStart = nextGraceMarker({
            event: "payment_failed",
            existingGraceStartedAt: existingRow?.grace_started_at ?? null,
            eventAt: (event.created ?? 0) * 1000,
          });

          await sb.from("subscriptions")
            .update({
              status: "past_due",
              grace_started_at: graceStart,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", inv.subscription as string);
          const subRow = existingRow;
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
                  <p>Hi ${esc(name)},</p>
                  <p>Your last payment didn't go through (attempt ${inv.attempt_count || 1}).
                  Stripe will retry automatically, but your access will pause if it keeps failing.</p>
                  <p style="text-align:center;margin:24px 0;">
                    <a href="${portalUrl}" style="display:inline-block;background:#085041;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
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
      headers: { ...corsFor(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[sub-webhook] error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsFor(req), "Content-Type": "application/json" },
    });
  }
});
