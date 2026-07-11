import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EmptyState from "@/components/ui/empty-state";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const SITE_COLORS: Record<string, string> = {
  waist: "hsl(var(--ring-water))",
  hips: "hsl(var(--ring-food))",
  chest: "hsl(var(--ring-exercise))",
  thigh: "hsl(var(--ring-mindset))",
  arm: "hsl(var(--primary))",
  neck: "hsl(var(--accent))",
};

const SITES = [
  { k: "waist", label: "Waist" },
  { k: "hips", label: "Hips" },
  { k: "chest", label: "Chest" },
  { k: "thigh", label: "Thigh (R)" },
  { k: "arm", label: "Arm (R)" },
  { k: "neck", label: "Neck" },
] as const;

type SiteKey = (typeof SITES)[number]["k"];
type Entry = {
  id: string;
  logged_on: string;
  values: Partial<Record<SiteKey, number>>;
};

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export default function MeasurementsTab() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [values, setValues] = useState<Partial<Record<SiteKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("member_measurements")
      .select("id, measured_at, waist, hips, chest, thigh, arm, neck")
      .eq("member_id", user.id)
      .order("measured_at", { ascending: false })
      .limit(24);
    if (error) {
      console.error("load measurements failed", error);
    }
    const arr: Entry[] = (data ?? []).map((r) => {
      const values: Partial<Record<SiteKey, number>> = {};
      for (const s of SITES) {
        const v = (r as unknown as Record<string, number | null>)[s.k];
        if (v != null) values[s.k] = Number(v);
      }
      return { id: r.id as string, logged_on: r.measured_at as string, values };
    });
    setEntries(arr);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const save = async () => {
    if (!user) return;
    const row: Record<string, number | string | null> = { member_id: user.id };
    let count = 0;
    for (const s of SITES) {
      const v = parseFloat(values[s.k] ?? "");
      if (!isNaN(v) && v > 0) {
        row[s.k] = v;
        count++;
      }
    }
    if (count === 0) {
      toast({ title: "Enter at least one measurement", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("member_measurements").insert(row as never);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Measurements saved" });
    setValues({});
    refresh();
  };

  const groupedByMonth = new Map<string, Entry>();
  for (const e of entries) {
    const k = monthKey(e.logged_on);
    if (!groupedByMonth.has(k)) groupedByMonth.set(k, e);
  }
  const months = [...groupedByMonth.entries()].slice(0, 2);
  const thisMonth = months[0]?.[1];
  const lastMonth = months[1]?.[1];

  function delta(site: SiteKey) {
    const a = thisMonth?.values[site];
    const b = lastMonth?.values[site];
    if (a == null || b == null) return null;
    return a - b;
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 border border-border">
        <p className="text-sm font-medium mb-1">Log new measurements (inches)</p>
        <p className="text-xs text-muted-foreground mb-3">
          Take measurements monthly, first thing in the morning. Be consistent with placement.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SITES.map((s) => (
            <div key={s.k}>
              <Label className="text-xs text-muted-foreground">{s.label}</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={values[s.k] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [s.k]: e.target.value }))}
                placeholder="—"
              />
            </div>
          ))}
        </div>
        <Button
          onClick={save}
          disabled={saving}
          className="mt-4 w-full h-[52px] bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save measurements
        </Button>
      </Card>

      {thisMonth && lastMonth && (
        <Card className="p-5 border border-border">
          <p className="text-sm font-medium mb-3">This month vs. last month</p>
          <div className="divide-y divide-border">
            {SITES.map((s) => {
              const d = delta(s.k);
              if (d == null) return null;
              const improved = d < 0;
              return (
                <div key={s.k} className="py-2 flex items-center justify-between text-sm">
                  <span>{s.label}</span>
                  <span className={improved ? "text-status-normal font-medium" : "text-muted-foreground"}>
                    {improved ? "↓" : "↑"} {Math.abs(d).toFixed(1)}"
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {entries.length >= 2 && (
        <Card className="p-5 border border-border">
          <p className="text-sm font-medium mb-3">Measurement trends</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={[...entries].reverse().map((e) => {
                  const row: Record<string, number | string> = {
                    date: new Date(e.logged_on).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                  };
                  for (const s of SITES) if (e.values[s.k] != null) row[s.k] = e.values[s.k]!;
                  return row;
                })}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} minTickGap={20} label={{ value: "Date", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={36} label={{ value: "inches", angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "hsl(var(--popover-foreground))",
                  }}
                  formatter={(v: number, name: string) => {
                    const site = SITES.find((s) => s.k === name);
                    return [`${v}"`, site?.label ?? name];
                  }}
                  labelFormatter={(l) => `Date: ${l}`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {SITES.map((s) => (
                  <Line
                    key={s.k}
                    type="monotone"
                    dataKey={s.k}
                    name={s.label}
                    stroke={SITE_COLORS[s.k]}
                    strokeWidth={2}
                    isAnimationActive={true}
                    animationDuration={800}
                    dot={{ r: 2, fill: SITE_COLORS[s.k] }}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="p-5 border border-border">
        <p className="text-sm font-medium mb-3">History</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <EmptyState
            title="No measurements yet"
            description="Measurement day comes once a month. The tape tells a story the scale misses."
            posture="encouraging"
          />
        ) : (
          <div className="divide-y divide-border">
            {entries.map((e) => (
              <div key={e.id} className="py-3 text-sm">
                <p className="font-medium text-foreground mb-1">
                  {new Date(e.logged_on).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                  {SITES.map(
                    (s) =>
                      e.values[s.k] != null && (
                        <span key={s.k}>
                          {s.label}: <span className="text-foreground font-medium">{e.values[s.k]}"</span>
                        </span>
                      ),
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
