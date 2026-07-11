import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type BSRow = { measured_at: string; value_mgdl: number; reading_type: string };
type A1CRow = { measured_on: string; value_percent: number };
type WeightRow = { log_date: string; weight: number | null };
type MRow = {
  measured_at: string;
  waist: number | null;
  hips: number | null;
  chest: number | null;
  thigh: number | null;
  arm: number | null;
  neck: number | null;
};

export default function ProgressReport() {
  const { user } = useAuth();
  const [range, setRange] = useState<30 | 90>(90);
  const [firstName, setFirstName] = useState<string>("");
  const [bs, setBs] = useState<BSRow[]>([]);
  const [a1c, setA1c] = useState<A1CRow[]>([]);
  const [weight, setWeight] = useState<WeightRow[]>([]);
  const [measurements, setMeasurements] = useState<MRow[]>([]);
  const [compliance, setCompliance] = useState<{
    daysLogged: number;
    currentStreak: number;
    longestStreak: number;
    plateMeals: number;
    walkCount: number;
    mindsetCount: number;
  }>({ daysLogged: 0, currentStreak: 0, longestStreak: 0, plateMeals: 0, walkCount: 0, mindsetCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - range);
      const sinceIso = since.toISOString();
      const sinceDate = sinceIso.slice(0, 10);

      const [profRes, bsRes, a1cRes, wRes, mRes, streakRes, mealRes, walkRes, mindsetRes] = await Promise.all([
        supabase.from("profiles").select("first_name").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("blood_sugar_readings")
          .select("measured_at, value_mgdl, reading_type")
          .eq("member_id", user.id)
          .gte("measured_at", sinceIso)
          .order("measured_at", { ascending: true }),
        supabase
          .from("a1c_logs")
          .select("measured_on, value_percent")
          .eq("member_id", user.id)
          .order("measured_on", { ascending: true }),
        supabase
          .from("health_logs")
          .select("log_date, weight")
          .eq("user_id", user.id)
          .gte("log_date", sinceDate)
          .not("weight", "is", null)
          .order("log_date", { ascending: true }),
        supabase
          .from("member_measurements")
          .select("measured_at, waist, hips, chest, thigh, arm, neck")
          .eq("member_id", user.id)
          .order("measured_at", { ascending: false })
          .limit(6),
        supabase.from("user_streaks").select("current_streak, longest_streak").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("meal_logs")
          .select("log_date, vegetables, protein, complex_carbs")
          .eq("member_id", user.id)
          .gte("log_date", sinceDate),
        supabase
          .from("post_meal_walks")
          .select("log_date")
          .eq("member_id", user.id)
          .gte("log_date", sinceDate),
        supabase
          .from("mindset_reads")
          .select("log_date")
          .eq("member_id", user.id)
          .gte("log_date", sinceDate),
      ]);

      if (cancelled) return;
      setFirstName((profRes.data as { first_name?: string } | null)?.first_name ?? "");
      setBs((bsRes.data ?? []) as BSRow[]);
      setA1c((a1cRes.data ?? []) as A1CRow[]);
      setWeight((wRes.data ?? []) as WeightRow[]);
      setMeasurements((mRes.data ?? []) as MRow[]);

      const meals = (mealRes.data ?? []) as { log_date: string; vegetables: boolean; protein: boolean; complex_carbs: boolean }[];
      const plateMeals = meals.filter((m) => m.vegetables && m.protein && m.complex_carbs).length;
      const daysLogged = new Set(meals.map((m) => m.log_date)).size;
      const walkCount = (walkRes.data ?? []).length;
      const mindsetCount = (mindsetRes.data ?? []).length;
      const streak = (streakRes.data as { current_streak?: number; longest_streak?: number } | null) ?? {};
      setCompliance({
        daysLogged,
        currentStreak: streak.current_streak ?? 0,
        longestStreak: streak.longest_streak ?? 0,
        plateMeals,
        walkCount,
        mindsetCount,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, range]);

  const bsAverages = useMemo(() => {
    const groups: Record<string, number[]> = { fasting: [], post_meal: [], bedtime: [], other: [] };
    for (const r of bs) (groups[r.reading_type] ?? groups.other).push(r.value_mgdl);
    const avg = (a: number[]) => (a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null);
    return {
      fasting: avg(groups.fasting),
      post_meal: avg(groups.post_meal),
      bedtime: avg(groups.bedtime),
    };
  }, [bs]);

  const bsChart = useMemo(
    () => bs.map((r) => ({ date: r.measured_at.slice(0, 10), value: r.value_mgdl, type: r.reading_type })),
    [bs],
  );

  const weightChart = useMemo(
    () => weight.map((w) => ({ date: w.log_date, weight: Number(w.weight) })),
    [weight],
  );

  const reportDate = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-white text-slate-900 print:bg-white">
      {/* Sticky action bar — hidden on print */}
      <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/app/progress" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Progress
          </Link>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-slate-300 overflow-hidden text-sm">
              <button
                onClick={() => setRange(30)}
                className={`px-3 py-1.5 ${range === 30 ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
              >
                30 days
              </button>
              <button
                onClick={() => setRange(90)}
                className={`px-3 py-1.5 border-l border-slate-300 ${range === 90 ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
              >
                90 days
              </button>
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 text-white text-sm px-3 py-1.5 hover:bg-slate-800"
            >
              <Printer className="h-4 w-4" /> Print / Save as PDF
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8 print:px-4 print:py-4">
        {/* Header */}
        <header className="border-b border-slate-200 pb-4 report-section">
          <h1 className="text-2xl font-semibold">Diabetes Reset Method — Progress Report</h1>
          <p className="text-sm text-slate-600 mt-1">
            {firstName ? `${firstName} · ` : ""}Report date: {reportDate} · Range: last {range} days
          </p>
        </header>

        {loading && <p className="text-sm text-slate-500">Loading…</p>}

        {/* Blood sugar */}
        <section className="report-section">
          <h2 className="text-lg font-semibold mb-2">Blood sugar</h2>
          <div className="grid grid-cols-3 gap-3 text-sm mb-3">
            <Stat label="Avg fasting" value={bsAverages.fasting != null ? `${bsAverages.fasting} mg/dL` : "—"} />
            <Stat label="Avg post-meal" value={bsAverages.post_meal != null ? `${bsAverages.post_meal} mg/dL` : "—"} />
            <Stat label="Avg bedtime" value={bsAverages.bedtime != null ? `${bsAverages.bedtime} mg/dL` : "—"} />
          </div>
          {bsChart.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bsChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[40, 300]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  {/* Normal fasting band 70–130 */}
                  <ReferenceArea y1={70} y2={130} strokeOpacity={0} fill="#10b981" fillOpacity={0.08} />
                  {/* Post-meal target <180 */}
                  <ReferenceArea y1={130} y2={180} strokeOpacity={0} fill="#f59e0b" fillOpacity={0.06} />
                  <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={1.5} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No blood sugar readings in this range.</p>
          )}
          <p className="text-[11px] text-slate-500 mt-2">
            Reference bands: fasting 70–130 mg/dL (green), post-meal &lt; 180 mg/dL (amber).
          </p>

          {bs.length > 0 && (
            <table className="w-full text-xs mt-4 border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-2 py-1 border-b border-slate-200">Date</th>
                  <th className="text-left px-2 py-1 border-b border-slate-200">Type</th>
                  <th className="text-right px-2 py-1 border-b border-slate-200">mg/dL</th>
                </tr>
              </thead>
              <tbody>
                {bs.slice(-20).reverse().map((r, i) => (
                  <tr key={i} className="odd:bg-white even:bg-slate-50">
                    <td className="px-2 py-1 border-b border-slate-100">{r.measured_at.slice(0, 10)}</td>
                    <td className="px-2 py-1 border-b border-slate-100">{r.reading_type}</td>
                    <td className="px-2 py-1 border-b border-slate-100 text-right">{r.value_mgdl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* A1C */}
        <section className="report-section">
          <h2 className="text-lg font-semibold mb-2">A1C history</h2>
          {a1c.length > 0 ? (
            <table className="w-full text-xs border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-2 py-1 border-b border-slate-200">Date</th>
                  <th className="text-right px-2 py-1 border-b border-slate-200">A1C %</th>
                </tr>
              </thead>
              <tbody>
                {a1c.map((r, i) => (
                  <tr key={i} className="odd:bg-white even:bg-slate-50">
                    <td className="px-2 py-1 border-b border-slate-100">{r.measured_on}</td>
                    <td className="px-2 py-1 border-b border-slate-100 text-right">{Number(r.value_percent).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500">No A1C entries logged.</p>
          )}
        </section>

        {/* Weight */}
        <section className="report-section">
          <h2 className="text-lg font-semibold mb-2">Weight trend</h2>
          {weightChart.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" stroke="#0f172a" strokeWidth={1.5} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No weight entries in this range.</p>
          )}
        </section>

        {/* Measurements */}
        <section className="report-section">
          <h2 className="text-lg font-semibold mb-2">Measurements</h2>
          {measurements.length > 0 ? (
            <table className="w-full text-xs border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-2 py-1 border-b border-slate-200">Date</th>
                  <th className="text-right px-2 py-1 border-b border-slate-200">Waist</th>
                  <th className="text-right px-2 py-1 border-b border-slate-200">Hips</th>
                  <th className="text-right px-2 py-1 border-b border-slate-200">Chest</th>
                  <th className="text-right px-2 py-1 border-b border-slate-200">Thigh</th>
                  <th className="text-right px-2 py-1 border-b border-slate-200">Arm</th>
                  <th className="text-right px-2 py-1 border-b border-slate-200">Neck</th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m, i) => (
                  <tr key={i} className="odd:bg-white even:bg-slate-50">
                    <td className="px-2 py-1 border-b border-slate-100">{m.measured_at.slice(0, 10)}</td>
                    <td className="px-2 py-1 border-b border-slate-100 text-right">{m.waist ?? "—"}</td>
                    <td className="px-2 py-1 border-b border-slate-100 text-right">{m.hips ?? "—"}</td>
                    <td className="px-2 py-1 border-b border-slate-100 text-right">{m.chest ?? "—"}</td>
                    <td className="px-2 py-1 border-b border-slate-100 text-right">{m.thigh ?? "—"}</td>
                    <td className="px-2 py-1 border-b border-slate-100 text-right">{m.arm ?? "—"}</td>
                    <td className="px-2 py-1 border-b border-slate-100 text-right">{m.neck ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500">No measurements logged yet.</p>
          )}
        </section>

        {/* Compliance */}
        <section className="report-section">
          <h2 className="text-lg font-semibold mb-2">Compliance summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Stat label="Days logged" value={String(compliance.daysLogged)} />
            <Stat label="Current streak" value={`${compliance.currentStreak} days`} />
            <Stat label="Longest streak" value={`${compliance.longestStreak} days`} />
            <Stat label="Plate-method meals" value={String(compliance.plateMeals)} />
            <Stat label="Post-meal walks" value={String(compliance.walkCount)} />
            <Stat label="Mindset reads" value={String(compliance.mindsetCount)} />
          </div>
        </section>

        <footer className="pt-6 border-t border-slate-200 text-xs text-slate-500">
          Generated by The Diabetes Reset Method — educational program, not medical advice.
        </footer>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 rounded-md px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}
