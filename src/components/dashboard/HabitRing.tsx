import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { cn } from "@/lib/utils";
import { Droplet, Apple, Activity, Brain, LucideIcon } from "lucide-react";

export type HabitKey = "water" | "food" | "exercise" | "mindset";

interface HabitRingProps {
  habit: HabitKey;
  value: number;
  /** Target for the progress arc, or null for log-only habits (no target). */
  target: number | null;
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
  const logOnly = target === null;
  /** Derived from the persisted amount for the current member calendar day. */
  const loggedToday = logOnly && value > 0;
  const pct = !logOnly && target > 0 ? Math.min(value / target, 1) : 0;
  const stroke = size >= 112 ? 10 : size >= 96 ? 8 : 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const ariaPct = Math.round(pct * 100);


  const wasCompleteRef = useRef(pct >= 1);
  const bloomControls = useAnimationControls();
  const [bloom, setBloom] = useState(false);

  /**
   * Log-only habits (water) get a brief save highlight when the logged amount
   * increases. It acknowledges that the amount was stored — it never implies a
   * prescribed daily intake was completed. Reduced motion removes the pulse.
   */
  const reducedMotion =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  const lastValueRef = useRef(value);
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (!logOnly) {
      lastValueRef.current = value;
      return;
    }
    if (value > lastValueRef.current) {
      setJustSaved(true);
      const t = window.setTimeout(() => setJustSaved(false), 900);
      lastValueRef.current = value;
      return () => window.clearTimeout(t);
    }
    lastValueRef.current = value;
  }, [value, logOnly]);


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

  const labelPx = size >= 112 ? 12 : size >= 96 ? 12 : 9;

  return (
    <div
      className={cn("flex flex-col items-center gap-1.5", className)}
      role="img"
      aria-label={
        logOnly
          ? `${label}: ${value}${unit ? " " + unit : ""} logged today. No target.${loggedToday ? " Water logged today." : ""}`
          : `${label} habit ring: ${value} of ${target}${unit ? " " + unit : ""} completed, ${ariaPct} percent.`
      }

    >
      <motion.div
        className="relative rounded-full"
        style={{
          width: size,
          height: size,
          boxShadow: (bloom || justSaved) && !reducedMotion ? `0 0 16px 2px ${color}` : "none",
          transition: "box-shadow 0.4s ease-out",
        }}
        animate={bloomControls}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {logOnly ? (
            /* Log-only habits (water) keep the same footprint and stroke as the
               other indicators, but the outer circle is only a visual frame:
               there is no target, no percentage and no filled progress arc.
               A persisted positive amount for today keeps the frame brand blue
               ("Water logged today"); it is never driven by transient state. */
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={loggedToday ? color : "hsl(var(--muted))"}
              strokeWidth={stroke}
              style={{ transition: "stroke 0.4s ease-out" }}
            />
          ) : (


            <>
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
            </>
          )}
        </svg>

        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ color }}
        >
          <Icon
            className={size >= 112 ? "h-7 w-7" : size >= 96 ? "h-6 w-6" : "h-5 w-5"}
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
      <span className="ring-value text-secondary-fg">
        {logOnly ? (
          <>
            {value}
            {unit ? ` ${unit}` : ""} logged
          </>
        ) : (
          <>
            {value}
            {unit ? ` ${unit}` : ""} / {target}
            {unit ? ` ${unit}` : ""}
          </>
        )}
      </span>
      {loggedToday && (
        <span className="text-[11px] font-medium" style={{ color }}>
          Water logged today
        </span>
      )}


    </div>
  );
}

export default HabitRing;
