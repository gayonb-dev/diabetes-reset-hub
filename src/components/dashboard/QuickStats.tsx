import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface Stat {
  label: string;
  value: string | number | null;
  unit?: string;
  sub?: string;
  tone?: "normal" | "warning" | "danger" | "neutral" | "water";
  emptyHint?: string;
  href?: string;
}

interface QuickStatsProps {
  stats: Stat[];
  className?: string;
}

const toneColor: Record<NonNullable<Stat["tone"]>, string> = {
  normal: "text-status-normal",
  warning: "text-status-warning",
  danger: "text-status-danger",
  neutral: "text-foreground",
  water: "text-ringc-water",
};

export function QuickStats({ stats, className }: QuickStatsProps) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-2", className)}>
      {stats.map((s) => {
        const empty = s.value == null || s.value === "";
        const colorCls = toneColor[s.tone ?? "neutral"];
        const inner = (
          <div className="bg-card border border-border rounded-xl p-3 shadow-warm h-full text-left transition-shadow hover:shadow-md">
            <p className="stat-label mb-1.5">{s.label}</p>
            {empty ? (
              <>
                <p className="stat-value text-tertiary-fg">—</p>
                <p className="text-[10px] text-accent mt-1">{s.emptyHint ?? "Tap to log"}</p>
              </>
            ) : (
              <>
                <p className={cn("stat-value flex items-baseline flex-wrap", colorCls)}>
                  <span>{s.value}</span>
                  {s.unit && <span className="stat-unit">{s.unit}</span>}
                </p>
                {s.sub && <p className="text-[10px] text-tertiary-fg mt-1">{s.sub}</p>}
              </>
            )}
          </div>
        );
        return s.href ? (
          <Link key={s.label} to={s.href} className="block">
            {inner}
          </Link>
        ) : (
          <div key={s.label}>{inner}</div>
        );
      })}
    </div>
  );
}

export default QuickStats;
