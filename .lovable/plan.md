# Prompt 5 — Billing, Identity and Stripe Membership Lifecycle (B1–B5)

One continuous run on the live project. No publication, no real charge, refund, cancellation, member email or member-row mutation. Stripe Dashboard is read-only throughout.

## Resolved conflicts with the prompt as written

- **Magic-link sign-in stays enabled.** `auth_email_enabled` remains `true`; `transactional_automation_enabled` and `marketing_email_enabled` remain `false`. The prompt's "all three false" line is superseded.
- **No automated release gate.** The gate stays removed; publication is manual. Legal pages keep the pending-registration notice instead of raw placeholders.
- **International-processing text renders pending-safe** until `entity_status` becomes `active`, then switches automatically to the approved sentence.

## Part 0 — Owner-reviewed corrections (before B1–B5)

Legal presentation is largely already in place (no DraftBanner, dates already 2026-08-12, "Last updated: August 12, 2026" already displayed). Remaining work:

- Re-verify across Privacy, Consumer Health Data Privacy, AI Use, Terms, Refund Terms and Data Rights that no counsel/lawyer-approval requirement, "owner review required before publication" line, or raw `[[...]]` placeholder renders.
- Replace Privacy's retention wording with "unless a different period is required by law or adopted following an updated owner review."
- Apply the approved governing-law and privacy-appeal text exactly.
- Add the two-variant international-processing text keyed on `entity_status`.

### Current-chat deletion

Today `ChatWidget` and the Privacy page reach the chat token by different routes. Consolidate onto the single in-memory manager in `src/lib/chatSession.ts`:

- One opaque token per tab, created only when VITA is opened. Never in localStorage, sessionStorage, IndexedDB, cookies, URLs or logs.
- Sending, consent, merge and delete all use that token.
- Deletion from either surface removes conversation, messages, consent and derived rows, revokes the session and clears UI state.
- No token in this tab renders "There is no active chat in this tab to delete." — never "Deleted."
- A server failure preserves the token and shows failure. Repeat deletion is idempotent. Processor deletion is only claimed when verified.

## Part 1 — Stage 0 preflight and gap inventory

Confirm the connected project ref, record code SHA and migration head, and read (not write) the config flags: `stripe_mode`, `stripe_deletion_enabled`, `ai_health_enabled`, `dexcom_enabled`, `email_delivery_enabled`, `retention_mode`. Any value that differs from the stated expectation is reported, not silently changed.

Both Prompt 4 migrations are already in source control under their production timestamps (`20260812205011…`, `20260812205044…`) with rollback SQL retained, so the reproducibility check is a byte/catalog reconciliation only — no re-execution.

Produce the B1–B5 gap table (requirement / already satisfied / evidence / remaining change / test required) across: Billing page and hooks, checkout functions, both webhook functions, the account resolver, `orders` and `subscriptions`, access checks, cancellation, refund and dispute handling, deletion-triggered cancellation, admin billing views, billing copy, and the payment-success verifier.

## Part 2 — B1 Billing hook correctness

Audit `src/pages/app/Billing.tsx` and its hooks so every hook is called in a stable order before any conditional return, across loading, absent, active, grace, canceling, canceled, refunded, disputed and error states. Add an abort/generation guard so a slow response cannot overwrite a newer one, and prevent post-unmount state writes. Billing, cancellation, export and deletion stay reachable when paid content is blocked. Regression tests cover each state, refetch, auth transition, out-of-order responses, error recovery and sign-out.

## Part 3 — B2 shared identity resolver

`supabase/functions/_shared/findUserByEmail.ts` already pages past 200 but is only used by `send-magic-link`; `verify-checkout-session` and `stripe-subscription-webhook` still hold first-page scans.

