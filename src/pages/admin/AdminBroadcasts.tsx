import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Row {
  id: string;
  channel: string;
  audience: string;
  subject: string | null;
  body: string;
  recipients_count: number;
  sent_at: string;
}

export default function AdminBroadcasts() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    channel: "email",
    audience: "all_members",
    subject: "",
    body: "",
    recipients_count: 0,
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("broadcast_log")
      .select("*")
      .order("sent_at", { ascending: false });
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const log = async () => {
    if (!form.body.trim()) {
      toast.error("Body required");
      return;
    }
    const { error } = await supabase.from("broadcast_log").insert({
      channel: form.channel,
      audience: form.audience,
      subject: form.subject || null,
      body: form.body,
      recipients_count: form.recipients_count,
      sent_by: user?.id || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Logged");
      setCreating(false);
      setForm({ channel: "email", audience: "all_members", subject: "", body: "", recipients_count: 0 });
      load();
    }
  };

  if (loading) return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mt-12" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Log of WhatsApp / email broadcasts you've sent externally.
        </p>
        <Button onClick={() => setCreating(true)} className="bg-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" /> Log Broadcast
        </Button>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-center justify-between gap-3 mb-2 text-xs text-muted-foreground">
              <div className="flex gap-2">
                <span className="px-2 py-0.5 rounded-full bg-secondary font-semibold uppercase">{r.channel}</span>
                <span>→ {r.audience}</span>
                <span>· {r.recipients_count} recipients</span>
              </div>
              <span>{new Date(r.sent_at).toLocaleString()}</span>
            </div>
            {r.subject && <p className="font-semibold mb-1">{r.subject}</p>}
            <p className="text-sm whitespace-pre-wrap">{r.body}</p>
          </Card>
        ))}
        {rows.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No broadcasts logged yet.</p>
        )}
      </div>

      {creating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-3">
            <h3 className="font-heading font-bold text-xl">Log Broadcast</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Audience</Label>
                <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_members">All members</SelectItem>
                    <SelectItem value="trialing">Trialing</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="waitlist">Coaching waitlist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Subject (optional)</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea
                rows={5}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>
            <div>
              <Label>Recipients count</Label>
              <Input
                type="number"
                value={form.recipients_count}
                onChange={(e) => setForm({ ...form, recipients_count: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              <Button onClick={log} className="bg-primary text-primary-foreground">Log</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
