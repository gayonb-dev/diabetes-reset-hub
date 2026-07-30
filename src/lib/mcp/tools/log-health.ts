import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireGrant } from "../guard";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "log_daily_health",
  title: "Log daily health entry",
  description:
    "Upsert today's daily health log (weight in lbs, energy 1-10, notes) for the signed-in member.",
  inputSchema: {
    weight_lbs: z.number().min(50).max(700).optional(),
    energy: z.number().int().min(1).max(10).optional(),
    notes: z.string().max(1000).optional(),
    log_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("YYYY-MM-DD; defaults to today (UTC)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ weight_lbs, energy, notes, log_date }, ctx) => {
    const denied = await requireGrant(ctx);
    if (denied) return denied;
    if (weight_lbs == null && energy == null && !notes)
      return {
        content: [{ type: "text", text: "Provide at least one of weight_lbs, energy, or notes." }],
        isError: true,
      };
    const client = sb(ctx);
    const date = log_date ?? new Date().toISOString().slice(0, 10);
    const { data, error } = await client
      .from("health_logs")
      .upsert(
        {
          user_id: ctx.getUserId(),
          log_date: date,
          weight: weight_lbs ?? null,
          energy: energy ?? null,
          notes: notes ?? null,
        },
        { onConflict: "user_id,log_date" },
      )
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Saved health log for ${date}.` }],
      structuredContent: { log: data },
    };
  },
});
