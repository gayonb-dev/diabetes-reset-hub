import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

interface LedgerEntry {
  id: string;
  kind: string;
  points: number;
  detail: string | null;
  created_at: string;
}

const KIND_LABEL: Record<string, string> = {
  baseline_carry_in: "Score carried in",
  workout_completed: "Workout completed",
  daily_action: "Daily action completed",
  log_water: "Water logged",
  log_meal: "Meal logged",
  log_glucose: "Blood sugar logged",
  log_weight: "Weight logged",
  complete_lesson: "Lesson completed",
};

/**
 * G. Activity Score is derived from one ledger — the same rows the member can
 * read. Nothing is displayed that the ledger cannot account for.
 */
export default function ActivityScoreCard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("points_ledger")
        .select("id,kind,points,detail,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (error || !data) {
        setEntries([]);
        setTotal(null);
        return;
      }
      const rows = data as LedgerEntry[];
      setEntries(rows.slice(0, 8));
      setTotal(rows.reduce((sum, r) => sum + (r.points ?? 0), 0));
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <Card className="p-5 border border-border rounded-xl shadow-warm space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-foreground">Activity Score</p>
        <p className="text-2xl font-semibold text-primary tabular-nums">
          {total == null ? "—" : total}
        </p>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-primary text-[13px]">
          How points are earned
        </summary>
        <ul className="mt-2 space-y-1 text-[13px] text-secondary-fg list-disc pl-5">
          <li>Completing a daily action</li>
          <li>Logging water, meals, blood sugar or weight</li>
          <li>Completing a workout</li>
          <li>Completing a lesson</li>
        </ul>
        <p className="mt-2 text-[12px] text-tertiary-fg">
          Points measure participation only. They are not a health measurement.
        </p>
      </details>

      <div>
        <p className="text-[12px] text-tertiary-fg mb-1.5">Recent entries</p>
        {entries == null ? (
          <p className="text-[13px] text-tertiary-fg">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-[13px] text-tertiary-fg">No points recorded yet.</p>
        ) : (
          <ul className="space-y-1">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="text-secondary-fg truncate">
                  {e.detail || KIND_LABEL[e.kind] || e.kind}
                </span>
                <span className="tabular-nums text-foreground shrink-0">
                  +{e.points}
                  <span className="text-tertiary-fg ml-2">
                    {new Date(e.created_at).toLocaleDateString()}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
