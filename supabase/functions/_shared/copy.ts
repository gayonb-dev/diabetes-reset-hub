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

/**
 * A stated blood-glucose value outside the safe band is always urgent, whatever
 * else the sentence contains. This runs before every capability matcher.
 */
const GLUCOSE_VALUE_RE =
  /\b(blood\s*sugar|blood\s*glucose|glucose|sugar|bg)\b[^.\d]{0,24}?(\d{2,3})\b/i;

function statedGlucoseIsDangerous(text: string): boolean {
  const m = GLUCOSE_VALUE_RE.exec(text);
  if (!m) return false;
  const v = Number(m[2]);
  if (!Number.isFinite(v)) return false;
  return v < 70 || v > 300;
}

export function isPossibleEmergency(text: string): boolean {
  return EMERGENCY_PATTERNS.some((re) => re.test(text)) || statedGlucoseIsDangerous(text);
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
// useful for the questions visitors actually ask: what this is, how to join,
// price, login and cancellation. These answers are produced by the server with
// no processor call, no model call and no stored health content. Wording is
// approved and must not be paraphrased.
//
// Prompt 6 Stage 0: no reversal/cure claim and no "7-Day Reset" language may
// appear here, and every destination must come from PUBLIC_CHAT_DESTINATIONS.
// ---------------------------------------------------------------------------

/** The only destinations the public chat may ever link to. */
export const PUBLIC_CHAT_DESTINATIONS = ["/#pricing", "/login", "/refunds", "/privacy"] as const;
export type PublicChatPath = (typeof PUBLIC_CHAT_DESTINATIONS)[number];

export function isApprovedChatPath(path: unknown): path is PublicChatPath {
  return typeof path === "string" &&
    (PUBLIC_CHAT_DESTINATIONS as readonly string[]).includes(path);
}

export const PUBLIC_SITE_ORIGIN = "https://diabetesresetmethod.com";

/** Plain-text fallback shown under the structured action. */
export function fallbackUrl(path: PublicChatPath): string {
  return `${PUBLIC_SITE_ORIGIN}${path}`;
}

export type FaqKey =
  | "about"
  | "signup"
  | "price"
  | "login"
  | "cancel"
  | "features"
  | "tracking";

export interface FaqAction {
  label: string;
  path: PublicChatPath;
}

export interface FaqAnswer {
  key: FaqKey;
  body: string;
  /** Server-approved structured action the widget renders as a link/button. */
  action: FaqAction | null;
}

const PRICING_ACTION: FaqAction = { label: "View membership and pricing", path: "/#pricing" };

const FAQ_ANSWERS: Record<FaqKey, FaqAnswer> = {
  about: {
    key: "about",
    body:
      "Diabetes Reset Method is a self-guided educational membership for adults managing Type 2 diabetes or prediabetes. It offers small daily actions, meal ideas, tracking tools, educational membership support and printable reports for health visits. It does not diagnose, treat or promise to reverse diabetes.\n\nYour first 14 days cost US$27. After that, membership is US$67 per month until canceled. You can review the membership and get started below.",
    action: PRICING_ACTION,
  },
  signup: {
    key: "signup",
    body: "You can review the membership and start here:",
    action: PRICING_ACTION,
  },
  price: {
    key: "price",
    body:
      "Your first 14 days cost US$27. After that, membership is US$67 per month until canceled, and you can cancel at any time from Billing inside your account.",
    action: PRICING_ACTION,
  },
  login: {
    key: "login",
    body:
      "Sign in from the Login page. Enter the email address on your membership and we send a secure one-time sign-in link — there's no password to remember. If the link doesn't arrive, check your spam folder.",
    action: { label: "Go to Login", path: "/login" },
  },
  cancel: {
    key: "cancel",
    body:
      "You can cancel in one click from Billing inside your account. Cancelling stops the next charge and you keep access until the end of the period you've paid for. Refunds are handled under the Refund Terms page.",
    action: { label: "Refund Terms", path: "/refunds" },
  },
  features: {
    key: "features",
    body:
      "The membership includes a clear daily action, meal ideas and recipes, tracking for blood glucose, A1C, weight, measurements and habits, progress trends, educational content, and a printable report for health visits. You can also use the currently available member Ask and community support tools.\n\nDRM helps you organize information and practice daily habits. It does not interpret your results, recommend treatment or replace your healthcare professional.",
    action: PRICING_ACTION,
  },
  tracking: {
    key: "tracking",
    body:
      "Yes. Members can record A1C results and weight under Progress, view changes over time, and include them in a printable report for health visits. You can also track blood-glucose readings, measurements and daily habits.\n\nDRM helps you organize the information you enter; it does not interpret your results or recommend treatment.",
    action: PRICING_ACTION,
  },
};

/**
 * Intent keys after which a bare affirmative ("yes", "ok", "how?") may be read
 * as signup intent. Nothing else qualifies: an affirmative after login,
 * cancellation, privacy, health-boundary, support or navigation answers is not
 * a signup signal.
 */
const SIGNUP_CONTEXT_INTENTS = new Set(["faq_about", "faq_price", "faq_signup", "purchase_intent"]);

/** Bare affirmatives / "how?" — only meaningful with signup context. */
const AFFIRMATIVE_RE =
  /^(yes|yeah|yep|yup|ok|okay|sure|please|go on|yes please|how|how\?|yes how|yes how\?|yes,? how( do i)?\??|ok how\??)[.!?]*$/i;

/** Explicit signup requests — always safe to answer with the pricing action. */
const EXPLICIT_SIGNUP_RE =
  /\b(send me the link|the link|how do i (join|sign ?up|start|get started|enroll)|where do i start|sign me up|i'?m ready|i am ready|how do i become a member|join now|get started)\b/i;

/** "What is this / what's it all about" style questions. */
const ABOUT_RE =
  /\b(what is (this|it|drm|the (program|programme|app|membership|diabetes reset)))|what'?s (this|it) (all )?about|tell me (more )?about (this|the (program|programme|membership))|what do you (offer|do)|how does (this|it|the program(me)?) work\b/i;

const FAQ_PATTERNS: Array<{ key: FaqKey; re: RegExp }> = [
  { key: "cancel", re: /\b(cancel|cancelling|canceling|unsubscribe|stop (my )?(sub|subscription|membership|billing)|end my membership)\b/i },
  { key: "login", re: /\b(log ?in|logging in|sign ?in|signing in|can'?t get in|forgot my password|password|magic link|access my account)\b/i },
  { key: "about", re: ABOUT_RE },
  { key: "signup", re: EXPLICIT_SIGNUP_RE },
  { key: "price", re: /\b(price|pricing|cost|costs|how much|what do you charge|fee|\$\s?\d|27|67)\b/i },
];

/**
 * Returns the approved deterministic answer for a membership FAQ, or null.
 *
 * Health wording always wins: a message that also reads as health-related is
 * left to the health gate rather than answered here.
 *
 * `lastIntent` is the non-sensitive intent key of the immediately preceding
 * server response (e.g. "faq_about"). It carries no message text and no health
 * content, and is used only so a bare "yes" after the About or price answer
 * resolves to the signup action instead of restarting a sales script.
 */
export function matchFaq(text: string, lastIntent?: string | null): FaqAnswer | null {
  if (!text || isPossibleEmergency(text)) return null;
  if (HEALTH_PATTERNS.some((re) => re.test(text))) return null;

  const trimmed = text.trim();

  // Explicit signup requests need no prior context.
  if (EXPLICIT_SIGNUP_RE.test(trimmed) && !ABOUT_RE.test(trimmed)) {
    return FAQ_ANSWERS.signup;
  }

  // Bare affirmatives only count when the previous answer invited signup.
  if (AFFIRMATIVE_RE.test(trimmed)) {
    return lastIntent && SIGNUP_CONTEXT_INTENTS.has(lastIntent) ? FAQ_ANSWERS.signup : null;
  }

  for (const { key, re } of FAQ_PATTERNS) {
    if (re.test(trimmed)) return FAQ_ANSWERS[key];
  }
  return null;
}

