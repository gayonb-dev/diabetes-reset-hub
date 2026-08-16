import { Card } from "@/components/ui/card";
import type { LedgerEntry } from "@/hooks/useActivityScore";

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

interface Props {
  entries: LedgerEntry[] | null;
  total: number | null;
}

/**
 * G. Activity Score is derived from one ledger — the same rows the member can
 * read. Nothing is displayed that the ledger cannot account for.
 */
export default function ActivityScoreCard({ entries, total }: Props) {
  const recent = entries ? entries.slice(0, 8) : null;

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
        {recent == null ? (
          <p className="text-[13px] text-tertiary-fg">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-[13px] text-tertiary-fg">No points recorded yet.</p>
        ) : (
          <ul className="space-y-1">
            {recent.map((e) => (
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
