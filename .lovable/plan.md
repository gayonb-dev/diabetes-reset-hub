# Landing Page: Rebuild for Conversion

Turn the compliant brochure into a direct-response sales page. No new features, no backend work, no pricing changes, no publication. Copy, structure and CTA presentation only.

## What's wrong today (diagnosis)

- Headline describes the product, not the visitor's problem.
- Zero social proof or founder credibility anywhere on the page.
- The 30-day guarantee appears once, in grey fine print under one button.
- No price anchoring — "$27" floats with nothing to compare it to.
- Six calm feature sections; nothing creates the tension a purchase resolves.
- The same flat CTA label repeats six times.
- Objections are answered in an FAQ eight screens below the point of hesitation.

## The changes

### 1. Hero — lead with the problem
Replace the category headline with problem-first, direct-response copy in the visitor's own words: the daily confusion of knowing what you *should* do and not knowing what to do *today*. Keep the real Today screenshot, the trust row and the exact pricing line. New CTA label focused on the outcome of clicking, not the transaction. Add the guarantee badge directly under the button.

### 2. Founder story — the strongest asset on the page
Rewrite the founder section around the real coached client, told as first-person experience:
- long-standing diabetes, doctor approving every step
- 200 lbs to 145 lbs, no diabetes medication, no insulin
- what she actually did: 25-25-50 portion rule, no sweets, daily movement
- why that turned into an app: most people can't afford one-on-one, so the system was put into a $27 membership

Mandatory framing, non-negotiable for medical compliance:
- clearly labelled as one individual's experience under her own doctor's supervision
- explicit line: "This is one person's result, not typical, and not what DRM promises. DRM is educational and never tells you to change medication."
- no "reversal", no "cure", no implied average outcome
- the 25-25-50 portion rule is named as a real thing inside the membership, connecting story to product

**Before this goes live you need her written permission to publish her story.** The plan builds it; you confirm consent before publishing.

### 3. Guarantee front and centre
A visible risk-reversal badge under every primary CTA: 30-day money-back guarantee, cancel in the app, no phone call, no retention survey. Plus a dedicated risk-reversal block above the pricing card that reframes the decision as "try it, decide later".

### 4. Price anchoring
Rework the pricing card: anchor $27 against the $67 monthly rate and against what 14 days of it costs per day (under $2/day). State plainly what happens on day 15 — no dark patterns, honesty is itself a conversion lever here.

### 5. Objection handling at the button
Move the four objections that actually block a $27 purchase — "will it charge me again?", "can I cancel easily?", "is this instead of my doctor?", "do I have to do all of it?" — into short inline answers next to the pricing CTA. Reorder the FAQ so money and cancellation questions come first.

### 6. Sharper CTAs and section copy
- Distinct CTA labels by position instead of six identical buttons.
- Tighten the three "one useful next step" cards and the Day 1 list into benefit-led lines rather than feature descriptions.
- Add a short "what your first week actually looks like" narrative bridge before pricing.

### 7. Order of the page
Hero → problem → what you get on Day 1 → founder story + client proof → inside the membership / tour → who it's for and not for → pricing with guarantee → FAQ → final CTA.

## Technical notes

- Files touched: `HeroSection.tsx`, `FounderSection.tsx`, `PricingSection.tsx`, `FinalCTASection.tsx`, `SimplerStepSection.tsx`, `DayOneSection.tsx`, `FirstFourteenDaysSection.tsx`, `FAQSection.tsx`, `SiteHeader.tsx`, `StickyBottomCTA.tsx`, `Index.tsx` (section order), plus one small shared `GuaranteeBadge` component.
- Semantic tokens only; no raw hex. Existing checkout context, `PaymentModal`, anchors, hash navigation, reduced-motion and 44px touch targets all stay exactly as they are.
- Meta title/description and FAQ JSON-LD updated to match the new copy.
- No claims of clinical approval, no invented numbers, no fake testimonials.
- Verify at 1280×800 and 390×844: no overflow, CTAs open the modal, anchors still land correctly.
- Run tests, TypeScript and lint. Existing safe-claims tests may need their allow-list reviewed where the founder story is concerned — the story is the only outcome language on the page and it is attributed, disclaimed and consented.
