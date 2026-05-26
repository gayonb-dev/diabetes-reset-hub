import { cn } from "@/lib/utils";
import { Droplet, Apple, Activity, Brain, LucideIcon } from "lucide-react";

export type HabitKey = "water" | "food" | "exercise" | "mindset";

interface HabitRingProps {
  habit: HabitKey;
  value: number;
  target: number;
  unit?: string;
  size?: number;
  className?: string;
}

const META: Record<HabitKey, { label: string; color: string; Icon: LucideIcon }> = {
  water: { label: "Water", color: "hsl(var(--ring-water))", Icon: Droplet },
  food: { label: "Food", color: "hsl(var(--ring-food))", Icon: Apple },
  exercise: { label: "Exercise", color: "hsl(var(--ring-exercise))", Icon: Activity },
  mindset: { label: "Mindset", color: "hsl(var(--ring-mindset))", Icon: Brain },
};

export function HabitRing({ habit, value, target, unit, size = 72, className }: HabitRingProps) {
  const { label, color, Icon } = META[habit];
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = `${pct * c} ${c}`;
  const ariaPct = Math.round(pct * 100);

  return (
    <div
      className={cn("flex flex-col items-center gap-1.5", className)}
      role="img"
      aria-label={`${label} habit ring: ${value} of ${target}${unit ? " " + unit : ""} completed, ${ariaPct} percent.`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          {pct > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeDasharray={dash}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="transition-all duration-500"
            />
          )}
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ color }}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
      <span className="label-caps text-tertiary-fg">{label}</span>
      <span className="text-[10px] text-tertiary-fg leading-none">
        {value}
        {unit ? ` ${unit}` : ""} / {target}
        {unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}

export default HabitRing;
