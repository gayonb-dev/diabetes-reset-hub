import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Shield, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LogRow {
  id: string;
  accessed_at: string;
  actor_user_id: string | null;
  actor_kind: string;
  table_name: string;
  row_id: string | null;
  reason: string;
  visitor_profile_id: string | null;
}

export default function AdminPhiLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("phi_access_log")
      .select("*")
      .order("accessed_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setRows((data ?? []) as LogRow[]);
        setLoading(false);
      });
  }, []);

  const filtered = rows.filter((r) => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (
      r.reason?.toLowerCase().includes(f) ||
      r.actor_kind.toLowerCase().includes(f) ||
      r.table_name.toLowerCase().includes(f) ||
      r.actor_user_id?.toLowerCase().includes(f)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            PHI access audit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every read or purge of protected health information. Most recent first.
          </p>
        </div>
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by reason, table, actor…"
          className="max-w-xs"
        />
      </div>

      <Card className="overflow-hidden border-border">
        {loading ? (
          <div className="p-8 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading audit log…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No matching entries.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">When</th>
                  <th className="text-left px-4 py-2">Actor</th>
                  <th className="text-left px-4 py-2">Table</th>
                  <th className="text-left px-4 py-2">Reason</th>
                  <th className="text-left px-4 py-2">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(r.accessed_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary mr-2">
                        {r.actor_kind}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {r.actor_user_id?.slice(0, 8) ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{r.table_name}</td>
                    <td className="px-4 py-2">{r.reason}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {r.visitor_profile_id?.slice(0, 8) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="px-4 py-3 text-[11px] text-muted-foreground bg-muted/20 border-t">
          Showing {filtered.length} of {rows.length} entries (last 500).
        </p>
      </Card>
    </div>
  );
}
