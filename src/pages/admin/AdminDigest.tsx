import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DigestRow {
  id: string;
  digest_date: string;
  actions_today: string[];
  what_agent_heard: string | null;
  numbers: Record<string, number>;
  anomalies: string[];
  conversation_count: number;
  email_sent_at: string | null;
  created_at: string;
}

export default function AdminDigest() {
  const [rows, setRows] = useState<DigestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("daily_digest")
      .select("*")
      .order("digest_date", { ascending: false })
      .limit(30);
    setRows((data as unknown as DigestRow[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const runNow = async () => {
    setRunning(true);
    const { error } = await supabase.functions.invoke("daily-digest", { body: {} });
    setRunning(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Digest generated" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Daily Digest</h2>
          <p className="text-sm text-muted-foreground">Map-reduce summary of yesterday. PHI-redacted.</p>
        </div>
        <Button onClick={runNow} disabled={running} variant="outline" size="sm">
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Run now
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No digests yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{r.digest_date}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">{r.conversation_count} conv.</Badge>
                    {r.email_sent_at ? <Badge variant="secondary">Emailed</Badge> : <Badge variant="destructive">Email failed</Badge>}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="font-semibold mb-1">3 Actions Today</div>
                  <ol className="list-decimal pl-5 space-y-1">
                    {r.actions_today.map((a, i) => <li key={i}>{a}</li>)}
                  </ol>
                </div>
                {r.what_agent_heard && (
                  <div>
                    <div className="font-semibold mb-1">What the agent heard</div>
                    <p className="text-muted-foreground">{r.what_agent_heard}</p>
                  </div>
                )}
                <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                  {Object.entries(r.numbers).map(([k, v]) => (
                    <span key={k}>{k}: <strong className="text-foreground">{v}</strong></span>
                  ))}
                </div>
                {r.anomalies?.length > 0 && (
                  <div>
                    <div className="font-semibold mb-1">Anomalies</div>
                    <ul className="list-disc pl-5">
                      {r.anomalies.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
