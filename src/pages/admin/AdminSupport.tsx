import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { toast } from "@/hooks/use-toast";
import AdminListSkeleton from "@/components/admin/AdminListSkeleton";

interface Ticket {
  id: string;
  reference: string;
  category: string;
  message: string;
  status: string;
  email_status: string;
  page_context: string | null;
  program_day: number | null;
  created_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
}

interface Note {
  id: string;
  ticket_id: string;
  body: string;
  created_at: string;
}

const STATUSES = ["open", "in_progress", "waiting_member", "resolved", "closed"] as const;

function ageLabel(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "under 1h";
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function AdminSupport() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [notes, setNotes] = useState<Record<string, Note[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select(
        "id,reference,category,message,status,email_status,page_context,program_day,created_at,first_response_at,resolved_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Couldn't load tickets", description: error.message, variant: "destructive" });
      setTickets([]);
      return;
    }
    setTickets((data ?? []) as Ticket[]);

    const { data: noteRows } = await supabase
      .from("support_ticket_notes")
      .select("id,ticket_id,body,created_at")
      .order("created_at", { ascending: true });
    const grouped: Record<string, Note[]> = {};
    (noteRows ?? []).forEach((n) => {
      const row = n as Note;
      (grouped[row.ticket_id] ||= []).push(row);
    });
    setNotes(grouped);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(t: Ticket, status: string) {
    setBusy(t.id);
    const patch: Record<string, string | null> = { status, updated_at: new Date().toISOString() };
    if (status === "resolved" || status === "closed") patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("support_tickets").update(patch).eq("id", t.id);
    setBusy(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  }

  async function addNote(t: Ticket) {
    const body = (drafts[t.id] ?? "").trim();
    if (!body || !user) return;
    setBusy(t.id);
    const { error } = await supabase
      .from("support_ticket_notes")
      .insert({ ticket_id: t.id, author_id: user.id, body });
    if (!error && !t.first_response_at) {
      await supabase
        .from("support_tickets")
        .update({ first_response_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", t.id);
    }
    setBusy(null);
    if (error) {
      toast({ title: "Couldn't save reply", description: error.message, variant: "destructive" });
      return;
    }
    setDrafts((d) => ({ ...d, [t.id]: "" }));
    await load();
  }

  if (tickets == null) return <AdminListSkeleton />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Support queue</h1>
        <p className="text-sm text-muted-foreground">
          {tickets.filter((t) => t.status === "open").length} open ·{" "}
          {tickets.length} total. Message content is confidential and only shown here.
        </p>
      </div>

      {tickets.length === 0 && <p className="text-sm text-muted-foreground">No tickets yet.</p>}

      {tickets.map((t) => (
        <Card key={t.id} className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium tabular-nums">{t.reference}</span>
            <span className="text-muted-foreground">
              {t.category} · age {ageLabel(t.created_at)} · email {t.email_status}
              {t.program_day ? ` · day ${t.program_day}` : ""}
            </span>
            <ResponsiveSelect
              value={t.status}
              onValueChange={(v) => setStatus(t, v)}
              title="Status"
              options={STATUSES.map((s) => ({ value: s, label: s.replace("_", " ") }))}
            />
          </div>

          <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-md p-3">{t.message}</p>
          {t.page_context && (
            <p className="text-xs text-muted-foreground">Page: {t.page_context}</p>
          )}

          {(notes[t.id] ?? []).map((n) => (
            <p key={n.id} className="text-sm border-l-2 border-primary pl-3">
              {n.body}
              <span className="block text-[11px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </span>
            </p>
          ))}

          <div className="flex gap-2">
            <Textarea
              rows={2}
              value={drafts[t.id] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
              placeholder="Internal reply / note…"
            />
            <Button onClick={() => addNote(t)} disabled={busy === t.id || !(drafts[t.id] ?? "").trim()}>
              Save
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
