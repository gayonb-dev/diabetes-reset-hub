// Unit preferences, persisted to localStorage, used across logging surfaces.
// Spec: blood sugar mg/dL ↔ mmol/L, weight lb ↔ kg.

export type WeightUnit = "lb" | "kg";
export type GlucoseUnit = "mgdl" | "mmoll";

export interface UnitPrefs {
  weight: WeightUnit;
  glucose: GlucoseUnit;
}

const KEY = "drm_units";

export const defaultUnits: UnitPrefs = { weight: "lb", glucose: "mgdl" };

export function getUnits(): UnitPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultUnits;
    return { ...defaultUnits, ...JSON.parse(raw) };
  } catch {
    return defaultUnits;
  }
}

export function setUnits(u: Partial<UnitPrefs>) {
  const next = { ...getUnits(), ...u };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

// Conversions, store canonical values: weight in lb, glucose in mg/dL.
export const lbToKg = (lb: number) => lb * 0.45359237;
export const kgToLb = (kg: number) => kg / 0.45359237;
export const mgdlToMmoll = (mg: number) => mg / 18.0182;
export const mmollToMgdl = (mm: number) => mm * 18.0182;

// ---------------------------------------------------------------- volume ---
// Water logging only. Canonical storage is WHOLE US FLUID OUNCES
// (public.water_logs.ounces is an integer). A US fluid ounce is a volume unit,
// deliberately distinct from a weight ounce (28.35 g) and from an Imperial
// fluid ounce (28.4131 mL). Every surface uses these shared helpers.
export type VolumeUnit = "floz" | "ml";

export const ML_PER_US_FL_OZ = 29.5735295625;

export const flOzToMl = (floz: number) => floz * ML_PER_US_FL_OZ;
export const mlToFlOz = (ml: number) => ml / ML_PER_US_FL_OZ;

/** Approximate mL shown beside an ounce amount (whole mL, display only). */
export const approxMl = (floz: number) => Math.round(flOzToMl(floz));

/**
 * Applies the supported storage rounding exactly once, at submission.
 * Returns whole US fl oz; 0 means "nothing would be saved".
 */
export function toStoredFlOz(amount: number, unit: VolumeUnit): number {
  const floz = unit === "ml" ? mlToFlOz(amount) : amount;
  if (!Number.isFinite(floz) || floz <= 0) return 0;
  return Math.round(floz);
}

/** "16 fl oz (≈ 473 mL)", the single water amount format used app-wide. */
export function formatVolume(floz: number): string {
  return `${floz} fl oz (≈ ${approxMl(floz)} mL)`;
}


export function displayWeight(lb: number | null | undefined, unit: WeightUnit): string {
  if (lb == null) return ", ";
  return unit === "kg" ? `${lbToKg(lb).toFixed(1)} kg` : `${lb.toFixed(1)} lb`;
}

export function displayGlucose(mgdl: number | null | undefined, unit: GlucoseUnit): string {
  if (mgdl == null) return ", ";
  return unit === "mmoll" ? `${mgdlToMmoll(mgdl).toFixed(1)} mmol/L` : `${Math.round(mgdl)} mg/dL`;
}

// Sanity bounds, used for inline "that seems off" validation.
export const GLUCOSE_RANGE_MGDL = { min: 30, max: 600 };
export const WEIGHT_RANGE_LB = { min: 60, max: 700 };
