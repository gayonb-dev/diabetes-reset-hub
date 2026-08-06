/**
 * Server mirror of src/lib/featureFlags.ts.
 *
 * FASTING_SCHEDULING_ENABLED gates every fasting timer, schedule, prompt, and
 * notification produced server-side. Enabling requires editing this constant
 * AND recording a clinical approval below.
 *
 * CLINICAL_APPROVAL: none. Fasting scheduling is unapproved and disabled.
 */
export const FASTING_SCHEDULING_ENABLED = false;

export const FASTING_SCHEDULING_CLINICAL_APPROVAL: string | null = null;
