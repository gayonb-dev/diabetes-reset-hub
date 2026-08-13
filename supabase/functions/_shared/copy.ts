// P2: approved copy. Wording here is fixed and must not be paraphrased.

/** Shown instead of the normal consent body while the AI-health gate is closed. */
export const AI_HEALTH_UNAVAILABLE = {
  title: "Health questions are not available in this chat yet",
  body:
    "I can still help with the membership, price, login, and where to find things. For questions about your health, medications, symptoms, or results, contact a qualified healthcare professional. If you think this may be an emergency, contact emergency services now.",
  button: "Continue with membership questions",
} as const;

/** Deterministic response to a possible emergency before consent. Never stored, never sent to a processor. */
export const EMERGENCY_LINE =
  "I can't assess symptoms or emergencies. If you think this may be an emergency, contact emergency services now. Otherwise, contact a healthcare professional promptly.";

const EMERGENCY_PATTERNS: RegExp[] = [
  /\bchest (pain|tightness|pressure)\b/i,
  /\bcan'?t breathe\b/i, /\btrouble breathing\b/i, /\bshortness of breath\b/i,
  /\bpassed out\b/i, /\bfaint(ed|ing)?\b/i, /\bunconscious\b/i,
  /\bseizure\b/i, /\bstroke\b/i, /\bheart attack\b/i,
  /\bnumbness on one side\b/i, /\bslurred speech\b/i,
  /\bsuicid(e|al)\b/i, /\bkill myself\b/i, /\bharm myself\b/i,
  /\bblood sugar (is )?(over|above)\s*(3\d\d|[4-9]\d\d)\b/i,
  /\bblood sugar (is )?(under|below)\s*([0-4]?\d)\b/i,
  /\bsugar\s*(is\s*)?\d{2,3}\s*and\b.*\b(shaking|confused|sweating)\b/i,
  /\bketoacidosis\b/i, /\bdka\b/i,
  /\bvomiting blood\b/i, /\bsevere\b.*\b(pain|dizziness)\b/i,
  /\bemergency\b/i, /\b911\b/, /\bambulance\b/i,
];

export function isPossibleEmergency(text: string): boolean {
  return EMERGENCY_PATTERNS.some((re) => re.test(text));
}

/** Topics the closed-gate assistant may still answer. */
const NON_HEALTH_PATTERNS: RegExp[] = [
  /\bprice|pricing|cost|how much|\$\d/i,
  /\bmembership|subscri|cancel|refund|guarantee|billing|invoice/i,
  /\blog ?in|sign ?in|password|account|email address/i,
  /\bwhere (do|can) i find|how do i (find|get to|open)/i,
  /\bwhat is (the )?(diabetes reset|program|app|membership)/i,
];

const HEALTH_PATTERNS: RegExp[] = [
  /\ba1c\b/i, /\bblood sugar\b/i, /\bglucose\b/i, /\binsulin\b/i,
  /\bmetformin\b/i, /\bmedication|meds\b/i, /\bdos(e|age)\b/i,
  /\bsymptom|neuropathy|retinopathy|numb|tingl/i,
  /\bmy (results?|labs?|numbers?)\b/i, /\bdiagnos/i,
  /\bshould i (take|stop|change)\b/i, /\bis it safe\b/i,
];

export function isHealthRelated(text: string): boolean {
  if (NON_HEALTH_PATTERNS.some((re) => re.test(text)) && !HEALTH_PATTERNS.some((re) => re.test(text))) {
    return false;
  }
  return HEALTH_PATTERNS.some((re) => re.test(text));
}

// ---------------------------------------------------------------------------
// Deterministic membership FAQ.
//
// While the AI-health gate is closed the public chat must still be genuinely
// useful for the three questions visitors actually ask: price, login and
// cancellation. These answers are produced by the server with no processor
// call, no model call and no stored health content. Wording is approved and
// must not be paraphrased.
// ---------------------------------------------------------------------------

export type FaqKey = "price" | "login" | "cancel";

export interface FaqAnswer {
  key: FaqKey;
  body: string;
  /** Relative path the widget turns into a button, or null. */
  cta: { label: string; path: string } | null;
}

const FAQ_ANSWERS: Record<FaqKey, FaqAnswer> = {
  price: {
    key: "price",
    body:
      "It's US$27 today, which unlocks the membership and the 7-Day Reset Sprint with 14 days of full access. After that it's US$67 a month, and you can cancel in one click at any time. Cancel inside the first 14 days and there's no monthly charge — you keep the 7-Day Reset.",
    cta: { label: "See the plan", path: "/#pricing" },
  },
  login: {
    key: "login",
    body:
      "Sign in from the Login page. Enter the email address on your membership and we send a secure one-time sign-in link — there's no password to remember. If the link doesn't arrive, check your spam folder.",
    cta: { label: "Go to Login", path: "/login" },
  },
  cancel: {
    key: "cancel",
    body:
      "You can cancel in one click from Billing inside your account. Cancelling stops the next charge and you keep access until the end of the period you've paid for. Refunds are handled under the Refund Terms page.",
    cta: { label: "Refund Terms", path: "/refund-terms" },
  },
};

const FAQ_PATTERNS: Array<{ key: FaqKey; re: RegExp }> = [
  { key: "cancel", re: /\b(cancel|cancelling|canceling|unsubscribe|stop (my )?(sub|subscription|membership|billing)|end my membership)\b/i },
  { key: "login", re: /\b(log ?in|logging in|sign ?in|signing in|can'?t get in|forgot my password|password|magic link|access my account)\b/i },
  { key: "price", re: /\b(price|pricing|cost|costs|how much|what do you charge|fee|\$\s?\d|27|67)\b/i },
];

/**
 * Returns the approved deterministic answer for a membership FAQ, or null.
 * Health wording always wins: a message that also reads as health-related is
 * left to the health gate rather than answered here.
 */
export function matchFaq(text: string): FaqAnswer | null {
  if (!text || isPossibleEmergency(text)) return null;
  if (HEALTH_PATTERNS.some((re) => re.test(text))) return null;
  for (const { key, re } of FAQ_PATTERNS) {
    if (re.test(text)) return FAQ_ANSWERS[key];
  }
  return null;
}
