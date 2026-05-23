import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Log {
  id: string;
  log_date: string;
  weight: number | null;
  blood_sugar: number | null;
  energy: number | null;
  notes: string | null;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ProgressPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [weight, setWeight] = useState("");
  const [bs, setBs] = useState("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("health_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("log_date", { ascending: false })
      .limit(30);
    const arr = (data || []) as Log[];
    setLogs(arr);
    const today = arr.find((l) => l.log_date === todayISO());
    if (today) {
      setWeight(today.weight?.toString() ?? "");
      setBs(today.blood_sugar?.toString() ?? "");
      setEnergy(today.energy);
      setNotes(today.notes ?? "");
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("health_logs").upsert(
      {
        user_id: user.id,
        log_date: todayISO(),
        weight: weight ? Number(weight) : null,
        blood_sugar: bs ? Number(bs) : null,
        energy,
        notes: notes || null,
      },
      { onConflict: "user_id,log_date" },
    );
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });
    refresh();
  };

  // Simple sparkline for blood sugar trend (last 14 entries, oldest first)
  const trend = [...logs]
    .reverse()
    .filter((l) => l.blood_sugar != null)
    .slice(-14);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-semibold text-2xl text-foreground">Progress</h1>
        <p className="text-sm text-muted-foreground">Log today's numbers. No judgment — just data.</p>
      </div>

      {/* Today's log */}
      <Card className="p-5 border border-border">
        <p className="text-sm font-medium text-foreground mb-4">Today, {new Date().toLocaleDateString()}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="weight" className="text-xs text-muted-foreground">Weight (lbs)</Label>
            <Input
              id="weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="—"
            />
          </div>
          <div>
            <Label htmlFor="bs" className="text-xs text-muted-foreground">Blood sugar (mg/dL)</Label>
            <Input
              id="bs"
              type="number"
              inputMode="numeric"
              value={bs}
              onChange={(e) => setBs(e.target.value)}
              placeholder="—"
            />
          </div>
        </div>

        <div className="mt-4">
          <Label className="text-xs text-muted-foreground">Energy level</Label>
          <div className="flex gap-2 mt-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setEnergy(n)}
                className={`h-10 w-10 rounded-md border text-sm font-medium transition-colors ${
                  energy === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:border-primary/40"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="notes" className="text-xs text-muted-foreground">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything you want to remember about today"
          />
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save today
        </Button>
      </Card>

      {/* Trend */}
      {trend.length >= 2 && (
        <Card className="p-5 border border-border">
          <p className="text-sm font-medium text-foreground mb-3">Blood sugar trend</p>
          <Sparkline values={trend.map((t) => t.blood_sugar!)} />
          <p className="text-xs text-muted-foreground mt-2">
            Last {trend.length} entries · {Math.min(...trend.map(t=>t.blood_sugar!))} – {Math.max(...trend.map(t=>t.blood_sugar!))} mg/dL
          </p>
        </Card>
      )}

      {/* History */}
      <Card className="p-5 border border-border">
        <p className="text-sm font-medium text-foreground mb-3">Recent entries</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((l) => (
              <div key={l.id} className="py-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground w-24">
                  {new Date(l.log_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span className="flex-1 text-foreground">
                  {l.weight != null && <span className="mr-3">{l.weight} lbs</span>}
                  {l.blood_sugar != null && <span className="mr-3">{l.blood_sugar} mg/dL</span>}
                  {l.energy != null && <span className="text-muted-foreground">energy {l.energy}/5</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 320;
  const h = 60;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 8) - 4}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16">
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
