/**
 * Batch 2 Part F, admin view of the coaching-interest list.
 *
 * Shows identity/email, consent timestamp, withdrawal state and status only.
 * There is no health narrative to display because none is collected.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminListSkeleton from "@/components/admin/AdminListSkeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Row {
  id: string;
  user_id: string;
  email: string;
  consented_at: string;
  withdrawn_at: string | null;
  status: string;
}

const STATUSES = ["interested", "withdrawn", "contacted", "closed"];

/**
 * The separate "Coaching Waitlist" admin page has been consolidated here.
 * The historical `coaching_waitlist` rows are no longer created by any live
 * surface (Settings writes to `coaching_interest`), so they are shown only on
 * request and still through the audited PHI read, `why_now` / `phone` are
 * PHI-adjacent.
 */
const LEGACY_STATUSES = ["pending", "contacted", "enrolled", "declined"];

interface LegacyRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  why_now: string | null;
  status: string;
  created_at: string;
}

export default function AdminCoachingInterest() {
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState<string>("all");
  const [legacy, setLegacy] = useState<LegacyRow[] | null>(null);
  const [legacyLoading, setLegacyLoading] = useState(false);

  const loadLegacy = async () => {
    setLegacyLoading(true);
    const { data, error } = await supabase.functions.invoke("read-phi-data", {
      body: {
        table: "coaching_waitlist",
        reason: "Admin coaching review (historical waitlist)",
        order_by: { column: "created_at", ascending: false },
      },
    });
    setLegacyLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLegacy(((data?.rows as LegacyRow[]) || []));
  };

  const updateLegacyStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("coaching_waitlist").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      void loadLegacy();
    }
  };

  const load = async () => {
    setState("loading");
    const { data, error } = await supabase
      .from("coaching_interest")
      .select("id, user_id, email, consented_at, withdrawn_at, status")
      .order("created_at", { ascending: false });
    if (error) {
      setState("error");
      toast.error(error.message);
      return;
    }
    setRows((data as Row[]) || []);
    setState("ready");
  };

  useEffect(() => {
    void load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("coaching_interest")
      .update({
        status,
        withdrawn_at: status === "withdrawn" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      void load();
    }
  };

  if (state === "loading") return <AdminListSkeleton rows={6} />;
  if (state === "error")
    return (
      <p className="text-sm text-destructive" role="status">
        Could not load the coaching-interest list. This is a load error, not an empty list.
      </p>
    );

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label htmlFor="ci-filter" className="text-sm text-muted-foreground">
          Status
        </label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger id="ci-filter" className="w-48" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground tabular-nums">
          {visible.length} record{visible.length === 1 ? "" : "s"}
        </p>
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground">No records match this filter.</p>
      )}

      {visible.map((r) => (
        <Card key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{r.email}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              Consented {new Date(r.consented_at).toLocaleString()}
              {r.withdrawn_at && ` · Withdrawn ${new Date(r.withdrawn_at).toLocaleString()}`}
            </p>
          </div>
          <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
            <SelectTrigger className="w-40" aria-label={`Status for ${r.email}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      ))}

      <section aria-labelledby="legacy-waitlist" className="pt-4 border-t border-border">
        <h2 id="legacy-waitlist" className="font-heading font-semibold text-foreground">
          Historical coaching waitlist
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Archived records from the retired waitlist form. No new rows are created here.
          Opening this list performs an audited PHI read.
        </p>
        {legacy === null ? (
          <Button
            variant="outline"
            className="mt-3 min-h-11"
            disabled={legacyLoading}
            onClick={() => void loadLegacy()}
          >
            {legacyLoading ? "Loading…" : "Show historical waitlist"}
          </Button>
        ) : legacy.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">No historical waitlist records.</p>
        ) : (
          <div className="space-y-3 mt-3">
            <p className="text-sm text-muted-foreground tabular-nums">
              {legacy.length} archived record{legacy.length === 1 ? "" : "s"}
            </p>
            {legacy.map((r) => (
              <Card key={r.id} className="p-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">{r.email}</p>
                  {r.phone && <p className="text-xs text-muted-foreground">{r.phone}</p>}
                  {r.why_now && (
                    <p className="text-xs italic text-muted-foreground mt-2">"{r.why_now}"</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 tabular-nums">
                    Joined {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Select value={r.status} onValueChange={(v) => updateLegacyStatus(r.id, v)}>
                  <SelectTrigger className="w-40" aria-label={`Status for ${r.email}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEGACY_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
