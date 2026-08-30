# Landing Page: Conversion Truth, Real Product Previews, and Two App Adjustments

Backend- and design-system-preserving. No publication, no production deploys/migrations, no real payments, emails, or member data.

## What visitors will get

A landing page that shows the actual member app (real screenshots, labelled as example views), states exactly what happens on Day 1, uses one reliable checkout action everywhere, and sets honest expectations about access, community and pricing.

## 1. Navigation and checkout controls

Current state (verified): anchors `#how-it-works`, `#inside-the-membership`, `#pricing`, `#faq` each exist once. Header, hero, sticky CTA and the new tour CTA scroll with `scrollIntoView` only — no hash update, no focus move to the destination heading, no reduced-motion handling, and no fixed-header offset guarantee. Hero and header CTAs scroll to pricing; only Pricing and Final CTA open the modal.

- Add `src/lib/landingNav.ts`: one `goToSection(id)` that sets the hash, scrolls with `behavior: prefers-reduced-motion ? "auto" : "smooth"`, applies header-height scroll offset (`scroll-mt`), and moves focus to the section heading (`tabIndex={-1}`). Handles direct hash entry, reload and back/forward via a `hashchange`/mount effect on `Index`.
- Lift checkout state into a small `useCheckout()` hook / context in `Index.tsx` so header, hero, pricing, final CTA, sticky CTA and the new tour CTA all call the same `openCheckout()`. Hero and header become checkout openers (keeping "See inside the membership" as the anchor link).
- `PaymentModal`: keep architecture and fields; ensure the submit button cannot double-submit (already guarded by `isSubmitting` — add a test) and that failure shows an honest retry state.

## 2. Genuine app previews

- Add `src/test/fixtures/demoMember.ts` (test/dev-only, never imported by production code) plus a Playwright suite `tools/landing/capture_previews.py` that signs into an isolated local fixture, seeds synthetic onboarding/membership/program-day state through mocked network responses, and screenshots real routes: Today, Meals (shopping list "By meal"), Progress (glucose/A1C/weight/measurements/habits), Workouts + history, Learn guides, Ask/VITA and Community (only currently enabled behaviour, clearly distinguished), Printable report.
- Verify each capture against its live route before export. No AI-generated or retouched screens. No fasting, supplements, coaching, personalized health AI, device auto-sync or retired features in any capture.
- Optimised assets land in `src/assets/previews/` (WebP + fallback, explicit width/height). Every preview carries a visible "Example member view — illustrative data, not a member's results" caption that stays visible when enlarged.
- Report whether evidence was mocked or backend-authenticated. No auth/RLS/CORS weakening, no bypass route or query param.

## 3. Product tour placement

- New `src/components/landing/ProductTourSection.tsx`: a featured preview with accessible tabs (roving tabindex, clear selected state, 44px targets) for the other categories; captions describing what members can do; meaningful alt text; no autoplay.
- New `PreviewLightbox` built on the existing shadcn `Dialog`: accessible name, visible close button, Escape dismissal, focus trap and restore, background scroll lock, full-resolution asset loaded on demand only.
- Placement: Today preview inside/immediately beneath the hero; `Inside your membership` + tour before Founder/Audience/FAQ; a "Start 14 days for $27" CTA immediately after the tour with "Then US$67/month until canceled" beside it.
- Above-the-fold preview eager-loaded; the rest `loading="lazy"` with fixed aspect ratios to avoid layout shift.

## 4. Expectation accuracy

- Replace the "Instant access" trust badge (`PricingSection.tsx`) with "Access begins after your payment is confirmed", plus a calm note that the confirmation page shows confirmed vs. still-processing. No change to server-proven payment state logic.
- Community described as optional: "An optional member community space. Activity may be limited while the membership is growing."
- Add a "What you can do on Day 1" block mapped to real routes (Today action, Meals/recipes, health + habit logging at its real entry point, Learn guides, printable report).
- Preserve pricing, cancellation and Refund Terms wording exactly.

## 5A. Mindset: 20 seconds

Verified: the only duration is the hardcoded `30` in `MindsetCard` (`src/components/today/HabitLogging.tsx`) — timer gate, countdown label and comment. Change to a single `MINDSET_READ_SECONDS = 20` constant used by the gate and label, then grep Today/Dashboard/Learn for any other "30 second" Mindset label. Content, completion history and award idempotency unchanged; no global "30" replacement.

