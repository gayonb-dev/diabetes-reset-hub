// P3: recent-reauthentication is server-verifiable only.
//
// The browser never decides whether a member reauthenticated. It asks the
// server to mint a single-use ticket bound to the verified user, to one action
// ("export" or "delete"), with a ten-minute lifetime. The server consumes it
// once. A local timestamp, boolean, or typed "DELETE" is never sufficient.

import { supabase } from "@/integrations/supabase/client";

export type ReauthAction = "export" | "delete";

export type TicketError =
  | "reauthentication_failed"
  | "rate_limited"
  | "unauthenticated"
  | "failed";

export interface TicketResult {
  ok: boolean;
  ticket?: string;
  error?: TicketError;
}

export async function requestActionTicket(
  action: ReauthAction,
  password: string,
): Promise<TicketResult> {
  const { data, error } = await supabase.functions.invoke("request-reauth-ticket", {
    body: { action, password },
  });

  if (error || !data?.ticket) {
    const code = (data?.error as string) ?? "";
    if (code === "reauthentication_failed" || code === "reauthentication_required") {
      return { ok: false, error: "reauthentication_failed" };
    }
    if (code === "rate_limited") return { ok: false, error: "rate_limited" };
    if (code === "unauthenticated") return { ok: false, error: "unauthenticated" };
    return { ok: false, error: "failed" };
  }

  return { ok: true, ticket: data.ticket as string };
}
