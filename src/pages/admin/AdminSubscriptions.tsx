import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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

/**
 * Batch 2 F21, billing metrics on the canonical order / subscription /
 * billing-event model. Orders, active subscriptions, cancellations, refunds,
 * disputes and payment failures are counted separately, stamped with an
 * as-of time, and a backend failure renders an error, never a fabricated
 * zero. No Stripe identifiers are surfaced that the screen does not need.
 */
type Metrics = {
  orders: number;
  activeSubscriptions: number;
  trialing: number;
  cancellations: number;
  refunds: number;
  disputes: number;
  paymentFailures: number;
};

const METRIC_LABELS: Record<keyof Metrics, string> = {
  orders: "Orders",
  activeSubscriptions: "Active subscriptions",
  trialing: "Trialing",
  cancellations: "Cancellations",
  refunds: "Refunds",
  disputes: "Disputes",
  paymentFailures: "Payment failures",
};

const REFUND_EVENTS = ["charge.refunded", "refund.updated"];
const DISPUTE_EVENTS = ["charge.dispute.created", "charge.dispute.closed"];
const FAILURE_EVENTS = ["invoice.payment_failed", "charge.failed"];

export default function AdminSubscriptions() {
  const [rows, setRows] = useState<Row[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<Date | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [subs, orders, refunds, disputes, failures] = await Promise.all([
        supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase
          .from("billing_events")
          .select("id", { count: "exact", head: true })
          .in("event_type", REFUND_EVENTS),
        supabase
          .from("billing_events")
          .select("id", { count: "exact", head: true })
          .in("event_type", DISPUTE_EVENTS),
        supabase
          .from("billing_events")
          .select("id", { count: "exact", head: true })
          .in("event_type", FAILURE_EVENTS),
      ]);
      if (cancelled) return;

      const firstError =
        subs.error || orders.error || refunds.error || disputes.error || failures.error;
      if (firstError) {
        setErrorMsg((firstError as { message?: string }).message ?? "Unknown backend error");
        setState("error");
        return;
      }

      const subRows = (subs.data as Row[]) || [];
      setRows(subRows);
      setMetrics({
        orders: orders.count ?? 0,
        activeSubscriptions: subRows.filter((r) => r.status === "active").length,
        trialing: subRows.filter((r) => r.status === "trialing").length,
        cancellations: subRows.filter(
          (r) => r.cancel_at_period_end || r.status === "cancelled",
        ).length,
        refunds: refunds.count ?? 0,
        disputes: disputes.count ?? 0,
        paymentFailures: failures.count ?? 0,
      });
      setAsOf(new Date());
      setState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = rows.filter(
    (r) => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
  );

  if (state === "loading") {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-12" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <Card className="p-5 border-destructive/40" role="status">
        <p className="text-sm font-medium text-destructive">
          Billing metrics could not be loaded.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          This is a backend error, not zero revenue. No figures are shown because none could be
          read. {errorMsg}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(METRIC_LABELS) as (keyof Metrics)[]).map((k) => (
          <Card key={k} className="p-4">
            <p className="text-xs uppercase text-muted-foreground font-semibold">
              {METRIC_LABELS[k]}
            </p>
            <p className="text-2xl font-heading font-bold tabular-nums">{metrics?.[k] ?? 0}</p>
          </Card>
        ))}
      </div>
      {asOf && (
        <p className="text-xs text-muted-foreground tabular-nums">
          As of {asOf.toLocaleString()}. Counts read directly from orders, subscriptions and the
          billing-event ledger.
        </p>
      )}

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
                  {r.trial_end_date ? new Date(r.trial_end_date).toLocaleDateString() : ", "}
                </td>
                <td className="p-3 text-xs">
                  {r.current_period_end ? new Date(r.current_period_end).toLocaleDateString() : ", "}
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
