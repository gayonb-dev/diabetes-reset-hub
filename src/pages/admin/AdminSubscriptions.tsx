import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface Row {
  id: string;
  user_id: string;
  status: string;
  tier: string;
  trial_end_date: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  day_number: number;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  trialing: "bg-secondary text-secondary-foreground",
  active: "bg-primary/10 text-primary",
  past_due: "bg-orange-100 text-orange-700",
  cancelled: "bg-muted text-muted-foreground",
  incomplete: "bg-muted text-muted-foreground",
  unpaid: "bg-destructive/10 text-destructive",
};

export default function AdminSubscriptions() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as Row[]) || []);
        setLoading(false);
      });
  }, []);

  const filtered = rows.filter(
    (r) => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
  );

  const stats = {
    total: rows.length,
    trialing: rows.filter((r) => r.status === "trialing").length,
    active: rows.filter((r) => r.status === "active").length,
    cancelling: rows.filter((r) => r.cancel_at_period_end).length,
  };

  if (loading) return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mt-12" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(stats).map(([k, v]) => (
          <Card key={k} className="p-4">
            <p className="text-xs uppercase text-muted-foreground font-semibold">{k}</p>
            <p className="text-2xl font-heading font-bold">{v}</p>
          </Card>
        ))}
      </div>

      <Input
        placeholder="Search subscriptions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">User ID</th>
              <th className="p-3">Status</th>
              <th className="p-3">Tier</th>
              <th className="p-3">Day</th>
              <th className="p-3">Trial End</th>
              <th className="p-3">Period End</th>
              <th className="p-3">Cancel?</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[r.status] || "bg-muted"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-3">{r.tier}</td>
                <td className="p-3">{r.day_number}</td>
                <td className="p-3 text-xs">
                  {r.trial_end_date ? new Date(r.trial_end_date).toLocaleDateString() : "—"}
                </td>
                <td className="p-3 text-xs">
                  {r.current_period_end ? new Date(r.current_period_end).toLocaleDateString() : "—"}
                </td>
                <td className="p-3">{r.cancel_at_period_end ? "Yes" : "No"}</td>
                <td className="p-3 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No subscriptions yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
