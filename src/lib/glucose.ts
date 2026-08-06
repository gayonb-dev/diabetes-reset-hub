// Shared blood-glucose classification (S1 — blood-glucose safety).
// Single source of truth for every surface that labels or colours a glucose reading.
//
// Low-safety thresholds apply FIRST for every reading type. Only at 70 mg/dL and
// above do the context-specific ranges apply.
//
// Not medical advice. Thresholds and copy still require clinician approval.

import { mmollToMgdl } from "@/lib/units";

export type GlucoseReadingType = "fasting" | "post_meal" | "bedtime" | "other" | "cgm";

export type GlucoseStatus = "urgent_low" | "low" | "in_range" | "elevated" | "high";

/** Low thresholds in canonical mg/dL — applied to every reading type. */
export const GLUCOSE_LOW_THRESHOLDS = {
  /** Below this value is urgent_low. */
  urgentLow: 54,
  /** Below this value (and at/above urgentLow) is low. */
  low: 70,
} as const;

/**
 * Context-specific ranges for readings of 70 mg/dL and above (canonical mg/dL).
 * `inRangeMax` is exclusive: value < inRangeMax => in_range.
 * `elevatedMax` is exclusive: value < elevatedMax => elevated, otherwise high.
 */
export const GLUCOSE_RANGES: Record<GlucoseReadingType, { inRangeMax: number; elevatedMax: number }> = {
  fasting: { inRangeMax: 100, elevatedMax: 126 },
  post_meal: { inRangeMax: 140, elevatedMax: 200 },
  bedtime: { inRangeMax: 120, elevatedMax: 180 },
  other: { inRangeMax: 140, elevatedMax: 200 },
  cgm: { inRangeMax: 140, elevatedMax: 200 },
};

/** Plausibility bounds in canonical mg/dL. Values outside cannot be saved. */
export const GLUCOSE_PLAUSIBLE_MGDL = { min: 20, max: 600 } as const;

/**
 * Classify a canonical mg/dL value. Callers holding mmol/L must convert first
 * (see `mmollToMgdl` / `classifyGlucoseFromUnit`) and must not round before classifying.
 */
export function classifyGlucose(mgdl: number, readingType: GlucoseReadingType = "other"): GlucoseStatus {
  if (mgdl < GLUCOSE_LOW_THRESHOLDS.urgentLow) return "urgent_low";
  if (mgdl < GLUCOSE_LOW_THRESHOLDS.low) return "low";
  const r = GLUCOSE_RANGES[readingType] ?? GLUCOSE_RANGES.other;
  if (mgdl < r.inRangeMax) return "in_range";
  if (mgdl < r.elevatedMax) return "elevated";
  return "high";
}

/** Classify a value entered in either unit, converting before classification. */
export function classifyGlucoseFromUnit(
  value: number,
  unit: "mgdl" | "mmoll",
  readingType: GlucoseReadingType = "other",
): GlucoseStatus {
  return classifyGlucose(unit === "mmoll" ? mmollToMgdl(value) : value, readingType);
}

export const GLUCOSE_STATUS_LABEL: Record<GlucoseStatus, string> = {
  urgent_low: "Urgent low",
  low: "Low",
  in_range: "In range",
  elevated: "Elevated",
  high: "High",
};

export type GlucoseTone = "normal" | "warning" | "danger";

export function glucoseTone(status: GlucoseStatus): GlucoseTone {
  if (status === "in_range") return "normal";
  if (status === "elevated" || status === "low") return "warning";
  return "danger";
}

export function glucoseToneClass(status: GlucoseStatus): string {
  const tone = glucoseTone(status);
  return tone === "normal"
    ? "text-status-normal"
    : tone === "warning"
    ? "text-status-warning"
    : "text-status-danger";
}

export function glucoseToneColor(status: GlucoseStatus): string {
  const tone = glucoseTone(status);
  return tone === "normal"
    ? "hsl(var(--status-normal))"
    : tone === "warning"
    ? "hsl(var(--status-warning))"
    : "hsl(var(--status-danger))";
}

/**
 * Tone for a raw mg/dL reading — used by dashboard-style summaries.
 * Lives here so no consumer re-implements thresholds locally.
 */
export function bloodSugarTone(mgdl: number, readingType: GlucoseReadingType = "other"): GlucoseTone {
  return glucoseTone(classifyGlucose(mgdl, readingType));
}

export function isLowStatus(status: GlucoseStatus): boolean {
  return status === "low" || status === "urgent_low";
}

/** True when the canonical mg/dL value is within plausible physiological bounds. */
export function isPlausible(mgdl: number | null | undefined): boolean {
  if (mgdl == null || Number.isNaN(mgdl)) return false;
  return mgdl >= GLUCOSE_PLAUSIBLE_MGDL.min && mgdl <= GLUCOSE_PLAUSIBLE_MGDL.max;
}

/** True when the given local datetime / ISO string is in the future. */
export function isFutureTimestamp(value: string, now: Date = new Date()): boolean {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return false;
  return t > now.getTime();
}

/** Local `datetime-local` string for "now" — used as the max attribute. */
export function localDateTimeValue(d: Date = new Date()): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

// ---- Approved safety copy -------------------------------------------------

export const GLUCOSE_URGENT_LOW_TITLE = "Dangerously low reading";
export const GLUCOSE_LOW_TITLE = "Low reading";

export const GLUCOSE_URGENT_LOW_MESSAGE =
  "This reading is dangerously low. Follow your healthcare professional's low-blood-sugar plan now. If you feel confused, faint, unable to treat yourself, or symptoms are severe, contact emergency services.";

export const GLUCOSE_LOW_MESSAGE =
  "This reading is low. Follow your healthcare professional's low-blood-sugar plan now. If symptoms are severe or you cannot treat yourself, contact emergency services.";

export const GLUCOSE_MEDICATION_WARNING = "Never change medication based on this app alone.";

export const GLUCOSE_IMPLAUSIBLE_MESSAGE =
  "That value is outside the range this app can record. Please check your meter and correct the entry.";

export const GLUCOSE_FUTURE_TIMESTAMP_MESSAGE =
  "This time is in the future. Please correct the date and time before saving.";

export function glucoseSafetyCopy(status: GlucoseStatus): { title: string; message: string } | null {
  if (status === "urgent_low") return { title: GLUCOSE_URGENT_LOW_TITLE, message: GLUCOSE_URGENT_LOW_MESSAGE };
  if (status === "low") return { title: GLUCOSE_LOW_TITLE, message: GLUCOSE_LOW_MESSAGE };
  return null;
}
