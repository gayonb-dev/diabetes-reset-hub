# Prompt 4.5 — Section 10 correction: magic-link sign-in stays enabled

Scope: only the magic-link login path and the config flags it depends on. No changes to marketing, reminders, digests, check-ins, or any other Prompt 4.5 section.

## Current state (verified)

- `app_config` today holds: `ai_health_enabled=false`, `dexcom_enabled=false`, `email_delivery_enabled=false`, `email_test_allowlist=[]`, `phi_notice_version`, `retention_mode`, `stripe_deletion_enabled`, `stripe_mode=live`. There is **no** `auth_email_enabled`, `transactional_automation_enabled` or `marketing_email_enabled` key.
- `send-magic-link` sends through the shared `sendEmail` gate, which requires `email_delivery_enabled=true` **and** the recipient to be on `email_test_allowlist`. Both are currently closed, so magic-link email is suppressed today. This is the configuration this task corrects.
- `send-magic-link` finds the member with `listUsers({ page: 1, perPage: 200 })` — a member beyond the first 200 accounts silently gets no link. The same first-page-only pattern also exists in `verify-checkout-session` and `stripe-subscription-webhook`; those two are **recorded for Prompt 5 and not edited in this task**.

## 1. Config flags (applied and verified before any deploy)

New migration adding three keys and leaving existing ones untouched:

- `auth_email_enabled = true`
- `transactional_automation_enabled = false`
- `marketing_email_enabled = false`

`email_delivery_enabled` stays `false`; it now governs only automated/marketing member email. Auth email no longer reads it. Config helpers gain `authEmailEnabled()` (defaults **true** — auth must not fail closed into a lockout).

Order of operations: apply the migration, query `app_config` to confirm `auth_email_enabled=true`, and only then deploy `send-magic-link`. If that verification fails, the function is not deployed. No migration, deployment or rollback step turns the flag off, so sign-in has no disabled interval.

## 2. Auth email path independent of the marketing gate

- Add an auth-specific send path in `_shared/email.ts` (`sendAuthEmail`) that checks only `auth_email_enabled`, never `email_delivery_enabled` and never the test allowlist.
- Provider outcomes are recorded internally (status only) and never surfaced per-recipient.

## 3. Shared user-by-email resolver (magic-link only)

New `_shared/findUserByEmail.ts`:

- Normalizes with trim + lowercase.
- Pages through the admin listing until a match is found or pages are exhausted, with a hard page cap and bounded page size.
- Returns `{ userId } | null` only — never accepts or trusts a client-supplied user id.
- Logs nothing containing an email address.

Adopted by `send-magic-link` only. `verify-checkout-session` and `stripe-subscription-webhook` are untouched and carried into Prompt 5.

## 4. Strict server-side `next` validation

The server applies the same strict same-site rules as the tested client helper (shared logic, mirrored in `_shared/safeNext.ts`): a leading `/` is not sufficient. Rejected: absolute URLs, protocol-relative `//host`, backslash and mixed slash/backslash forms, encoded slash/backslash bypasses, `javascript:` and any other scheme, malformed, empty or control-character values. Allowed: `/app/...` paths with safe query strings and fragments. Anything invalid falls back to the default member destination `/app`.

## 5. Reliability and abuse controls in `send-magic-link`

- Preserve exact-origin check, the `token_hash` scanner-resistant exchange, and one-time short-lived tokens.
- Rate limits via the existing `consumeRateLimit`: per keyed-IP bucket and a per-**hashed**-email bucket (HMAC of the normalized email; the raw address is never a bucket key or a log value).
- Duplicate-click suppression: a short cooldown per hashed email so repeated clicks within the window do not send a second email, while the response stays identical.
- No token, token hash, link or raw email is ever logged.

## 6. Enumeration-safe responses and Login UI copy

One public accepted response for every accepted request, existing account or not:

“If an account matches that email and email delivery is available, your secure sign-in link should arrive shortly. Please check your inbox and spam folder. If it does not arrive, wait a moment and try again or contact info@diabetesresetmethod.com.”

- A global configuration/provider-unavailable condition detected **before** account lookup may return the same temporary-unavailable response for every email.
- A provider error occurring **after** a match is found is recorded internally (status only, no email or token data); the public response stays the neutral text above.
- Never an unconditional "an email was sent", never a recipient-specific failure, no "temporarily unavailable" as the normal state.

`src/pages/Login.tsx` renders exactly this copy for accepted requests and for the resend button.

## 7. Credentials check

Before deployment, confirm only the presence (never the value) of the existing email-provider credential used by `sendAuthEmail`. No new provider, no automated test email.

## 8. Tests

New `src/test/magicLink.test.ts` plus additions to the existing next-param tests, covering: `auth_email_enabled` true; known member request succeeds; user found on page 3 (beyond 200); user not found; mixed-case/whitespace email; provider failure stays neutral; repeated clicks send once; rate limit exceeded; safe and malicious `next` values (including encoded and backslash bypasses); link replay; expired token; scanner-resistant exchange preserved; identical response body for existing vs non-existing accounts; marketing/automation flags false without affecting sign-in; and an assertion that no migration or rollback sets `auth_email_enabled` false.

## 9. Verification and report

Run Vitest, `tsgo --noEmit`, production build. Deploy `send-magic-link` only after the flag verification passes. No automated email is sent during implementation.

Report will include: `auth_email_enabled=true`, `transactional_automation_enabled=false`, `marketing_email_enabled=false`, proof that `email_delivery_enabled=false` does not suppress auth email, deploy-after-verify ordering, the >200-user lookup test, strict `next` validation, no enumeration introduced, the complete list of changed files (all within the magic-link path plus config/shared helpers), and the direct preview `/login` URL for one manual owner sign-in test. Nothing is published.

## Files expected to change

- `supabase/migrations/<new>.sql` (three config keys)
- `supabase/functions/_shared/config.ts`, `_shared/email.ts`
- `supabase/functions/_shared/findUserByEmail.ts` (new)
- `supabase/functions/_shared/safeNext.ts` (new — strict server-side mirror)
- `supabase/functions/send-magic-link/index.ts`
- `src/pages/Login.tsx`
- `src/test/magicLink.test.ts` (new)
