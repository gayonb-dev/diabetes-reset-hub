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
