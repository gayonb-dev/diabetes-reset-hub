import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RefreshCw, Copy, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ScoreRow {
  id: string;
  user_id: string | null;
  visitor_profile_id: string | null;
  score: number;
  spend_score: number;
  content_score: number;
  conversation_score: number;
  recency_score: number;
  consistency_score: number;
  total_paid_usd: number;
  days_since_last_activity: number | null;
  last_conversation_theme: string | null;
  last_purchase_at: string | null;
  open_unresolved_questions: Array<{ q: string; at: string }>;
  talking_points: string[];
  draft_whatsapp_script: string | null;
  refreshed_at: string;
}

export default function AdminTopCustomers() {
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<ScoreRow | null>(null);
  const [reason, setReason] = useState("");
  const [phiOpen, setPhiOpen] = useState(false);
  const [phiData, setPhiData] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("visitor_engagement_scores")
      .select("*")
      .order("score", { ascending: false })
      .limit(100);
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setRows((data as unknown as ScoreRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const refresh = async () => {
    setRefreshing(true);
    const { error } = await supabase.functions.invoke("compute-engagement-scores", { body: {} });
    setRefreshing(false);
    if (error) return toast({ title: "Refresh failed", description: error.message, variant: "destructive" });
    toast({ title: "Scores refreshed" });
    load();
  };

  const openPhi = async (row: ScoreRow) => {
    setSelected(row);
    setPhiData(null);
    setReason("");
    setPhiOpen(true);
  };

  const fetchPhi = async () => {
    if (!selected) return;
    if (reason.trim().length < 3) {
      toast({ title: "Reason required", description: "Please provide a reason (min 3 chars).", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.functions.invoke("read-phi-data", {
      body: {
        table: "messages",
        reason: reason.trim(),
        filters: { visitor_profile_id: selected.visitor_profile_id },
        order_by: { column: "created_at", ascending: false },
        limit: 20,
      },
    });
    if (error) return toast({ title: "Access denied", description: error.message, variant: "destructive" });
    setPhiData(data);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Top 100 Customers</h2>
          <p className="text-sm text-muted-foreground">
            Ranked nightly by engagement (spend, content, conversation, recency, consistency).
          </p>
        </div>
        <Button onClick={refresh} disabled={refreshing} variant="outline" size="sm">
          {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh now
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No scores yet. Click "Refresh now" to generate the first ranking.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r, i) => (
            <Card key={r.id} className="hover:shadow-md transition">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                      <span className="font-semibold">Score: {r.score.toFixed(3)}</span>
                      {r.total_paid_usd > 0 && (
                        <Badge variant="secondary">${r.total_paid_usd.toFixed(0)} lifetime</Badge>
                      )}
                      {r.days_since_last_activity !== null && (
                        <Badge variant={r.days_since_last_activity > 14 ? "destructive" : "outline"}>
                          {r.days_since_last_activity}d since active
                        </Badge>
                      )}
                      {r.last_conversation_theme && (
                        <Badge variant="outline">Topic: {r.last_conversation_theme}</Badge>
                      )}
                    </div>
                    {r.talking_points.length > 0 && (
                      <ul className="mt-2 text-sm text-muted-foreground space-y-0.5">
                        {r.talking_points.map((tp, idx) => <li key={idx}>• {tp}</li>)}
                      </ul>
                    )}
                    <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                      <span>spend {r.spend_score.toFixed(2)}</span>
                      <span>content {r.content_score.toFixed(2)}</span>
                      <span>conv {r.conversation_score.toFixed(2)}</span>
                      <span>recency {r.recency_score.toFixed(2)}</span>
                      <span>consist {r.consistency_score.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {r.draft_whatsapp_script && (
                      <Button size="sm" variant="outline" onClick={() => copy(r.draft_whatsapp_script!)}>
                        <Copy className="h-3 w-3 mr-1" /> WA script
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openPhi(r)}>
                      <MessageSquare className="h-3 w-3 mr-1" /> View chats
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={phiOpen} onOpenChange={setPhiOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Read PHI — audited access</DialogTitle>
          </DialogHeader>
          {!phiData ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Every read is logged with the reason below. Be specific.
              </p>
              <Textarea
                placeholder="Reason for access (e.g. preparing 1:1 call talking points)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button onClick={fetchPhi} disabled={reason.trim().length < 3}>Fetch recent messages</Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {(phiData.rows ?? []).map((m: any) => (
                <div key={m.id} className="text-sm border-l-2 border-primary/30 pl-3">
                  <div className="text-xs text-muted-foreground">
                    {m.role} · {new Date(m.created_at).toLocaleString()}
                  </div>
                  <div>{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
