/**
 * Prompt 6 PRE-PART A, public VITA feature/tracking routing correction.
 *
 * Product-capability questions must be answered truthfully and deterministically
 * even when they mention diabetes, A1C or weight. Requests for interpretation,
 * treatment, targets, medication changes or symptoms must still fail safely to
 * the health boundary, and a dangerous stated glucose value always wins.
 */
import { describe, it, expect } from "vitest";
import {
  matchFaq,
  isPossibleEmergency,
  isHealthRelated,
} from "../../supabase/functions/_shared/copy";

const FEATURE_QUESTIONS = [
  "What are the features of this app for me a diabetic type",
  "What are the features of this app?",
  "What does the app include?",
  "What can I do in the app?",
  "What features are available for someone with Type 2 diabetes?",
  "How does the membership help me stay organized?",
];

const TRACKING_QUESTIONS = [
  "tracking my ac1 and my weight",
  "Can I track A1C and weight?",
  "Where do I enter my A1C?",
  "Does the app track blood sugar?",
  "Can I log my HbA1c?",
  "can i track my aic",
  "where do I log my weight",
  "does the app record my measurements",
];

const HEALTH_QUESTIONS = [
  "My A1C is 11. What should I do?",
  "How can I lower my A1C?",
  "Should I change my medication?",
  "How much weight should I lose?",
  "What does my A1C of 9 mean?",
  "I have numbness in my feet, is that normal?",
];

describe("deterministic feature answer", () => {
  it("answers product-capability questions truthfully, not with a medical boundary", () => {
    for (const q of FEATURE_QUESTIONS) {
      const a = matchFaq(q);
      expect(a?.key, q).toBe("features");
      expect(a?.body).toContain("clear daily action");
      expect(a?.body).toContain("printable report for health visits");
      expect(a?.body).toContain("does not interpret your results");
      expect(a?.action?.path).toBe("/#pricing");
    }
  });

  it("never advertises retired or non-operational features", () => {
    const banned =
      /whatsapp|broadcast|coaching|1:1|sprint|7[-\s]?day reset|supplement|fasting schedule|automatic (device )?sync|personalized health/i;
    for (const q of [...FEATURE_QUESTIONS, ...TRACKING_QUESTIONS]) {
      expect(banned.test(matchFaq(q)!.body), q).toBe(false);
    }
  });
});

describe("deterministic tracking answer", () => {
  it("explains A1C, weight, glucose, measurement and habit tracking", () => {
    for (const q of TRACKING_QUESTIONS) {
      const a = matchFaq(q);
      expect(a?.key, q).toBe("tracking");
      expect(a?.body).toContain("record A1C results and weight under Progress");
      expect(a?.body).toContain("does not interpret your results");
    }
  });

  it("makes no automatic device-sync claim", () => {
    expect(/sync|dexcom|apple health/i.test(matchFaq("can I track my a1c")!.body)).toBe(false);
  });
});

describe("health boundary precedence", () => {
  it("keeps interpretation, treatment, target and symptom questions out of the FAQ", () => {
    for (const q of HEALTH_QUESTIONS) {
      expect(matchFaq(q), q).toBeNull();
      expect(isHealthRelated(q) || isPossibleEmergency(q), q).toBe(true);
    }
  });

  it("treats a dangerous stated glucose value as urgent regardless of wording", () => {
    expect(isPossibleEmergency("My blood sugar is 45.")).toBe(true);
    expect(matchFaq("My blood sugar is 45.")).toBeNull();
    expect(isPossibleEmergency("can the app track my blood sugar of 45?")).toBe(true);
    expect(matchFaq("can the app track my blood sugar of 45?")).toBeNull();
  });

  it("does not let the capability matcher swallow a health question containing 'track'", () => {
    expect(matchFaq("I track my blood sugar, should I change my metformin dose?")).toBeNull();
    expect(matchFaq("the app tracks my A1C but what does my A1C of 11 mean?")).toBeNull();
  });

  it("does not treat a diabetes word alone as a health question", () => {
    expect(matchFaq("What are the features for a type 2 diabetic?")?.key).toBe("features");
  });
});

describe("existing deterministic answers stay green", () => {
  it("keeps About, signup, price, login and cancellation routing", () => {
    expect(matchFaq("What is this program all about and how do I sign up?")?.key).toBe("about");
    expect(matchFaq("send me the link")?.key).toBe("signup");
    expect(matchFaq("how much does it cost?")?.key).toBe("price");
    expect(matchFaq("how do I log in?")?.key).toBe("login");
    expect(matchFaq("how do I cancel?")?.key).toBe("cancel");
    expect(matchFaq("yes", "faq_about")?.key).toBe("signup");
  });

  it("only ever returns approved internal destinations", () => {
    const paths = [
      ...FEATURE_QUESTIONS,
      ...TRACKING_QUESTIONS,
      "how much does it cost?",
      "how do I log in?",
      "how do I cancel?",
    ]
      .map((q) => matchFaq(q)?.action?.path)
      .filter(Boolean);
    for (const p of paths) {
      expect(["/#pricing", "/login", "/refunds", "/privacy"]).toContain(p);
    }
  });
});
