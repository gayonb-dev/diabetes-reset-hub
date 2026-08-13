# Prompt 5 — Billing, Identity and Stripe Membership Lifecycle (B1–B5)

One continuous run on the live project. Nothing is published. No real charge, refund, cancellation, dispute action, authentication or member email, and no mutation of any real member row. Stripe Dashboard and all live Stripe objects are read-only throughout; no Checkout Session is created during tests.

## Standing constraints

- **Magic-link work is frozen.** `auth_email_enabled=true`, `transactional_automation_enabled=false`, `marketing_email_enabled=false` are preserved as-is. `send-magic-link`, Login copy, rate limits, delivery rules and public responses are not changed. No authentication email is sent in Prompt 5. Any extension of `_shared/findUserByEmail.ts` stays backward compatible with the proven magic-link caller, and the existing magic-link regression suite is rerun to prove zero behavioural change.
- **The owner's real email-delivery test remains outstanding** and is reported as a separate owner action. A `true` flag is not evidence of delivery.
- **No automated release gate**, and no legal wording switches automatically from a status field.
- **No real member-row mutation.** Canonicalization is additive only.

## Part 0 — Legal verification and current-chat deletion

### Legal

Verify across Privacy, Consumer Health Data Privacy, AI Use, Terms, Refund Terms and Data Rights:

- No DraftBanner or red draft bar renders; dates read 2026-08-12 and "Last updated: August 12, 2026" is displayed on all six.
- No counsel/lawyer-approval requirement and no "owner review required before publication" line remains. Privacy's retention wording becomes "unless a different period is required by law or adopted following an updated owner review."
- The approved governing-law, international-processing and privacy-appeal texts are applied.
- No raw `[[...]]` placeholder renders. The pending-company notice stays in place and only changes when the owner manually supplies and approves all five values: registered company name, company number, registered jurisdiction, registered-office address and effective update date. There is no automatic switch on `entity_status`.

### Current-chat deletion

`ChatWidget` and the Privacy page currently reach the chat token by different routes. Consolidate both onto the single in-memory manager in `src/lib/chatSession.ts`:

- One opaque token per tab, created only when VITA is opened; never in localStorage, sessionStorage, IndexedDB, cookies, URLs or logs. Deleting never starts a session in order to delete one.
- Sending, consent, merge and delete all use that token. Deletion from either surface removes conversation, messages, consent and derived rows, revokes the session and clears UI state.
- No token in this tab renders "There is no active chat in this tab to delete." — never "Deleted."
- Server failure preserves the token and reports failure. Repeat deletion is idempotent and cannot delete another chat. Outside-processor deletion is claimed only when verified.
- Tests: synthetic chat deleted from VITA; synthetic chat deleted from Privacy after same-tab SPA navigation; reload/new tab shows no-active-chat; server failure; cross-session and forged token; repeated deletion; exact-ID cleanup proving zero residue.

## Part 1 — Stage 0 preflight and gap inventory

Confirm the connected Supabase project is production ref `wqennhjdojjqmmqzjhti`. A different ref is a hard stop. Record code SHA and migration head, then read (never write) the expected configuration:

```text
stripe_mode=live                          ai_health_enabled=false
stripe_deletion_enabled=true              dexcom_enabled=false
email_delivery_enabled=false              retention_mode=report_only
auth_email_enabled=true                   transactional_automation_enabled=false
marketing_email_enabled=false
```

Any differing flag value is reported and investigated, never silently changed.

Both Prompt 4 migrations already exist in source control under their production timestamps (`20260812205011…`, `20260812205044…`) with rollback SQL retained, so this is catalog reconciliation only — no re-execution.

Produce the B1–B5 gap table (requirement / already satisfied / evidence / remaining change / test required) across Billing page and hooks, checkout functions, both webhook functions, the account resolver, `orders` and `subscriptions`, access checks, cancellation, refund and dispute handling, deletion-triggered cancellation, admin billing views, billing copy and the payment-success verifier.

## Part 2 — B1 Billing hook correctness

Make every hook in `src/pages/app/Billing.tsx` and its subscription hooks run in a stable order before any conditional return, across loading, absent, active, grace, canceling, canceled, refunded, disputed and error states. Add a generation/abort guard so a slow response cannot overwrite a newer one, and prevent post-unmount state writes. Billing, cancellation, export and deletion stay reachable when paid content is blocked. Tests cover each state, refetch, auth transition, out-of-order responses, error recovery, sign-out and rules-of-hooks compliance.

## Part 3 — B2 reliable identity resolution

