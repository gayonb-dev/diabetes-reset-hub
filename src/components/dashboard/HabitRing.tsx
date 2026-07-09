import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { cn } from "@/lib/utils";
import { Droplet, Apple, Activity, Brain, LucideIcon } from "lucide-react";

export type HabitKey = "water" | "food" | "exercise" | "mindset";

interface HabitRingProps {
  habit: HabitKey;
  value: number;
  target: number;
  unit?: string;
  /** Ring diameter in px. Defaults to 72. Dashboard passes 96 at md+. */
  size?: number;
  /** Draw-on stagger delay in ms. */
  delayMs?: number;
  className?: string;
}

const META: Record<HabitKey, { label: string; color: string; Icon: LucideIcon }> = {
  water: { label: "Water", color: "hsl(var(--ring-water))", Icon: Droplet },
  food: { label: "Food", color: "hsl(var(--ring-food))", Icon: Apple },
  exercise: { label: "Exercise", color: "hsl(var(--ring-exercise))", Icon: Activity },
  mindset: { label: "Mindset", color: "hsl(var(--ring-mindset))", Icon: Brain },
};

export function HabitRing({
  habit,
  value,
  target,
  unit,
  size = 72,
  delayMs = 0,
  className,
}: HabitRingProps) {
  const { label, color, Icon } = META[habit];
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const stroke = size >= 96 ? 8 : 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const ariaPct = Math.round(pct * 100);

  const wasCompleteRef = useRef(pct >= 1);
  const bloomControls = useAnimationControls();
  const [bloom, setBloom] = useState(false);

  // Completion bloom — fires when a ring first reaches 100% in this session.
  useEffect(() => {
    if (pct >= 1 && !wasCompleteRef.current) {
      wasCompleteRef.current = true;
      setBloom(true);
      bloomControls
        .start({
          scale: [1, 1.08, 1],
          transition: { duration: 0.4, ease: [0.65, 0, 0.35, 1] },
        })
        .then(() => setTimeout(() => setBloom(false), 200));
    }
    if (pct < 1) wasCompleteRef.current = false;
  }, [pct, bloomControls]);

  const labelPx = size >= 96 ? 12 : 11;
  const subPx = size >= 96 ? 11 : 10;

  return (
    <div
      className={cn("flex flex-col items-center gap-1.5", className)}
      role="img"
      aria-label={`${label} habit ring: ${value} of ${target}${unit ? " " + unit : ""} completed, ${ariaPct} percent.`}
    >
      <motion.div
        className="relative rounded-full"
        style={{
          width: size,
          height: size,
          boxShadow: bloom ? `0 0 24px 4px ${color}` : "none",
          transition: "box-shadow 0.4s ease-out",
        }}
        animate={bloomControls}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{
              duration: 0.8,
              delay: delayMs / 1000,
              ease: [0.65, 0, 0.35, 1],
            }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ color }}
        >
          <Icon
            className={size >= 96 ? "h-6 w-6" : "h-5 w-5"}
            aria-hidden
          />
        </div>
      </motion.div>
      <span
        className="label-caps text-tertiary-fg"
        style={{ fontSize: labelPx }}
      >
        {label}
      </span>
      <span
        className="text-tertiary-fg leading-none"
        style={{ fontSize: subPx }}
      >
        {value}
        {unit ? ` ${unit}` : ""} / {target}
        {unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}

export default HabitRing;
