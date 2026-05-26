import { cn } from "@/lib/utils";

export type VitaPosture = "neutral" | "encouraging" | "celebrating" | "concerned";

interface VitaProps {
  posture?: VitaPosture;
  size?: number;
  className?: string;
  label?: string;
}

/**
 * VITA — the DRM mascot. Warm amber form, four expressive states.
 * Always rendered as inline SVG using currentColor-free fills so amber
 * stays consistent across light & dark mode.
 */
export function Vita({ posture = "neutral", size = 80, className, label }: VitaProps) {
  const w = size;
  const h = Math.round((size * 120) / 80);
  const amber = "#E8A029";
  const ink = "#1A1A1A";

  const ariaLabel =
    label ??
    `VITA, ${posture} state — the Diabetes Reset Method companion`;

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 80 120"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <circle cx="40" cy="72" r="30" fill={amber} fillOpacity="0.07" />
      {posture === "celebrating" ? (
        <>
          <ellipse cx="15" cy="46" rx="7" ry="19" fill={amber} transform="rotate(-45 15 46)" />
          <ellipse cx="65" cy="46" rx="7" ry="19" fill={amber} transform="rotate(45 65 46)" />
        </>
      ) : posture === "encouraging" ? (
        <>
          <ellipse cx="17" cy="74" rx="7" ry="19" fill={amber} transform="rotate(12 17 74)" />
          <ellipse cx="62" cy="62" rx="7" ry="19" fill={amber} transform="rotate(-72 62 62)" />
        </>
      ) : posture === "concerned" ? (
        <g transform="rotate(4 40 75)">
          <ellipse cx="17" cy="74" rx="7" ry="19" fill={amber} transform="rotate(20 17 74)" />
          <ellipse cx="63" cy="74" rx="7" ry="19" fill={amber} transform="rotate(-20 63 74)" />
        </g>
      ) : (
        <>
          <ellipse cx="17" cy="74" rx="7" ry="19" fill={amber} transform="rotate(12 17 74)" />
          <ellipse cx="63" cy="74" rx="7" ry="19" fill={amber} transform="rotate(-12 63 74)" />
        </>
      )}

      <rect x="25" y="57" width="30" height="50" rx="12" fill={amber} />
      <ellipse cx="40" cy="40" rx="19" ry="21" fill={amber} />

      {/* Face */}
      {posture === "celebrating" ? (
        <>
          <ellipse cx="32" cy="37" rx="5" ry="3" fill="white" />
          <ellipse cx="48" cy="37" rx="5" ry="3" fill="white" />
          <circle cx="32" cy="37" r="2" fill={ink} />
          <circle cx="48" cy="37" r="2" fill={ink} />
          <path d="M30 48 Q40 60 50 48" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : posture === "encouraging" ? (
        <>
          <ellipse cx="32" cy="35" rx="5" ry="6" fill="white" />
          <ellipse cx="48" cy="35" rx="5" ry="6" fill="white" />
          <circle cx="32" cy="37" r="3" fill={ink} />
          <circle cx="48" cy="37" r="3" fill={ink} />
          <path d="M32 48 Q40 56 48 48" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : posture === "concerned" ? (
        <g transform="rotate(4 40 75)">
          <ellipse cx="32" cy="35" rx="4" ry="5" fill="white" />
          <ellipse cx="48" cy="35" rx="4" ry="5" fill="white" />
          <circle cx="31" cy="38" r="2.5" fill={ink} />
          <circle cx="49" cy="38" r="2.5" fill={ink} />
          <path d="M34 51 Q40 44 46 51" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <>
          <ellipse cx="32" cy="35" rx="4" ry="5" fill="white" />
          <ellipse cx="48" cy="35" rx="4" ry="5" fill="white" />
          <circle cx="32" cy="37" r="2.5" fill={ink} />
          <circle cx="48" cy="37" r="2.5" fill={ink} />
          <path d="M33 48 Q40 54 47 48" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default Vita;
