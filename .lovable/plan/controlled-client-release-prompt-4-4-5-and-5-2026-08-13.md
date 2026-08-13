# Controlled client release — Prompt 4, 4.5 and 5

One publication of the client only. No database, Edge Function, secret, Stripe, webhook-event, email-flag, health-AI-flag or member-data change. No payment, refund, cancellation, dispute, deletion or email is issued.

Approved operational clarifications:

- The live VITA smoke test may create one clearly labelled synthetic anonymous visitor session, since session issuance is required to exercise live chat. Only the fixed product, login, cancellation and safe health-boundary questions are asked; no external health AI is called. The synthetic session, conversations, messages, consent and derived rows are deleted by exact ID immediately afterwards and zero residue is proven. This is the only permitted database write in the release test; no real visitor or member data is read or changed.
- The rollback record must include an actually restorable Lovable version / source commit alongside the asset hash. An asset hash alone is not described as a rollback mechanism.
- Normal authentication-session timestamps from the owner signing in are acceptable; the owner's profile, billing and lifecycle data are not altered.


## 1. Release boundary

- Record the currently published bundle as the documented rollback point (published URL asset hash + publish settings read).
- Produce the full inventory of unpublished client files and visible changes since that published state, each categorized as Prompt 4 (conversion-safe site, legal pages, retired routes, payment-truth UI), Prompt 4.5 (legal closeout, shared current-chat deletion, magic-link presentation) or Prompt 5 (Billing stability, canonical membership vocabulary, AuthGuard/account surfaces, restricted-state routing).
- Scan for anything outside that set: experimental features, test fixtures, draft banners, screenshot/payment bypass, health-AI activation, fabricated proof, unapproved design change.
- Hard-stop only on: an unrelated/unapproved client feature, a failing production build, a failing critical test, or the wrong Supabase project. Nothing already authorized by Prompts 4/4.5/5 stops the release.
- No automated legal/company release gate is reintroduced; pending UK company information keeps displaying through the approved calm notice with no raw placeholders.

## 2. Pre-publication gates (one pass over the complete client state)

- TypeScript check.
- Full Vitest suite.
- Deno tests for the webhook signature/lifecycle proofs.
- ESLint on files changed since the published client; unrelated repository debt reported separately, not fixed.
- Production build.
- Production-bundle scan proving absence of: DraftBanner, raw `[[...]]` placeholders, `state_fixture`/payment-verification bypass, `drm_visitor_id` authorization, retired local chat-consent flag, browser-stored anonymous chat token, health-AI activation, external redirect bypass.
- Route/access matrix across anonymous, allowed, grace, restricted_billing, suspended_dispute, restricted_deletion — covering direct entry, SPA navigation, refresh and sign-out, and asserting no redirect loop.

Required route behavior asserted by the matrix:

| State | Programme routes | Billing / Settings / Profile / Support |
|---|---|---|
| anonymous | Login | Login |
| allowed, grace | render | render |
| restricted_billing | calm redirect to Billing, stays signed in | render |
| suspended_dispute | calm redirect to Billing, stays signed in | render |
| restricted_deletion | Prompt 3 deletion lifecycle, outranks billing permissions | per deletion lifecycle |

Cancellation, authenticated export and account deletion stay reachable in restricted states. No Stripe identifier or internal reason code appears in a URL or in visible copy.

## 3. Preview verification (desktop and 390px)

Landing, Login, Privacy, Terms, Refunds, AI Use, Consumer Health Data Privacy, Data Rights, VITA open and closed, Billing, Settings, Support, Profile, payment success and cancellation, retired-route redirects.

Confirm: no red legal-review banner; all legal dates read August 12, 2026; no owner/counsel-review warning; pending UK-company notice is calm and truthful; price reads $27 for the first 14 days, then $67 per month until canceled; VITA and the sticky CTA do not collide; "Delete this chat" never reports false success; no mobile horizontal overflow.

No magic-link delivery test is run from preview — the preview origin stays excluded from ALLOWED_ORIGINS.

## 4. Publish once

If every critical gate passes and the inventory is only approved Prompt 4/4.5/5 work, publish the client once to https://diabetesresetmethod.com. No intermediate build. Record the new bundle/version and publication time; keep the prior version as the rollback point.

## 5. Live smoke test (read-only)

Public: `/`, `/login`, `/privacy`, `/terms`, `/refunds`, `/ai-use`, `/health-data-privacy`, `/data-rights`, retired-route redirects; VITA opens; deterministic price/login/cancellation answers work; a health question returns the safe unavailable response; no health text reaches an external AI service.

Authenticated (existing owner account only): Dashboard, Billing, Settings, Profile, Support open; cancellation, export and deletion controls render but are not activated; no redirect loop or unexpected sign-out; billing/lifecycle state untouched. Restricted states remain proven by the automated matrix only.

## 6. Stripe-event activation handoff

No Stripe Dashboard change. After publication and the live smoke pass, report READY FOR REFUND/DISPUTE EVENT ACTIVATION with destination `https://wqennhjdojjqmmqzjhti.supabase.co/functions/v1/stripe-subscription-webhook` and the four events `charge.refunded`, `refund.updated`, `charge.dispute.created`, `charge.dispute.closed` — stating whether they are already active (all 10 may remain active) or the owner must add them. No refund or dispute is manufactured; live delivery stays unobserved.

## Completion report

Previous and new published versions; complete published-change inventory; test/type/Deno/lint/build results; preview route and access matrix; live public and authenticated smoke results; confirmation that magic-link delivery was previously verified from the live domain; confirmation the preview origin remains excluded; confirmation that no database, secret, Edge Function, Stripe object, email flag, health-AI flag or real member data changed; Stripe-event status; any genuine launch blocker separate from later maintenance.
