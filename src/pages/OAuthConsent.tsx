import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";

type AuthzDetails = {
  client?: {
    id?: string;
    client_id?: string;
    name?: string;
    client_name?: string;
    client_uri?: string;
    logo_uri?: string;
  };
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};

// Local typed shim for the beta supabase.auth.oauth namespace.
type OauthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthzDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthzDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthzDetails | null; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OauthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthzDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }
      if (!oauth) {
        setError("This build of Supabase auth does not expose the OAuth consent APIs.");
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId, navigate]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }

    if (approve) {
      // Record the grant from this first-party session so Settings can list
      // and revoke it. MCP tool calls require a matching row.
      const clientId =
        details?.client?.client_id ?? details?.client?.id ?? details?.client_id ?? null;
      const { data: sess } = await supabase.auth.getSession();
      const memberId = sess.session?.user?.id;
      if (clientId && memberId) {
        const scopes =
          details?.scopes ?? (details?.scope ? details.scope.split(/\s+/).filter(Boolean) : []);
        await supabase.from("oauth_client_grants").upsert(
          {
            member_id: memberId,
            client_id: clientId,
            client_name: details?.client?.name ?? details?.client?.client_name ?? null,
            scopes,
            approved_at: new Date().toISOString(),
          },
          { onConflict: "member_id,client_id" },
        );
      }
    }

    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border rounded-xl p-6 shadow-warm">
          <h1 className="font-heading text-xl font-semibold text-primary mb-2">Connection request</h1>
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "an app";

  return (
    <main className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-md bg-card border-2 border-primary/20 rounded-2xl shadow-xl p-6 space-y-5">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <p className="text-[11px] uppercase tracking-widest font-semibold">Connect an app</p>
        </div>
        <h1 className="font-heading text-2xl font-semibold text-primary">
          Connect {clientName} to your account
        </h1>
        <p className="text-sm text-muted-foreground">
          This lets <span className="font-medium text-foreground">{clientName}</span> use The Diabetes
          Reset Method as you, reading your program status, blood sugar, and health logs, and letting
          you log entries or mark days complete on your behalf.
        </p>
        <ul className="text-sm text-foreground space-y-1 list-disc pl-5">
          <li>Share your basic profile and email</li>
          <li>Read and write your own health & program data</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          This does not bypass this app's permissions. You can revoke access anytime from Settings.
        </p>
        <div className="flex gap-2 pt-2">
          <Button
            variant="ghost"
            className="flex-1"
            disabled={busy}
            onClick={() => decide(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={busy}
            onClick={() => decide(true)}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
          </Button>
        </div>
      </div>
    </main>
  );
}
