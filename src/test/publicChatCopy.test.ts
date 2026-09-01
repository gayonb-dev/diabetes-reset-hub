/**
 * Prompt 6 Stage 0, public VITA membership answers and safe CTA rendering.
 */
import { describe, it, expect } from "vitest";
import {
  matchFaq,
  PUBLIC_CHAT_DESTINATIONS,
  isApprovedChatPath,
  fallbackUrl,
} from "../../supabase/functions/_shared/copy";
import { safeCta } from "@/lib/chatCta";

const BANNED = [/revers/i, /7[-\s]?day reset/i, /sprint/i, /free trial/i, /\bcures?\b/i, /the button below/i];

function allBodies() {
  const keys = ["what is this all about", "how do i sign up", "how much does it cost", "how do i log in", "how do i cancel"];
  return keys.map((k) => matchFaq(k)).filter(Boolean).map((f) => f!.body);
}

describe("deterministic membership answers", () => {
  it("answers 'what is this all about' with a truthful product description", () => {
    const a = matchFaq("What is this program all about and how do I sign up?");
    expect(a?.key).toBe("about");
    expect(a?.body).toContain("self-guided educational membership");
    expect(a?.body).toContain("US$27");
    expect(a?.body).toContain("US$67");
    expect(a?.body).toContain("does not diagnose, treat or promise to reverse diabetes");
    expect(a?.action).toEqual({ label: "View membership and pricing", path: "/#pricing" });
  });

  it("never contains banned claims", () => {
    for (const body of allBodies()) {
      for (const re of BANNED) {
        // the About answer denies reversal explicitly; allow that exact denial
        const cleaned = body.replace("does not diagnose, treat or promise to reverse diabetes", "");
        expect(re.test(cleaned), `${re} matched: ${cleaned}`).toBe(false);
      }
    }
  });

  it("gives the pricing action for explicit signup requests", () => {
    for (const t of ["how do I join?", "send me the link", "I'm ready", "where do I start"]) {
      const a = matchFaq(t);
      expect(a?.action?.path).toBe("/#pricing");
    }
  });

  it("routes cancellation to /refunds and login to /login", () => {
    expect(matchFaq("how do I cancel?")?.action?.path).toBe("/refunds");
    expect(matchFaq("how do I log in?")?.action?.path).toBe("/login");
  });
});

describe("follow-up handling", () => {
  it("treats a bare 'yes' after the About answer as signup intent", () => {
    const a = matchFaq("yes", "faq_about");
    expect(a?.key).toBe("signup");
    expect(a?.action?.path).toBe("/#pricing");
    expect(a?.body.length).toBeLessThan(120);
  });

  it("treats 'yes, how?' after the price answer as signup intent", () => {
    expect(matchFaq("yes, how?", "faq_price")?.key).toBe("signup");
  });

  it("does not read a bare 'yes' as signup without signup context", () => {
    expect(matchFaq("yes", "faq_login")).toBeNull();
    expect(matchFaq("ok", null)).toBeNull();
  });

  it("does not restart the sales script, the follow-up is short and single-action", () => {
    const a = matchFaq("yes", "faq_about")!;
    expect(a.body).not.toMatch(/\?/);
    expect(a.action).not.toBeNull();
  });
});

describe("health wording still wins", () => {
  it("leaves health questions to the health gate", () => {
    expect(matchFaq("my blood sugar is 250, what should I do?")).toBeNull();
    expect(matchFaq("should I stop my metformin to join?")).toBeNull();
  });
});

describe("CTA allow-list", () => {
  it("only approves the four destinations", () => {
    expect([...PUBLIC_CHAT_DESTINATIONS]).toEqual(["/#pricing", "/login", "/refunds", "/privacy"]);
    expect(isApprovedChatPath("/#pricing")).toBe(true);
    expect(isApprovedChatPath("https://evil.example.com")).toBe(false);
    expect(isApprovedChatPath("/app/billing")).toBe(false);
  });

  it("renders only server-approved structured actions", () => {
    expect(safeCta({ type: "link", label: "Go", path: "/#pricing" })).toEqual({
      label: "Go",
      path: "/#pricing",
    });
    expect(safeCta({ type: "link", label: "Go", path: "https://evil.example.com" })).toBeNull();
    expect(safeCta({ type: "checkout", label: "Go", path: "/#pricing" })).toBeNull();
    expect(safeCta("https://evil.example.com")).toBeNull();
    expect(safeCta(null)).toBeNull();
  });

  it("produces a truthful plain-text fallback URL", () => {
    expect(fallbackUrl("/#pricing")).toBe("https://diabetesresetmethod.com/#pricing");
  });
});
