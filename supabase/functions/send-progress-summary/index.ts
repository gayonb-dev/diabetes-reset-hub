import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MOODS: Record<number, string> = {
  1: "😫 Struggling",
  2: "😕 Low",
  3: "😐 Okay",
  4: "😊 Good",
  5: "🔥 Amazing",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || email.length > 254 || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const lowerEmail = email.toLowerCase();

    // Only allow paid customers — prevents using this endpoint to spam the coach
    const { data: paidOrder } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("customer_email", lowerEmail)
      .eq("status", "completed")
      .limit(1)
      .maybeSingle();

    if (!paidOrder) {
      return new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all 5 days of progress
    const { data: entries, error: fetchError } = await supabaseAdmin
      .from("challenge_progress")
      .select("*")
      .eq("email", lowerEmail)
      .order("day_number", { ascending: true });

    if (fetchError) throw fetchError;



    if (!entries || entries.length < 5) {
      return new Response(
        JSON.stringify({ error: "Client has not completed all 5 days yet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also get the client's name from orders if available
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("customer_name, customer_phone")
      .eq("customer_email", email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const clientName = order?.customer_name || email;
    const clientPhone = order?.customer_phone || "Not provided";

    // Calculate averages
    const avgMood = entries.reduce((sum, e) => sum + (e.mood_rating || 0), 0) / entries.filter(e => e.mood_rating).length || 0;
    const avgEnergy = entries.reduce((sum, e) => sum + (e.energy_rating || 0), 0) / entries.filter(e => e.energy_rating).length || 0;
    const totalWater = entries.reduce((sum, e) => sum + (e.water_glasses || 0), 0);

    // Build day-by-day HTML
    const daysHtml = entries.map((e) => `
      <div style="background: #f0f7ef; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
        <strong style="color: #7DAF76;">Day ${e.day_number}</strong>
        <p style="margin: 5px 0; font-size: 14px; color: #333;">🏆 Win: ${esc(e.win_text)}</p>
        <p style="margin: 3px 0; font-size: 13px; color: #666;">
          ${e.mood_rating ? `Mood: ${MOODS[e.mood_rating]}` : ""} 
          ${e.energy_rating ? ` | Energy: ${e.energy_rating}/5` : ""} 
          ${e.water_glasses ? ` | Water: ${e.water_glasses} glasses` : ""}
        </p>
      </div>
    `).join("");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    // Send summary email to coach
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "The Diabetes Reset Method <hello@diabetesresetmethod.com>",
        to: ["Info@diabetesresetmethod.com"],
        subject: `🎉 5-Day Challenge Completed: ${clientName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #7DAF76; font-size: 22px;">5-Day Challenge Summary</h1>
            <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 10px; font-size: 18px; color: #333;">Client: ${esc(clientName)}</h2>
              <p style="margin: 3px 0; font-size: 14px; color: #666;">📧 ${esc(email)}</p>
              <p style="margin: 3px 0; font-size: 14px; color: #666;">📱 ${esc(clientPhone)}</p>
            </div>

            <h3 style="color: #333; font-size: 16px;">📊 Overall Stats</h3>
            <div style="background: #f9f9f9; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 5px 0; font-size: 14px;">Average Mood: <strong>${avgMood.toFixed(1)}/5</strong></p>
              <p style="margin: 5px 0; font-size: 14px;">Average Energy: <strong>${avgEnergy.toFixed(1)}/5</strong></p>
              <p style="margin: 5px 0; font-size: 14px;">Total Water Intake: <strong>${totalWater} glasses</strong></p>
            </div>

            <h3 style="color: #333; font-size: 16px;">📝 Day-by-Day Breakdown</h3>
            ${daysHtml}

            <div style="background: #7DAF76; color: white; border-radius: 8px; padding: 15px; margin-top: 20px; text-align: center;">
              <p style="margin: 0; font-size: 16px; font-weight: bold;">Follow up with this client!</p>
              <p style="margin: 5px 0 0; font-size: 14px;">
                Send a WhatsApp message to congratulate them and discuss the 6-Week Reset.
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Resend API error [${res.status}]: ${errBody}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Summary sent to coach" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Progress summary error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
