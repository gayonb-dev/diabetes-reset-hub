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
  name: "get_today_action",
  title: "Get today's action",
  description:
    "Return today's daily action (title, description, learning objective, sub-tasks) for the signed-in member, plus whether they've already completed it.",
  inputSchema: {
    day_number: z
      .number()
      .int()
      .min(1)
      .max(120)
      .optional()
      .describe("Optional. Override the day to fetch; defaults to the member's current program day."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ day_number }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = sb(ctx);
    const userId = ctx.getUserId();

    let day = day_number;
    if (!day) {
      const { data } = await client.rpc("current_program_day", { p_user_id: userId });
      day = (data as number) ?? 1;
    }

    const [{ data: action, error: aErr }, { data: progress }] = await Promise.all([
      client
        .from("daily_actions")
        .select("day_number, day_name, phase_number, action_title, action_description, action_type, learning_objective, sub_tasks")
        .eq("day_number", day)
        .eq("is_extension_day", false)
        .maybeSingle(),
      client
        .from("member_progress")
        .select("completed_at, metadata")
        .eq("user_id", userId)
        .eq("day_number", day)
        .maybeSingle(),
    ]);

    if (aErr) return { content: [{ type: "text", text: aErr.message }], isError: true };
    const payload = { day, action, completed: !!progress, progress };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