`_shared/findUserByEmail.ts` already pages beyond 200 but only `send-magic-link` uses it; `verify-checkout-session` and `stripe-subscription-webhook` still carry first-200 scans.

Wrap it in a shared resolver, additively and backward compatibly, resolving in order: stored immutable auth user id on the trusted local record → exact normalized email through a reliable indexed mapping → fully paginated admin lookup as a controlled fallback, not the hot path. It returns a discriminated result — `found` / `not_found` / `ambiguous` / `unavailable` — and ambiguous fails closed rather than taking the first row. Browser-supplied ids and emails are never identity. Adopt it in the two remaining call sites only; magic-link behaviour is unchanged and reverified.

Tests: existing user before and after the former 200 boundary and beyond 1,000/10,000, mixed case and whitespace, new user, duplicate/ambiguous, missing, resolver outage, concurrent webhook retries, magic-link/webhook agreement, and no duplicate auth user, profile, role, order or subscription. Mocks or exact-ID synthetic fixtures with proven cleanup; no real production auth users created.

## Part 4 — B3 canonical checkout redirects

Stripe `success_url` and `cancel_url` are always derived from the server-held canonical `https://diabetesresetmethod.com`. Request `Origin`, `Referer`, forwarded host headers and any client input are never used to build a production redirect. The exact-origin allowlist may authorize preview requests for non-mutating testing, but it never determines a Stripe redirect destination. Lookalike domains, suffix matches, subdomain tricks, userinfo URLs, non-HTTPS, localhost, encoded and malformed variants are rejected. Retired products keep returning 410 before any Stripe or database activity. Stripe metadata stays on the existing allowlist — no health data, browser identifiers or arbitrary client metadata. No Checkout Session is created in tests.

## Part 5 — B4 webhooks, ordering and canonical vocabulary

### Read-only endpoint and event-coverage truth

Reconfirm both live-mode destinations, their subscribed events, and that each signing secret is present, `whsec_`-class and distinct by digest comparison only. Compare each destination's subscribed events against what the implemented lifecycle requires, assessing at minimum `checkout.session.completed`, `customer.subscription.created/updated/deleted/paused/resumed`, `invoice.paid`, `invoice.payment_failed`, existing checkout completion/expiration events, `charge.refunded` (or chosen equivalent) and `refund.updated` where asynchronous outcomes apply, `charge.dispute.created` and `charge.dispute.closed`. Delayed-payment events are assessed only if enabled payment methods settle asynchronously.

No Dashboard configuration changes. Missing subscriptions do not stop other work: the code and synthetic tests are finished, the affected lifecycle states are marked "implemented but not live-event verified", and one consolidated owner-action list names the exact destination and events to add. Refund, dispute, recovery and cancellation handling are not called launch-ready until those subscriptions exist and a real future delivery has been observed.

### Signature isolation

Correct secret accepts a synthetic signed fixture; each endpoint rejects the other's secret; missing and forged signatures fail before any database activity; no secret, full payload or unnecessary PII is logged.

### Ordering and idempotency

Not `event.created` alone. Implement unique processing keyed by Stripe event id with a processing/processed state and a safe concurrent claim; idempotent replay; resource association by immutable Stripe ids; re-retrieval of the current object from Stripe for potentially stale subscription, invoice, refund and dispute events; monotonic transition rules so an old snapshot cannot overwrite newer verified state; explicit handling of equal timestamps across different event types; and no provisioning or access grant from unverified payload data.

Synthetic tests cover duplicates, concurrency, delayed delivery, reverse ordering, recovery, unknown event types and invalid signatures — without creating live Stripe objects.

### Canonical model, applied additively

```text
order_status            pending | paid | failed | partially_refunded | refunded | disputed | canceled
subscription_status     incomplete | incomplete_expired | trialing | active | past_due |
                        unpaid | paused | canceled
subscription_conditions cancel_at_period_end: boolean
                        current_period_end: timestamp
                        first_payment_failed_at: timestamp | null
access_state            allowed | grace | restricted_billing | restricted_deletion | suspended_dispute
```

Cancel-at-period-end is a condition, not a status. The raw Stripe status is preserved for reconciliation. Stripe stays the processor source of truth; the database is the application source of truth only after a verified, idempotently applied event.

No existing `orders.status`, `subscriptions.status`, access, billing-identity or other real member row is rewritten. Canonicalization is delivered through a billing-event ledger, normalized views/functions or additive fields, explicit read-time mapping of historical values, and canonical writes for future verified events only. If a historical backfill still looks warranted, it is proposed — exact table, old value, proposed new value, row count, rollback, and why read-time mapping is insufficient — and left unapplied pending separate owner approval. Unknown historical values remain review items and are never guessed.

