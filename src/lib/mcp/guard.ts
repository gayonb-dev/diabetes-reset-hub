import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/**
 * Service-role client used ONLY to check that the calling OAuth client still
 * has a member-approved grant row. Member data access always goes through the
 * user-scoped client in each tool, never through this one.
 */
function adminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type GuardFailure = {
  content: [{ type: "text"; text: string }];
  isError: true;
};

/**
 * Enforces revocation: the token must be authenticated AND the member must
 * still have an `oauth_client_grants` row for this OAuth client. Removing the
 * row in Settings makes every subsequent tool call fail with 401-equivalent.
 * Returns null when the call is allowed.
 */
export async function requireGrant(ctx: ToolContext): Promise<GuardFailure | null> {
  if (!ctx.isAuthenticated()) {
    return { content: [{ type: "text", text: "401 Unauthorized: not authenticated" }], isError: true };
  }
  const userId = ctx.getUserId();
  const clientId = ctx.getClientId();
  if (!userId || !clientId) {
    return {
      content: [
        { type: "text", text: "401 Unauthorized: token carries no OAuth client identity" },
      ],
      isError: true,
    };
  }

  const { data, error } = await adminClient()
    .from("oauth_client_grants")
    .select("id")
    .eq("member_id", userId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    return {
      content: [{ type: "text", text: `401 Unauthorized: could not verify access (${error.message})` }],
      isError: true,
    };
  }
  if (!data) {
    return {
      content: [
        {
          type: "text",
          text: "401 Unauthorized: this assistant's access was revoked. Reconnect from Settings → Connect an AI assistant.",
        },
      ],
      isError: true,
    };
  }
  return null;
}
