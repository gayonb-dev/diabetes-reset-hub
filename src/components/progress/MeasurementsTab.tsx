import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SITES = [
  { k: "waist", label: "Waist" },
  { k: "hips", label: "Hips" },
  { k: "chest", label: "Chest" },
  { k: "thigh", label: "Thigh (R)" },
  { k: "arm", label: "Arm (R)" },
  { k: "neck", label: "Neck" },
] as const;

type SiteKey = (typeof SITES)[number]["k"];
type Entry = { id: string; logged_on: string; values: Partial<Record<SiteKey, number>> };

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
    const { data } = await supabase
      .from("member_progress")
      .select("id, completed_at, metadata")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(24);
    const arr: Entry[] = (data || [])
      .filter((r: any) => r.metadata && r.metadata.measurements)
      .map((r: any) => ({
        id: r.id,
        logged_on: r.completed_at,
        values: r.metadata.measurements,
      }));
    setEntries(arr);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const save = async () => {
    if (!user) return;
    const filled: Partial<Record<SiteKey, number>> = {};
    for (const s of SITES) {
      const v = parseFloat(values[s.k] ?? "");
      if (!isNaN(v) && v > 0) filled[s.k] = v;
    }
    if (Object.keys(filled).length === 0) {
      toast({ title: "Enter at least one measurement", variant: "destructive" });
      return;
    }
    setSaving(true);
    // Use a synthetic day number to satisfy unique key (use day-of-program approximation: today's epoch days)
    const dayNumber = Math.floor(Date.now() / 86400000);
    const { error } = await supabase.from("member_progress").upsert(
      {
        user_id: user.id,
        day_number: dayNumber,
        metadata: { measurements: filled, kind: "measurement" },
      },
      { onConflict: "user_id,day_number" },
    );
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Measurements saved" });
    setValues({});
    refresh();
  };

  // Latest two months comparison
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

      <Card className="p-5 border border-border">
        <p className="text-sm font-medium mb-3">History</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No measurements logged yet.</p>
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
