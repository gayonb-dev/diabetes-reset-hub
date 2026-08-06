/**
 * Clinical feature flags.
 *
 * FASTING_SCHEDULING_ENABLED gates every fasting timer, schedule, window
 * calculation, logging control, and fasting notification.
 *
 * Turning this on is NOT a code-comment change. It requires BOTH:
 *   1. editing this constant to `true`, and
 *   2. a recorded CLINICAL_APPROVAL entry below naming the approving clinician,
 *      the approved eligibility model, stop rules, and member copy.
 *
 * CLINICAL_APPROVAL: none. Fasting scheduling is unapproved and disabled.
 */
export const FASTING_SCHEDULING_ENABLED = false;

/** Recorded clinical approval for fasting scheduling. Must be non-null before enabling. */
export const FASTING_SCHEDULING_CLINICAL_APPROVAL: string | null = null;
