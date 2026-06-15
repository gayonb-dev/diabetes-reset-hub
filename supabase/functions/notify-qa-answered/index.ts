import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { submission_id } = await req.json();
    if (!submission_id) {
      return new Response(JSON.stringify({ error: "submission_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await sb.auth.getUser(token);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sub } = await sb
      .from("qa_submissions")
      .select("user_id, question, answer")
      .eq("id", submission_id)
      .maybeSingle();
    if (!sub) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also create an in-app notification (VITA template)
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "",
        },
        body: JSON.stringify({
          user_id: sub.user_id,
          template_key: "qa_answered",
          payload: { submission_id },
        }),
      });
    } catch (e) {
      console.error("qa_answered notification dispatch failed", e);
    }

    const { data: target } = await sb.auth.admin.getUserById(sub.user_id);
    const email = target?.user?.email;
    if (!email) {
      return new Response(JSON.stringify({ ok: true, skipped: "no email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const key = Deno.env.get("RESEND_API_KEY");
    const APP_URL = Deno.env.get("APP_URL") || "https://diabetesresetmethod.com";
    if (key) {
      const snippet = (sub.answer || "").slice(0, 240);
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "The Diabetes Reset Method <hello@diabetesresetmethod.com>",
          to: [email],
          subject: "Your question has been answered",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
              <h2 style="color:#085041;">Your coach answered</h2>
              <p style="font-size:14px;color:#666;margin:0 0 4px;">You asked:</p>
              <p style="font-size:15px;color:#222;margin:0 0 16px;"><em>${sub.question}</em></p>
              <p style="font-size:14px;color:#666;margin:0 0 4px;">Answer (preview):</p>
              <p style="font-size:15px;color:#222;line-height:1.6;margin:0 0 24px;">${snippet}${sub.answer && sub.answer.length > 240 ? "…" : ""}</p>
              <p style="text-align:center;margin:24px 0;">
                <a href="${APP_URL}/app/ask" style="display:inline-block;background:#085041;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
                  Read the full answer →
                </a>
              </p>
              <p style="font-size:12px;color:#999;">Educational coaching — not medical advice.</p>
            </div>`,
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-qa-answered error:", err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
