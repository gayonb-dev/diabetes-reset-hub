import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_program_status",
  title: "Get program status",
  description:
    "Return the signed-in member's current program day, streak counters, XP/level, and subscription status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = sb(ctx);
    const userId = ctx.getUserId();

    const [dayRes, streakRes, subRes, profileRes] = await Promise.all([
      client.rpc("current_program_day", { p_user_id: userId }),
      client.from("user_streaks").select("*").eq("user_id", userId).maybeSingle(),
      client
        .from("subscriptions")
        .select("status, current_period_end, plan")
        .eq("user_id", userId)
        .in("status", ["trialing", "active", "past_due", "canceled"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      client.from("profiles").select("first_name, timezone").eq("user_id", userId).maybeSingle(),
    ]);

    const payload = {
      program_day: dayRes.data ?? null,
      streak: streakRes.data ?? null,
      subscription: subRes.data ?? null,
      profile: profileRes.data ?? null,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
