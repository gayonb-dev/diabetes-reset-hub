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
  name: "log_blood_sugar",
  title: "Log a blood sugar reading",
  description:
    "Insert a manual blood sugar reading for the signed-in member. Value must be in mg/dL.",
  inputSchema: {
    value_mgdl: z.number().min(20).max(800).describe("Blood glucose in mg/dL."),
    reading_type: z
      .enum(["fasting", "post_meal", "random", "bedtime"])
      .describe("Context for the reading."),
    measured_at: z
      .string()
      .datetime()
      .optional()
      .describe("ISO timestamp; defaults to now."),
    notes: z.string().max(500).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ value_mgdl, reading_type, measured_at, notes }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("blood_sugar_readings")
      .insert({
        member_id: ctx.getUserId(),
        value_mgdl,
        reading_type,
        measured_at: measured_at ?? new Date().toISOString(),
        source: "manual",
        notes: notes ?? null,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Logged ${value_mgdl} mg/dL (${reading_type}).` }],
      structuredContent: { reading: data },
    };
  },
});