Promote it to a shared resolver with the preferred order: stored immutable auth user id → exact normalized email through an indexed mapping → fully paginated admin lookup as a fallback only. It returns a discriminated result: `found` / `not_found` / `ambiguous` / `unavailable`. Ambiguous fails closed — never "pick the first". Browser-supplied ids and emails are never accepted as identity. Adopt it in both remaining call sites, keeping webhook retries idempotent and magic-link responses non-enumerating. Tests cover before/after the old boundary, whitespace and mixed case, new user, duplicate, missing, resolver outage, concurrent retries, and magic-link/webhook agreement — all with mocks or exact-ID synthetic fixtures with proven cleanup.

## Part 4 — B3 trusted checkout redirects

Stop deriving Stripe `success_url` / `cancel_url` from the request `Origin` (currently done in `create-subscription-checkout`). Build them from server config: canonical `APP_URL`, with approved preview origins permitted only through the existing exact-origin allowlist. Reject lookalike domains, suffix matches, userinfo URLs, non-HTTPS production URLs, localhost, encoded and malformed variants. Retired products keep returning 410 before any Stripe or database activity. Stripe metadata stays on the existing allowlist — no health data, no browser identifiers.

## Part 5 — B4 webhooks and canonical status vocabulary

Read-only reconfirmation of both live-mode destinations, their event lists, and that each signing secret is present, `whsec_`-class and distinct by digest comparison only. No Dashboard changes.

Signature isolation tests: correct secret accepts a synthetic signed fixture; each endpoint rejects the other's secret; missing and forged signatures fail before any database activity; no secret or full payload is logged.

Document one canonical status mapping and make every reader and writer use it:

```text
order        pending | paid | failed | refunded | partially_refunded | disputed | canceled
subscription incomplete | trialing | active | past_due | unpaid | canceled_at_period_end | canceled
access       allowed | grace | restricted_billing | restricted_deletion | suspended_dispute
```

Existing values (for example the `completed` order status written today) are mapped explicitly through an additive, reversible migration with before/after counts; unknown historical values are preserved for review, not guessed. Ordering is enforced with Stripe event id plus event creation time so a stale event cannot roll membership backward. Tests cover duplicate, delayed, reordered, concurrent and unknown events, checkout-before/after subscription update, failure and recovery, cancellation both ways, refund, partial refund, and dispute opened/won/lost.

## Part 6 — B5 lifecycle evaluator

One shared evaluator returning `access_state`, `reason`, `effective_until`, `grace_expires_at`, `allowed_surfaces`, consumed by route guards, Billing UI, dashboard checks, payment-success readiness, cancellation UI, admin display and backend authorization. No Stripe identifiers reach the browser.

Policy implemented exactly as approved: paid/trialing/active allow ("your first 14 days", never "free trial"); `past_due` allows a seven-calendar-day grace from the first verified failed-payment event, which retries never restart and recovery clears idempotently; after grace, paid content is restricted while Billing, Settings, support, cancellation, export and deletion remain; cancel-at-period-end runs through the verified period end with the exact date shown; full refund revokes the associated access; partial refund flags for owner review without revoking; a dispute suspends paid content and a won dispute restores idempotently; deletion restriction from Prompt 3 always wins. Grace and restriction copy uses the approved calm wording. Tests cover every policy row at the boundary immediately before, at and after each transition, in UTC and in the member's display timezone.

## Verification

Vitest (B1–B5 plus checkout-verification, deletion-cancellation and retired-checkout regressions), TypeScript, relevant Deno tests, ESLint on touched files, preview build, and boot/CORS smoke for changed functions only. Only changed Edge Functions are deployed. Zero synthetic residue, no live Stripe mutation, no publication.

## Report

A single consolidated Prompt 5 report: gap table, files/migrations/functions changed, hook regression results, resolver architecture and boundary tests, redirect proof, webhook verification without exposing values, canonical status mapping, lifecycle access matrix, migration reconciliation and rollback, test/type/lint/build/smoke results, preview URL, confirmations that nothing was published or mutated, the unchanged UK-company placeholders, and any genuine launch blocker separated from later maintenance.
