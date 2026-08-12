// P2: approved copy, mirrored from supabase/functions/_shared/copy.ts.
// Wording is fixed. Do not paraphrase, shorten, or reorder.

export const AI_HEALTH_UNAVAILABLE = {
  title: "Health questions are not available in this chat yet",
  body:
    "I can still help with the membership, price, login, and where to find things. For questions about your health, medications, symptoms, or results, contact a qualified healthcare professional. If you think this may be an emergency, contact emergency services now.",
  button: "Continue with membership questions",
} as const;

export const EMERGENCY_LINE =
  "I can't assess symptoms or emergencies. If you think this may be an emergency, contact emergency services now. Otherwise, contact a healthcare professional promptly.";