## Part 6 — B5 lifecycle enforcement

One shared evaluator returning `access_state`, `reason`, `effective_until`, `grace_expires_at`, `allowed_surfaces`, used by route guards, Billing UI, dashboard checks, payment-success readiness, cancellation UI, admin display and backend authorization. It is enforced server-side as well as displayed in the client — client route guards alone are not authorization, so protected backend reads/writes and paid member functions enforce the resulting state. No Stripe identifiers reach the browser.

Entitlement rules:

- A `trialing` subscription does not independently prove entitlement. Access during the first 14 days requires both the matching initial order verified as paid **and** the associated membership subscription in an eligible state. Member-facing wording says "your first 14 days", never "free trial".
- `past_due` gets a seven-calendar-day grace beginning at the first verified failed-payment event of that delinquency episode. Duplicate deliveries and retries cannot restart it; a verified recovery clears it idempotently. After expiry, paid content is restricted while Billing, Settings, support, cancellation, authenticated export and deletion remain available.
- Cancel-at-period-end runs through the verified `current_period_end` with the exact date shown, is never described as a refund, requires no call or retention offer, and is idempotent on repeat.
- A full refund revokes only the entitlement associated with that refunded payment; access supplied by another independently valid order or subscription is untouched. A partial refund creates an owner-review state and revokes nothing automatically.
- A dispute suspends the associated paid entitlement while preserving account controls. Closing a dispute restores access only when current Stripe payment/subscription state independently qualifies — never merely because an event says won. Processor action is never labelled complete without direct processor confirmation.
- Prompt 3 deletion restriction overrides every billing state.

Grace and restriction copy uses the approved calm wording. Tests cover every policy row at the boundary immediately before, at and after the introductory-period end, current-period end, grace expiry, cancellation effective time, refund confirmation and dispute transitions, in UTC and in the member's display timezone.

## Part 7 — Deterministic abuse-protection closeout

Complete the outstanding Prompt 4.5 no-cost abuse work by reusing the existing Prompt 3 HMAC-keyed trusted-ingress rate limiter in `_shared/ratelimit.ts`. No second rate-limit system, no AI moderation, no paid firewall, no Turnstile.

- Cover public write endpoints, checkout creation, chat, support and sensitive authenticated requests.
- Reject unsupported methods, content types, malformed input and oversized bodies before any database, Stripe, email or AI work.
- Temporary limits only, answered with 429 plus `Retry-After`. No automatic permanent bans.
- No raw IP, email, token, authorization header or health content in logs.
- Cancellation, refund requests, support, authenticated export, deletion and privacy appeals remain available, but their endpoints may use proportionate temporary rate limits to prevent abuse. A rate-limited person receives a clear retry time and, where applicable, the monitored contact `info@diabetesresetmethod.com`. Temporary automated limits must not become a permanent denial of these rights or account controls.
- Server-to-server behaviour is preserved: Stripe webhooks keep accepting correctly signed requests with no browser `Origin`, and cron/internal functions keep their existing secret authentication. Browser-origin requirements are never applied to legitimate Stripe, cron or internal service calls. Authentication and signature verification remain mandatory.

## Verification

Vitest (Part 0 chat-deletion, B1–B5, plus checkout-verification, deletion-cancellation, retired-checkout and the untouched magic-link regressions), TypeScript, relevant Deno tests, ESLint on touched files with the repository baseline reported separately, preview build, and boot/CORS smoke for changed functions only. Only changed Edge Functions are deployed. Zero synthetic residue; no live Stripe mutation; no publication.

## Report

One consolidated Prompt 5 report, split into **implemented and proven**, **implemented but awaiting a live future event**, **owner action required**, and **later maintenance**, containing: the B1–B5 gap table, files/migrations/functions changed, hook regression results, resolver architecture and boundary tests, redirect proof, webhook endpoint/secret verification without exposing values, the event-coverage comparison and owner-action list, canonical status mapping, lifecycle access matrix, migration reconciliation and rollback, abuse-control coverage, test/type/lint/build/smoke results, preview URL, and the pending UK company fields.

The report will not claim that real email delivery was proven, that a live refund or dispute was tested, that missing Stripe event subscriptions are active, that historical billing rows were migrated when only read-time mapping was implemented, that the pending UK company exists, or that the client was published.
