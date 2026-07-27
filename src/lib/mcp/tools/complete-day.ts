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
  name: "complete_program_day",
  title: "Mark a program day complete",
  description:
    "Mark a specific program day complete for the signed-in member. The database enforces that the day must already be unlocked.",
  inputSchema: {
    day_number: z.number().int().min(1).max(120),
    notes: z.string().max(1000).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ day_number, notes }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("member_progress")
      .insert({
        user_id: ctx.getUserId(),
        day_number,
        notes: notes ?? null,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Day ${day_number} marked complete.` }],
      structuredContent: { progress: data },
    };
  },
});
