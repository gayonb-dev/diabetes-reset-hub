# Prompt 4.5 — Section 10 correction: magic-link sign-in stays enabled

Scope: only the magic-link login path and the config flags it depends on. No changes to marketing, reminders, digests, check-ins, or any other Prompt 4.5 section.

## Current state (verified)

- `app_config` today holds: `ai_health_enabled=false`, `dexcom_enabled=false`, `email_delivery_enabled=false`, `email_test_allowlist=[]`, `phi_notice_version`, `retention_mode`, `stripe_deletion_enabled`, `stripe_mode=live`. There is **no** `auth_email_enabled`, `transactional_automation_enabled` or `marketing_email_enabled` key.
- `send-magic-link` sends through the shared `sendEmail` gate, which requires `email_delivery_enabled=true` **and** the recipient to be on `email_test_allowlist`. Both are currently closed, so magic-link email is suppressed today. This is the configuration this task corrects.
- `send-magic-link` finds the member with `listUsers({ page: 1, perPage: 200 })` — a member beyond the first 200 accounts silently gets no link. The same first-page-only pattern also exists in `verify-checkout-session` and `stripe-subscription-webhook`.

## 1. Config flags

New migration adding three keys and leaving existing ones untouched:

- `auth_email_enabled = true`
- `transactional_automation_enabled = false`
- `marketing_email_enabled = false`

`email_delivery_enabled` stays `false`; it now governs only automated/marketing member email. Auth email no longer reads it. Config helpers gain `authEmailEnabled()` (defaults **true** — auth must not fail closed into a lockout) alongside the existing automation gates.

## 2. Auth email path independent of the marketing gate

- Add an auth-specific send path in `_shared/email.ts` (`sendAuthEmail`) that checks only `auth_email_enabled`, never `email_delivery_enabled` and never the test allowlist.
- `send-magic-link` uses it and returns a real provider outcome to the caller: an accepted request vs a confirmed provider failure are distinguishable, while account existence is not.

## 3. Shared user-by-email resolver

New `_shared/findUserByEmail.ts`:

- Normalizes with trim + lowercase.
- Uses the admin listing with paging, continuing page by page until a match is found or pages are exhausted, with a hard page cap and per-page size to bound work.
- Returns `{ userId } | null` only — never accepts or trusts a client-supplied user id.
- Logs nothing containing an email address.

Adopted by `send-magic-link`, `verify-checkout-session` and `stripe-subscription-webhook` so the 200-user cliff is gone everywhere.

## 4. Reliability and abuse controls in `send-magic-link`

- Preserve exact-origin check, the `token_hash` scanner-resistant exchange, one-time short-lived tokens, and the same-site `next` allowlist (`safeNext` client-side, `/`-prefixed check server-side).
- Rate limits via the existing `consumeRateLimit`: per keyed-IP bucket and a per-**hashed**-email bucket (HMAC of the normalized email; the raw address is never a bucket key or a log value).
- Duplicate-click suppression: a short cooldown per hashed email so repeated clicks within the window do not send a second email, while the UI response stays identical.
- No token, token hash, link or raw email is ever logged.

## 5. Login UI copy

`src/pages/Login.tsx`:

- Accepted request → "If an account matches that email, your secure sign-in link will arrive shortly. Please check your inbox and spam folder."
- Confirmed provider failure → "We couldn't send a sign-in link right now. Please try again or contact info@diabetesresetmethod.com." (no success state shown).
- Resend button follows the same two outcomes. No "temporarily unavailable" state.

## 6. Tests

New `src/test/magicLink.test.ts` plus additions to the existing next-param tests, covering: `auth_email_enabled` true; known member request succeeds; user found on page 3 (beyond 200); user not found; mixed-case/whitespace email; provider failure surfaces the failure copy; repeated clicks send once; rate limit exceeded; safe and malicious `next` values; link replay; expired token; scanner-resistant exchange preserved; neutral response body identical for existing vs non-existing accounts; marketing/automation flags false without affecting sign-in; and a config assertion that no migration or rollback sets `auth_email_enabled` false.

## 7. Verification and report

Run Vitest, `tsgo --noEmit`, production build. Deploy `send-magic-link`. No automated email is sent during implementation.

Report will include: proof of `auth_email_enabled=true` and both other flags false (config query output), proof of the >200-user lookup test passing, the list of every file changed, and the direct preview `/login` URL for one manual owner sign-in test. No publication.

## Files expected to change

- `supabase/migrations/<new>.sql` (three config keys)
- `supabase/functions/_shared/config.ts`, `_shared/email.ts`
- `supabase/functions/_shared/findUserByEmail.ts` (new)
- `supabase/functions/send-magic-link/index.ts`
- `supabase/functions/verify-checkout-session/index.ts`, `supabase/functions/stripe-subscription-webhook/index.ts` (resolver adoption only)
- `src/pages/Login.tsx`
- `src/test/magicLink.test.ts` (new)
