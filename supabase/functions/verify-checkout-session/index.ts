// Prompt 4 §11 — additive, read-only checkout verification for /payment-success.
//
// Backward compatible: it does not fulfil, mutate membership, or change the live
// checkout path. It only reads the Stripe Checkout Session the browser was
// redirected with and reports one of the five states the success page renders.
//
// No health data, no card data, and no member mutation is involved.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsFor, preflight } from "../_shared/cors.ts";

type State = "verified" | "processing" | "unverified" | "failed" | "error";

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const corsHeaders = corsFor(req);
  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { sessionId } = (await req.json().catch(() => ({}))) as { sessionId?: string };

    // Stripe Checkout Session ids look like cs_test_... / cs_live_...
    if (typeof sessionId !== "string" || !/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) {
      return json({ state: "unverified" satisfies State });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    let state: State = "processing";
    if (session.status === "complete") {
      state =
        session.payment_status === "paid" || session.payment_status === "no_payment_required"
          ? "verified"
          : "processing";
    } else if (session.status === "expired") {
      state = "failed";
    }

    // Deliberately minimal payload — no customer identifiers echoed back.
    return json({ state });
  } catch (err) {
    console.error("verify-checkout-session error:", err);
    return json({ state: "error" satisfies State }, 200);
  }
});
