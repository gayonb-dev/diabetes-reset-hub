import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EmptyState from "@/components/ui/empty-state";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface A1C {
  id: string;
  value_percent: number;
  value_mmol_mol: number | null;
  measured_on: string;
  source: string | null;
}

// % → mmol/mol IFCC: (% - 2.15) * 10.929
const pctToMmolMol = (p: number) => Math.round((p - 2.15) * 10.929);

function tone(p: number) {
  if (p < 5.7) return "hsl(var(--status-normal))";
  if (p < 6.5) return "hsl(var(--status-warning))";
  return "hsl(var(--status-danger))";
}

export default function A1CTab() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<A1C[]>([]);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("a1c_logs")
      .select("*")
      .eq("member_id", user.id)
      .order("measured_on", { ascending: false });
    setLogs((data as A1C[]) || []);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const save = async () => {
    if (!user) return;
    const p = parseFloat(value);
    if (isNaN(p) || p < 3 || p > 20) {
      toast({ title: "Enter a valid A1C %", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("a1c_logs").insert({
      member_id: user.id,
      value_percent: p,
      value_mmol_mol: pctToMmolMol(p),
      measured_on: date,
      source: source || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "A1C logged" });
    setValue("");
    setSource("");
    refresh();
  };

  const latest = logs[0];
  const latestBelow65 = latest && latest.value_percent < 6.5;

  return (
    <div className="space-y-5">
      {latestBelow65 && (
        <Card className="p-4 border-2 border-accent bg-accent-muted">
          <p className="text-sm leading-relaxed">
            Your latest A1C is {latest.value_percent.toFixed(1)}% — below the diabetic threshold of 6.5%. Bring
            this to your doctor and ask: <em>"Given these numbers, is my current medication dosage still the
            right fit?"</em>
          </p>
          <p className="text-[11px] text-tertiary-fg mt-2">
            This app does not provide medical advice. Never adjust or stop any medication without consulting
            your healthcare provider.
          </p>
        </Card>
      )}

      <Card className="p-5 border border-border">
        <p className="text-sm font-medium mb-3">Log an A1C result</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">A1C (%)</Label>
            <Input type="number" inputMode="decimal" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 6.2" />
            {value && !isNaN(parseFloat(value)) && (
              <p className="text-[10px] text-tertiary-fg mt-1">≈ {pctToMmolMol(parseFloat(value))} mmol/mol</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Doctor / clinic (optional)</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="—" />
          </div>
        </div>

        {/* Reference scale */}
        <div className="mt-4">
          <div className="relative h-3 rounded-full overflow-hidden bg-muted">
            <div className="absolute inset-y-0 left-0 bg-status-normal" style={{ width: "57%" }} />
            <div className="absolute inset-y-0 bg-status-warning" style={{ left: "57%", width: "8%" }} />
            <div className="absolute inset-y-0 bg-status-danger" style={{ left: "65%", width: "35%" }} />
            {value && !isNaN(parseFloat(value)) && (
              <div
                className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-white shadow"
                style={{
                  left: `calc(${Math.min(Math.max((parseFloat(value) / 10) * 100, 0), 100)}% - 10px)`,
                  background: tone(parseFloat(value)),
                }}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-tertiary-fg mt-1">
            <span>Non-diabetic &lt;5.7%</span>
            <span>Pre 5.7–6.4%</span>
            <span>Diabetic ≥6.5%</span>
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save A1C
        </Button>
      </Card>

      <Card className="p-5 border border-border">
        <p className="text-sm font-medium mb-3">A1C history</p>
        {logs.length === 0 ? (
          <EmptyState
            title="No A1C on file yet"
            description="Your first A1C result anchors everything. Enter it when you have it."
            posture="encouraging"
          />
        ) : (
          <>
            {logs.length >= 2 && (
              <div className="h-56 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[...logs].reverse().map((l) => ({
                      date: new Date(l.measured_on).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" }),
                      value: Number(l.value_percent.toFixed(1)),
                    }))}
                    margin={{ top: 8, right: 20, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} minTickGap={20} label={{ value: "Date", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={36} domain={["dataMin - 0.5", "dataMax + 0.5"]} label={{ value: "%", angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "hsl(var(--popover-foreground))",
                      }}
                      formatter={(v: number) => [`${v}%`, "A1C"]}
                      labelFormatter={(l) => `Date: ${l}`}
                    />
                    <ReferenceLine y={5.7} stroke="hsl(var(--status-normal))" strokeDasharray="4 4" label={{ value: "5.7% Pre-diabetic", fill: "hsl(var(--status-normal))", fontSize: 10, position: "insideTopRight" }} />
                    <ReferenceLine y={6.5} stroke="hsl(var(--status-danger))" strokeDasharray="4 4" label={{ value: "6.5% Diabetic", fill: "hsl(var(--status-danger))", fontSize: 10, position: "insideTopRight" }} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} isAnimationActive={true} animationDuration={800} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="divide-y divide-border">
              {logs.map((l) => (
                <div key={l.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground w-28">
                    {new Date(l.measured_on).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="font-semibold" style={{ color: tone(l.value_percent) }}>
                    {l.value_percent.toFixed(1)}%
                    {l.value_mmol_mol != null && (
                      <span className="text-tertiary-fg font-normal ml-2 text-xs">({l.value_mmol_mol} mmol/mol)</span>
                    )}
                  </span>
                  <span className="text-xs text-tertiary-fg w-32 text-right truncate">{l.source ?? ""}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-[11px] text-tertiary-fg mt-4">
          A1C results should always be interpreted with your healthcare provider. This app does not provide
          medical advice. Never adjust or stop any medication based on this app's data without consulting your
          doctor.
        </p>
      </Card>
    </div>
  );
}
