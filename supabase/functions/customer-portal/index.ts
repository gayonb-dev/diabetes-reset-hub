import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsFor, preflight } from "../_shared/cors.ts";
import { canonicalUrl } from "../_shared/canonicalUrl.ts";
import { guardRequest, LIMITS } from "../_shared/abuseGuard.ts";


serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const corsHeaders = corsFor(req);
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("No auth header");
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user?.email) throw new Error("Not authenticated");

    // Part 7. Portal sessions are cheap but not free, and each one is a
    // redirect into Stripe's hosted surface.
    const guardAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const guard = await guardRequest(guardAdmin, req, {
      scope: "customer-portal",
      userId: user.id,
      ...LIMITS.billingAction,
    });
    if (!guard.allowed) {
      return new Response(JSON.stringify(guard.body), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (!customers.data.length) throw new Error("No Stripe customer");

    const portal = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: canonicalUrl("/app/billing"),
    });
    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("customer-portal error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
