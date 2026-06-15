import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

interface DayRings {
  water: boolean;
  food: boolean;
  exercise: boolean;
  mindset: boolean;
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function ringColor(count: number) {
  if (count === 4) return "#085041";
  if (count >= 2) return "#E8A029";
  if (count === 1) return "rgba(232,160,41,0.4)";
  return "#F4F1EC";
}

export default function HabitsTab() {
  const { user } = useAuth();
  const [days, setDays] = useState<Map<string, DayRings>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const sinceISO = since.toISOString();

      const waterRes = await supabase.from("water_logs").select("logged_at").eq("user_id", user.id).gte("logged_at", sinceISO);
      const mealRes = await supabase.from("meal_logs").select("logged_at").eq("member_id", user.id).gte("logged_at", sinceISO);
      const workoutRes = await supabase
        .from("workout_sessions")
        .select("completed_at")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("completed_at", sinceISO);
      const mindsetRes = await supabase.from("mindset_reads").select("read_at").eq("member_id", user.id).gte("read_at", sinceISO);
      const streakRes = await supabase.from("user_streaks").select("current_streak, longest_streak").eq("user_id", user.id).maybeSingle();

      const map = new Map<string, DayRings>();
      const ensure = (k: string) => {
        if (!map.has(k)) map.set(k, { water: false, food: false, exercise: false, mindset: false });
        return map.get(k)!;
      };
      (waterRes.data || []).forEach((r: any) => { ensure(r.logged_at.slice(0, 10)).water = true; });
      (mealRes.data || []).forEach((r: any) => { ensure(r.logged_at.slice(0, 10)).food = true; });
      (workoutRes.data || []).forEach((r: any) => { if (r.completed_at) ensure(r.completed_at.slice(0, 10)).exercise = true; });
      (mindsetRes.data || []).forEach((r: any) => { if (r.read_at) ensure(r.read_at.slice(0, 10)).mindset = true; });

      setDays(map);
      setStreak({
        current: streakRes.data?.current_streak ?? 0,
        longest: streakRes.data?.longest_streak ?? 0,
      });
      setLoading(false);
    })();
  }, [user]);

  const cells = useMemo(() => {
    const arr: { date: Date; key: string; count: number; rings: DayRings | null }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = dateKey(d);
      const rings = days.get(key) ?? null;
      const count = rings ? Number(rings.water) + Number(rings.food) + Number(rings.exercise) + Number(rings.mindset) : 0;
      arr.push({ date: d, key, count, rings });
    }
    return arr;
  }, [days]);

  const compliantDays = cells.filter((c) => c.count >= 3).length;
  const totalDays = cells.length;
  const selectedRings = selected ? days.get(selected) : null;

  if (loading) {
    return <Card className="p-5 border border-border"><p className="text-sm text-muted-foreground">Loading…</p></Card>;
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 border border-border">
        <p className="text-sm font-medium mb-3">Last 90 days</p>
        <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1.5">
          {cells.map((c) => (
            <button
              key={c.key}
              onClick={() => setSelected(c.key)}
              className="aspect-square rounded-sm hover:ring-2 hover:ring-primary/40 transition-all"
              style={{ background: ringColor(c.count) }}
              aria-label={`${c.date.toLocaleDateString()} — ${c.count} of 4 rings`}
              title={`${c.date.toLocaleDateString()} · ${c.count}/4 rings`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-4 text-[11px] text-tertiary-fg">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm" style={{ background: "#F4F1EC" }} /> None</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm" style={{ background: "rgba(232,160,41,0.4)" }} /> 1</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm" style={{ background: "#E8A029" }} /> 2–3</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm" style={{ background: "#085041" }} /> 4</span>
        </div>
      </Card>

      {selected && (
        <Card className="p-4 border-2 border-primary/30">
          <p className="text-sm font-medium mb-2">
            {new Date(selected).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </p>
          {selectedRings ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <RingItem label="Water" on={selectedRings.water} color="#2196F3" />
              <RingItem label="Food" on={selectedRings.food} color="#085041" />
              <RingItem label="Exercise" on={selectedRings.exercise} color="#E8A029" />
              <RingItem label="Mindset" on={selectedRings.mindset} color="#7C5CBF" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing logged this day.</p>
          )}
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Current streak" value={`${streak.current}d`} />
        <StatCard label="Longest streak" value={`${streak.longest}d`} />
        <StatCard label="Compliant days" value={`${compliantDays}`} sub="3+ rings" />
        <StatCard label="Days in window" value={`${totalDays}`} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-3 border border-border text-center">
      <p className="text-2xl font-bold text-primary tabular-nums">{value}</p>
      <p className="text-[11px] text-tertiary-fg">{label}</p>
      {sub && <p className="text-[10px] text-tertiary-fg">{sub}</p>}
    </Card>
  );
}

function RingItem({ label, on, color }: { label: string; on: boolean; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-3.5 w-3.5 rounded-full"
        style={{ background: on ? color : "transparent", border: `2px solid ${on ? color : "#F4F1EC"}` }}
      />
      <span className={on ? "text-foreground font-medium" : "text-tertiary-fg"}>{label}</span>
    </div>
  );
}
