/**
 * E. Deterministic support answers.
 *
 * Navigation and FAQ questions are answered locally, before any model call is
 * considered. This keeps the common path truthful, instant, and free of any
 * external request carrying member text.
 */

export interface DeterministicAnswer {
  id: string;
  answer: string;
}

interface Rule {
  id: string;
  /** every group must match: each group is a set of alternatives */
  all: string[][];
  answer: string;
}

const RULES: Rule[] = [
  {
    id: "meal-plan-location",
    all: [["meal plan", "meal-plan", "meals"], ["where", "find", "regenerate", "new", "see"]],
    answer:
      "Your meal plan lives on the **Meals** tab. Open Meals from the bottom bar (or the sidebar on desktop), your current week's plan, swaps and shopping list are all there.",
  },
  {
    id: "log-water",
    all: [["water"], ["log", "track", "add", "how"]],
    answer:
      "Log water on **Today**. In the daily habits section, tap the water control to add a glass, it saves as you tap.",
  },
  {
    id: "log-blood-sugar",
    all: [["blood sugar", "glucose", "reading"], ["log", "add", "record", "enter", "how"]],
    answer:
      "Go to **Progress → Blood sugar** and use *Add reading*. Choose the reading type (fasting, pre-meal, post-meal) so the range shown matches the reading.",
  },
  {
    id: "log-weight",
    all: [["weight"], ["log", "add", "record", "enter", "how"]],
    answer: "Go to **Progress → Weight** and use *Add weight*.",
  },
  {
    id: "workouts-unlock",
    all: [["workout", "exercise"], ["unlock", "locked", "start", "when", "where"]],
    answer:
      "Workouts unlock on Day 29 and live on the **Workouts** page. Before then, Days 1–14 focus on food and Days 15–28 add post-meal walks.",
  },
  {
    id: "billing-manage",
    all: [["billing", "subscription", "payment", "card", "invoice", "cancel"], ["where", "manage", "change", "update", "cancel", "how"]],
    answer:
      "Open **Billing** from More → Billing. You can view your plan, update your payment method, download invoices and cancel there.",
  },
  {
    id: "export-data",
    all: [["export", "download"], ["data", "my data", "records"]],
    answer:
      "Go to **Settings → Your data** and choose *Export my data*. We'll prepare a downloadable copy of your records.",
  },
  {
    id: "delete-account",
    all: [["delete", "close", "remove"], ["account", "profile", "my data"]],
    answer:
      "Go to **Settings → Your data** and choose *Delete my account*. We'll confirm before anything is removed.",
  },
  {
    id: "change-timezone",
    all: [["timezone", "time zone"], ["change", "wrong", "set", "update"]],
    answer:
      "Your day rolls over at midnight in your own timezone. Update it in **Settings → Preferences**, then use *Sync now* to refresh today's view.",
  },
  {
    id: "program-day",
    all: [["day", "program day"], ["wrong", "behind", "missed", "catch up", "catch-up"]],
    answer:
      "Your program day advances at local midnight. If you missed days, open **Today**, the catch-up section lists days still open so you can complete them in order.",
  },
];

const NORMALISE = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");

/** Returns a deterministic answer when the question clearly matches, else null. */
export function deterministicSupportAnswer(question: string): DeterministicAnswer | null {
  const q = NORMALISE(question);
  if (!q.trim()) return null;
  for (const rule of RULES) {
    const matched = rule.all.every((group) => group.some((term) => q.includes(term)));
    if (matched) return { id: rule.id, answer: rule.answer };
  }
  return null;
}

export const DETERMINISTIC_RULE_IDS = RULES.map((r) => r.id);
