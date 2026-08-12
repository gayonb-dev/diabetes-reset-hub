# Prompt 4 Closeout Correction — Retired Routes, Route Tests, Verification Evidence

Scope: fix retired-route behavior, add focused route tests, and produce the missing §17 verification evidence. No redesign, no Prompt 3 rework, no migrations applied, no publish, no live payments/emails/AI-health calls.

## 1. Retired-route behavior (corrected)

Currently `/intake`, `/book`, `/6-week-reset` all redirect to `/`, and `/progress` still renders the legacy 5-day tracker page. Correct to:

| Route | Anonymous | Authenticated |
| --- | --- | --- |
| `/intake` | `/login?next=%2Fapp%2Fonboarding` | `/app/onboarding` |
| `/progress` | `/login?next=%2Fapp%2Fprogress` | `/app/progress` |
| `/book` | `/#pricing` (permanent) | `/#pricing` |
| `/6-week-reset` | `/#pricing` (permanent) | `/#pricing` |

Implementation:
- Add a small `RetiredRouteRedirect` component that reads auth state (`useAuth`) and renders `<Navigate replace>` to the authed or anonymous target once loading resolves (render nothing while loading, so no flash to `/login` for signed-in members).
- Wire `/intake` and `/progress` through it; `/book` and `/6-week-reset` become static `<Navigate replace to="/#pricing">`.
- The legacy `ProgressTracker` page component is no longer routed. Leave the file in place, unrouted (no content restoration, no deletion needed for this closeout) — or delete if it has no other importer; verified during implementation.

## 2. Legacy $497 offer surfaces

- `supabase/functions/create-checkout-session/index.ts` still defines the `six-week-reset-497` product ($49,700). Disable it: the function rejects that product key with a 410-style JSON response pointing at `/#pricing`; no checkout session is created. The $27/$67 membership path is untouched.
- Remove the stale 6-Week Reset upsell sentences in `stripe-webhook` and `send-progress-summary` email copy (text-only edits, no logic change).
- No retired form, coaching, booking, WhatsApp, health-data collection, or $497 content is restored anywhere.

## 3. Focused automated route tests

New `src/test/retiredRoutes.test.tsx` (vitest + Testing Library, mocked `useAuth`, `MemoryRouter`):
- `/intake` anonymous → `/login?next=%2Fapp%2Fonboarding`; authenticated → `/app/onboarding`.
- `/progress` anonymous → `/login?next=%2Fapp%2Fprogress`; authenticated → `/app/progress`.
- `/book` → `/#pricing`; `/6-week-reset` → `/#pricing`.
- Any other stale offer route discovered during the sweep gets a case in the same file.

New `src/test/nextParam.test.ts` for the `next` allowlist used by `Login`/`AuthGuard`:
- Preserves same-site paths (`/app/progress`, `/app/onboarding`, with query/hash).
- Rejects `https://evil.com`, `//evil.com`, `\\/evil.com`, `javascript:...`, backslash and encoded variants, and empty/malformed values (falls back to the default destination).

## 4. Verification evidence to produce (read-only)

Run and report in full:
- Banned-claim scan across `src/`, `index.html`, `public/`, and legal pages — every hit listed with disposition (removed / allowed-in-context / false positive).
- ESLint, production build (`vite build`), and full vitest run (including the 3 known pre-existing `mealTiming.test.ts` failures, reported as pre-existing).
- Accessibility pass (heading order, landmarks, focus visibility, 44px targets) on landing + legal routes.
- Route/funnel matrix (all retired + live routes, expected vs actual), sitemap check, structured-data check, footer-link check.
- `verify-checkout-session` state/test matrix: `checking`, `verified`, `processing` (+ poll exhaustion), `unverified` (no/invalid `session_id`), `failed` (expired session), `error` — exercised against the function's input validation and the page state machine using synthetic session ids only, never a live payment.
- Desktop (1280px) and mobile (390px) screenshots via headless Chromium for: hero, product proof, first 14 days, audience fit, founder, pricing, FAQ, each legal page (`/privacy`, `/terms`, `/refunds`, `/ai-use`, `/health-data-privacy`, `/data-rights`), payment-success verified and unverified states, and VITA/sticky-CTA open + closed.
- Full list of unresolved `[[...]]` legal placeholders, plus confirmation that the release gate (`src/test/legalGates.test.ts` + preview-only `DraftBanner`) fails the build while any placeholder or the draft banner can reach production.

## 5. Left untouched

- `supabase/migrations-pending/01_profiles_column_grants.sql` and `02_win_posts_reaction_counts.sql` stay prepared and unapplied.
- All other completed Prompt 4 work, S1–S4, and Prompt 3 controls preserved.

## Deliverable

One corrected §17 completion report in chat. Nothing published.

## 6. Corrections (override conflicting wording above)

**Redirects.** Lovable hosting has no `_redirects`/config-file redirect support, so true HTTP 301/308 for `/book`, `/6-week-reset`, and other stale-offer routes is not available. Use `<Navigate replace>` as the accepted fallback: render no retired content before navigation, add `noindex` plus a canonical to `/` (pricing anchor) on those route stubs, never describe it as an HTTP permanent redirect, and record the platform limitation plainly in the report.

**Retired $497 checkout.** Reject `six-week-reset-497` at the top of `create-checkout-session`, before any Stripe client construction, Stripe call, or order insert. Return a real HTTP 410 with `{ error, replacement: "/#pricing" }`. Add a focused Deno/vitest-level test proving: status 410, zero Stripe network calls, no order row created, and the $27/$67 membership path unchanged. Sweep both checkout functions and every active product/price registry for other retired keys and handle them the same way.

**Banned-content scan scope.** Scan `src/`, `public/`, `index.html`, `supabase/functions/`, email and notification templates, admin-managed content and defaults, AI prompts and knowledge/context, seed/default content, sitemap, robots, structured data, and `llms.txt`. Only tests, historical evidence, migration docs, and narrowly necessary rejection tests may be excluded — each exclusion listed individually in the report.

**Payment-state mapping.** Five outcomes exactly: `checking` ("Confirming your membership."), `verified` (payment verified, account ready), `processing` (verified but provisioning pending), `unverified` (missing, malformed, mismatched, unpaid, **expired**, wrong-mode, wrong-product, wrong-price, wrong-amount, or otherwise unverified), `error` (processor unavailable/timeout). Remove the current `failed` mapping for expired sessions and fold it into `unverified`. Verified-state screenshots come only from a test-only fixture that cannot be reached from a production URL; a synthetic session id must never make the real function report verified.

**Legal publication gate.** Add a production-release build guard (a prebuild/verify script the release path runs, not only `legalGates.test.ts`): preview builds may succeed with placeholders while showing `DraftBanner`; a production-release build fails while any `[[...]]` placeholder remains and fails if `DraftBanner` can reach the production bundle. The report includes an intentional production-release build attempt showing it is currently blocked. The gate is not removed or bypassed until owner fields and counsel approval arrive.

**Accessibility verification.** Full authority checklist: 320px reflow and 390px layout, keyboard order and visible focus, skip link and landmarks, accessible labels/instructions/errors, dialog focus management and Escape, no focus trapped behind VITA or the sticky CTA, text and interface contrast, reduced-motion behavior, meaningful alt text, icon-plus-text status communication, and 44px minimum touch targets.

**Pending migrations.** Both stay unapplied. Since their Member A / Member B / anonymous / backend tests require controlled application to an isolated non-production database, report them as `PREPARED — NOT EXECUTED` (never verified/passed), with those tests recorded as a required release-window gate after controlled application.
