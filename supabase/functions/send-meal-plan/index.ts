import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendEmail } from "../_shared/email.ts";
import { corsFor, preflight, requireAllowedOrigin } from "../_shared/cors.ts";


function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Best-effort in-memory rate limit: 1 request per IP per 60s
const rateMap = new Map<string, number>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const last = rateMap.get(ip) ?? 0;
  if (now - last < 60_000) return true;
  rateMap.set(ip, now);
  // periodic cleanup
  if (rateMap.size > 5000) {
    for (const [k, v] of rateMap) if (now - v > 60_000) rateMap.delete(k);
  }
  return false;
}

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const originDenied = requireAllowedOrigin(req);
  if (originDenied) return originDenied;
  const corsHeaders = corsFor(req);

  try {
    const body = await req.json();
    // Throttle on the submitted address, never on a caller-supplied IP header.
    if (rateLimited(String(body?.email ?? "").toLowerCase())) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again in a minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { name, email } = body;

    // Validate inputs to prevent abuse of the email relay
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      name.trim().length === 0 ||
      name.length > 100 ||
      email.length > 254 ||
      !emailRegex.test(email)
    ) {
      return new Response(
        JSON.stringify({ error: "Valid name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const gateAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const sendResult = await sendEmail(gateAdmin, {
        from: "The 5-Day Diabetes Reset <hello@diabetesresetmethod.com>",
        to: [email],
        subject: "Your Free 2-Day Diabetic-Friendly Meal Plan 🍽️",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #085041; font-size: 24px;">Hi ${esc(name)}! 👋</h1>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Thank you for your interest in taking control of your health! Here's your free 2-day diabetic-friendly meal plan.
            </p>
            <div style="background: #f0f7ef; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <h2 style="color: #085041; font-size: 20px; margin-top: 0;">What's Inside:</h2>
              <ul style="color: #333; font-size: 15px; line-height: 1.8;">
                <li>2 full days of blood-sugar-friendly meals</li>
                <li>Simple, delicious recipes</li>
                <li>Grocery shopping list</li>
                <li>Portion guidance for balanced plates</li>
              </ul>
            </div>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              <strong>Ready for the full transformation?</strong> Our 5-Day Diabetes Reset Challenge gives you a complete action plan with daily guidance, accountability, and proven strategies.
            </p>
            <a href="${Deno.env.get("APP_URL") || "https://diabetesresetmethod.com"}" 
               style="display: inline-block; background: #085041; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 10px 0;">
              Join the 5-Day Challenge →
            </a>
            <p style="font-size: 13px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
              This is not medical advice. Always consult your healthcare provider before making dietary changes.
            </p>
          </div>
        `,
    });

    if (!sendResult.sent && sendResult.reason !== "gate_closed") {
      throw new Error(`email not sent: ${sendResult.reason}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending meal plan email:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
