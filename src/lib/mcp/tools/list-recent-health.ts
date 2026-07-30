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
  name: "list_recent_health_logs",
  title: "List recent health logs",
  description:
    "Return the signed-in member's recent daily health logs (weight, energy, notes), newest first.",
  inputSchema: {
    days: z.number().int().min(1).max(180).optional().describe("Days back (default 14)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    const denied = await requireGrant(ctx);
    if (denied) return denied;
    const since = new Date(Date.now() - (days ?? 14) * 86400_000).toISOString().slice(0, 10);
    const { data, error } = await sb(ctx)
      .from("health_logs")
      .select("log_date, weight, blood_sugar, energy, notes")
      .eq("user_id", ctx.getUserId())
      .gte("log_date", since)
      .order("log_date", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { logs: data },
    };
  },
});
