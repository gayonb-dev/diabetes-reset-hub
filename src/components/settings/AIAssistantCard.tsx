import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { Bot, Check, ChevronDown, Copy, Loader2, ShieldAlert } from "lucide-react";

const MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp`;

const CAPABILITIES = [
  "Check your current program day, streak, and level",
  "Read today's daily action",
  "Mark a program day complete",
  "Log a blood sugar reading",
  "List your recent blood sugar readings",
  "Log a daily health entry (weight, energy, notes)",
  "List your recent health entries",
];

type Grant = {
  id: string;
  client_id: string;
  client_name: string | null;
  approved_at: string;
};

export function AIAssistantCard() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("oauth_client_grants")
      .select("id, client_id, client_name, approved_at")
      .order("approved_at", { ascending: false });
    if (!error) setGrants((data ?? []) as Grant[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MCP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Couldn't copy", description: "Copy the URL manually." });
    }
  };

  const revoke = async (grant: Grant) => {
    setRevoking(grant.id);
    const { error } = await supabase.from("oauth_client_grants").delete().eq("id", grant.id);
    setRevoking(null);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't revoke", description: error.message });
      return;
    }
    toast({
      title: "Access revoked",
      description: `${grant.client_name ?? "That assistant"} can no longer reach your data.`,
    });
    load();
  };

  return (
    <Card className="rounded-xl shadow-warm">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <Bot className="h-5 w-5 text-accent" />
          Connect an AI assistant
        </CardTitle>
        <CardDescription>
          Use Claude, ChatGPT, or another AI assistant to log your numbers and check your program by
          voice or chat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="mcp-url">Server URL</Label>
          <div className="flex gap-2">
            <Input id="mcp-url" readOnly value={MCP_URL} className="rounded-lg font-mono text-xs" />
            <Button type="button" variant="outline" className="rounded-lg shrink-0" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-2">{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </div>

        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-primary">
            How to connect
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
              <li>Open your assistant's settings and find Connectors (or MCP servers).</li>
              <li>Choose to add a custom connector / remote MCP server.</li>
              <li>Paste the server URL above.</li>
              <li>Your assistant opens a sign-in page — log in with this same account.</li>
              <li>Review what the assistant is asking for and approve it.</li>
              <li>Come back here — the assistant appears in the list below.</li>
            </ol>
          </CollapsibleContent>
        </Collapsible>

        <div>
          <p className="text-sm font-medium mb-2">What your assistant can do</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            {CAPABILITIES.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground flex gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          Your assistant can read and write your health data. Only connect assistants you trust. You
          can revoke access at any time.
        </p>

        <div>
          <p className="text-sm font-medium mb-2">Authorized assistants</p>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : grants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assistants connected yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {grants.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {g.client_name ?? "Unnamed assistant"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Connected {new Date(g.approved_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg shrink-0"
                    disabled={revoking === g.id}
                    onClick={() => revoke(g)}
                  >
                    {revoking === g.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revoke"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AIAssistantCard;
