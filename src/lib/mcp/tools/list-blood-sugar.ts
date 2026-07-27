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
  name: "list_blood_sugar_readings",
  title: "List blood sugar readings",
  description:
    "List the signed-in member's recent blood sugar readings (fasting, post-meal, random, or CGM), newest first.",
  inputSchema: {
    days: z.number().int().min(1).max(90).optional().describe("Days back to include (default 7)."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = sb(ctx);
    const since = new Date(Date.now() - (days ?? 7) * 86400_000).toISOString();
    const { data, error } = await client
      .from("blood_sugar_readings")
      .select("id, measured_at, value_mgdl, reading_type, source, notes")
      .eq("member_id", ctx.getUserId())
      .gte("measured_at", since)
      .order("measured_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { readings: data },
    };
  },
});
