// Edge function: support-request
// Sends a support/billing/feedback message from an authenticated member to the
// team inbox via Resend. Replaces the old mailto: links.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { sendEmail } from "../_shared/email.ts";
import { corsFor, preflight, requireAllowedOrigin } from "../_shared/cors.ts";
import { guardRequest, LIMITS } from "../_shared/abuseGuard.ts";


const SUPPORT_INBOX = "info@diabetesresetmethod.com";
const ADMIN_QUEUE_URL = "https://diabetesresetmethod.com/admin/support";

/** Short, human-quotable reference: DRM-XXXXXX. */
function makeReference(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `DRM-${out}`;
}
const FROM_EMAIL = "DRM Support <support@diabetesresetmethod.com>";

const CATEGORIES = new Set(["Bug", "Question", "Feedback", "Billing"]);

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const originDenied = requireAllowedOrigin(req);
  if (originDenied) return originDenied;
  const corsHeaders = corsFor(req);
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(auth.slice(7));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    // Part 7. Free text delivered to a human inbox is the classic spam target.
    const guard = await guardRequest(supabase, req, {
      scope: "support-request",
      userId: user.id,
      ...LIMITS.support,
    });
    if (!guard.allowed) {
      return new Response(JSON.stringify(guard.body), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const category = String(body.category ?? "Question");
    const message = String(body.message ?? "").trim();
    const pageContext = String(body.pageContext ?? "").slice(0, 500);
    // Minimum non-identifying diagnostics. The raw user agent is never
    // accepted, stored or logged.
    const PLATFORMS = new Set(["web", "ios", "android", "unknown"]);
    const rawPlatform = String(body.clientPlatform ?? "unknown").toLowerCase();
    const clientPlatform = PLATFORMS.has(rawPlatform) ? rawPlatform : "unknown";
    const clientViewport = body.clientViewport === "mobile" ? "mobile" : "desktop";


    if (!CATEGORIES.has(category)) {
      return new Response(JSON.stringify({ error: "invalid_category" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message.length < 5 || message.length > 5000) {
      return new Response(JSON.stringify({ error: "invalid_message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch program day + subscription
    const [{ data: profile }, { data: sub }] = await Promise.all([
      supabase.from("profiles").select("program_start_date").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("subscriptions")
        .select("created_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    let programDay = 1;
    const startIso = profile?.program_start_date ?? sub?.created_at ?? null;
    if (startIso) {
      const start = new Date(startIso);
      const diff = Math.floor((Date.now() - start.getTime()) / 86400000);
      programDay = Math.max(1, diff + 1);
    }

    // E. Persist first. "Ticket received" is only ever said about a row that
    // exists.
    const reference = makeReference();
    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        reference,
        category,
        message,
        page_context: pageContext,
        client_platform: clientPlatform,
        client_viewport: clientViewport,

        program_day: programDay,
        email_status: "not_attempted",
      })
      .select("id, reference")
      .single();

    if (ticketErr || !ticket) {
      console.error("support-request: ticket insert failed", ticketErr?.message);
      return new Response(JSON.stringify({ error: "ticket_not_saved" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // E. The member's words never leave the database. The notification email
    // carries only the reference, the category and a pointer to the queue.
    const subject = `[DRM ${category}] new support ticket ${ticket.reference}`;
    const escape = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;">
        <h2 style="color:#085041;margin:0 0 12px;">New support ticket</h2>
        <table style="font-size:13px;color:#333;line-height:1.6;">
          <tr><td><b>Reference</b></td><td>${escape(ticket.reference)}</td></tr>
          <tr><td><b>Category</b></td><td>${escape(category)}</td></tr>
        </table>
        <p style="font-size:13px;color:#333;">
          The member's message is stored securely and is only readable in the admin support queue.
        </p>
        <p><a href="${ADMIN_QUEUE_URL}" style="color:#085041;">Open the support queue</a></p>
      </div>`;

    let emailStatus: "sent" | "suppressed" | "failed" = "failed";
    try {
      const sendResult = await sendEmail(supabase, {
        from: FROM_EMAIL,
        to: SUPPORT_INBOX,
        subject,
        html,
      });
      if (sendResult.sent) emailStatus = "sent";
      else if (sendResult.reason === "gate_closed") emailStatus = "suppressed";
      else emailStatus = "failed";
    } catch (_e) {
      emailStatus = "failed";
    }

    await supabase
      .from("support_tickets")
      .update({ email_status: emailStatus, updated_at: new Date().toISOString() })
      .eq("id", ticket.id);

    return new Response(
      JSON.stringify({ ok: true, reference: ticket.reference, email_status: emailStatus }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    // E. Never log the member's message.
    console.error("support-request error", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