## 5B. Water: clear amounts, visible feedback

Verified: `useDailyHabits.addWater` optimistically adds then inserts into `water_logs` (canonical unit: whole ounces), reverting on error. Quick adds are 8/12/16 oz, custom input is oz-only. Dashboard tile renders through `HabitRing` with `target: null`.

- Add volume helpers to `src/lib/units.ts` (`flOzToMl`, `mlToFlOz`, US fl oz only — documented as distinct from Imperial/weight ounces) with unit tests; use them in every component.
- Replace the water tile's unfinished ring visual with a neutral water icon/badge and a prominent amount, same tile footprint. Display "Water logged today — N fl oz (≈ M mL)".
- Quick-add buttons labelled with both units; custom entry accepts mL or fl oz with a unit toggle that never alters the saved quantity or re-rounds it; existing validation (empty/negative/invalid rejected) preserved.
- Visible total update plus brief `aria-live` "Saved" feedback; optimistic update reverts with an honest retry state on failure. Today ↔ Dashboard stay in sync after navigation and reload.
- Helper copy: "Log the amount you actually drank. Check your glass or bottle size if you're unsure." and the existing not-a-target / fluid-limit guidance.
- No target, 64 oz default, percentage ring, calculator or second award RPC. The once-per-member-calendar-day `log_water` award and all other habit rings are untouched.

## 6. Expectation-parity matrix

One matrix in the report: exact public wording | actual route/component or policy | availability | evidence reference | limitation | disposition (keep/clarify/remove). Product claims reference screenshots; pricing/access/cancellation reference tested flows and configuration.

## 7. Verification (V01–V16)

Each recorded separately as PASS / FAIL / BLOCKED / NOT TESTED with evidence:
- V01–V04 Playwright: every nav and checkout instance (desktop + mobile), hash/focus/header-offset/back-forward, mocked checkout success/failure/duplicate-submit with the Stripe request intercepted so nothing reaches Stripe.
- V05–V07 gallery keyboard/pointer coverage, 390/768/1280 layouts, heading order, landmarks, alt text, contrast, 44px targets, reduced motion, 200% zoom.
- V08–V09 screenshot authenticity check and image weight: file sizes and initial transferred bytes recorded separately, same viewport/cache/throttle before/after.
- V10–V12 Mindset 20s consistency; water conversion/persistence/retry/unit-switch tests; existing water award, duplicate/replay/concurrency and calendar-day tests re-run green.
- V13 safe-claims scan across active content sources feeding changed public copy.
- V14 `tsgo` typecheck, lint on touched files, full Vitest suite, production build.
- V15 production bundle scan: preview assets present; no demo/auth/payment bypass, test credentials, member data or new source maps.
- V16 final desktop/mobile screenshots, Mindset/water evidence, fixture cleanup.
- Deno checks only if an Edge Function or shared module actually changes; otherwise recorded not applicable with the reason.

## 8. Deliverable

`docs/LANDING-PRODUCT-PREVIEW-COMPLETION-REPORT.md` with the customer summary, requirement checklist, parity matrix, V01–V16 results, commit identifiers and uncommitted changes, changed-file list, any prepared-but-unapplied dependency, test commands and totals, image/loading evidence, screenshot index, preview URL and how to find each change, synthetic-data handling and cleanup, and explicit confirmation of no publication, deployment, production data/config change, real payment, real email, external health-AI request or real-member mutation. Evidence screenshots stored together with one index; no ZIP, no duplicate report sets.

## Technical notes

- New files: `src/lib/landingNav.ts`, `src/components/landing/ProductTourSection.tsx`, `src/components/landing/PreviewLightbox.tsx`, `src/assets/previews/*`, capture/verification scripts under `tools/landing/`, focused tests under `src/test/`.
- Edited: `Index.tsx`, `SiteHeader.tsx`, `HeroSection.tsx`, `PricingSection.tsx`, `FinalCTASection.tsx`, `StickyBottomCTA.tsx`, `InsideMembershipSection.tsx`, `HabitLogging.tsx`, `useDailyHabits.tsx`, `Dashboard.tsx` water tile, `src/lib/units.ts`.
- Preflight stops the run if the connected project is not `wqennhjdojjqmmqzjhti` / `diabetesresetmethod.com`, or if isolation from Stripe, email, Dexcom and external AI cannot be proven before any synthetic write.
