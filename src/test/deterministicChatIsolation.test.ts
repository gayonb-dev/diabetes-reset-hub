// Prompt 6 closeout — deterministic VITA answers make zero external model calls.
//
// The public chat answers membership questions from server-held approved copy.
// This is a structural proof against the deployed source: the deterministic
// branch returns before any AI gateway call is even reachable, and the branch
// itself contains no fetch.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { matchFaq, isApprovedChatPath } from "../../supabase/functions/_shared/copy";

const src = readFileSync(
  resolve(__dirname, "../../supabase/functions/chat-agent/index.ts"),
  "utf8",
);

function branch(): string {
  const start = src.indexOf("const faq = matchFaq(");
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf("if (!healthGateOpen && isHealthRelated", start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe("deterministic answers never call a model", () => {
  it("the deterministic branch contains no network call of any kind", () => {
    const b = branch();
    expect(b).not.toContain("fetch(");
    expect(b).not.toContain("ai.gateway.lovable.dev");
    expect(b).not.toContain("LOVABLE_API_KEY");
  });

  it("the deterministic branch returns before the AI gateway call site", () => {
    const faqReturn = src.indexOf("deterministic: true");
    const aiCall = src.indexOf("https://ai.gateway.lovable.dev/v1/chat/completions", faqReturn);
    expect(faqReturn).toBeGreaterThan(-1);
    expect(aiCall).toBeGreaterThan(faqReturn);
  });

  it("marks deterministic replies as unstored and non-health", () => {
    const b = branch();
    expect(b).toContain("deterministic: true");
    expect(b).toContain("stored: false");
    expect(b).toContain("health_related: false");
  });

  it("the health gate is consulted before the deterministic branch", () => {
    expect(src.indexOf("aiHealthEnabled(")).toBeLessThan(src.indexOf("const faq = matchFaq("));
  });
});

describe("every deterministic answer stays inside the allow-list", () => {
  const prompts = [
    "what is this all about",
    "how do I sign up",
    "how much does it cost",
    "how do I log in",
    "how do I cancel",
    "can I track my A1C and weight",
    "does it have a meal plan",
  ];

  it("returns only approved CTA paths", () => {
    for (const p of prompts) {
      const a = matchFaq(p);
      if (a?.action) expect(isApprovedChatPath(a.action.path), `${p} -> ${a.action.path}`).toBe(true);
    }
  });

  it("never emits a bare external URL in the answer body", () => {
    for (const p of prompts) {
      const a = matchFaq(p);
      if (!a) continue;
      const urls = a.body.match(/https?:\/\/[^\s)]+/g) ?? [];
      for (const u of urls) expect(u.startsWith("https://diabetesresetmethod.com"), u).toBe(true);
    }
  });
});
