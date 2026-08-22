/**
 * Hydration — logging only.
 *
 * Batch 1 clinical appendix (C10/H1): DRM publishes NO universal fluid target.
 * There is deliberately no default ounce value in this module: no body-weight
 * formula, no fixed default, no completion percentage, no target ring and no
 * points award for reaching an ounce threshold.
 *
 * Member surfaces show only what was logged today. Anyone with a fluid
 * restriction or clinician instruction follows that advice instead.
 */

/** Member-facing label for the amount logged so far today. */
export function waterLoggedLabel(oz: number): string {
  return `${oz} oz logged today`;
}

/**
 * Stable server-side idempotency key for the once-daily "logged water" action.
 * Scoped to the member's own calendar day, so a refresh, a replayed request,
 * two rapid concurrent entries or a later same-day entry all collapse to a
 * single ledger award. The award represents the act of logging, never a target.
 */
export function waterAwardIdempotencyKey(calendarDayKey: string): string {
  return `log_water:${calendarDayKey}`;
}
