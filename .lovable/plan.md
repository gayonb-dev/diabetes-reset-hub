# Prompt 4 — Payment-Truth Correction (focused)

Scope: harden checkout verification so "verified" is only ever server-proven, remove any test-only bypass from production, and change one onboarding goal label. No redesign, no migrations, no deployment, no publication, no real payment.

## 1. Harden `verify-checkout-session`

Rewrite the verification decision as a strict allowlist. The function returns `verified` only when every one of these server-side checks passes:

- Session ID matches the `cs_...` shape (already present).
- `session.status === "complete"`.
- `session.payment_status === "paid"`. **`no_payment_required` maps to `unverified`** (a DRM membership always takes the $27 now).
- Environment/mode agreement: `stripe_mode` from server config plus the Stripe key class check (`stripeKeyClassMismatch`); `session.livemode` must agree with the configured mode. A test-mode session seen by a live deployment is `unverified`.
- Offer match against server-held constants (never client input): product = `STRIPE_PRODUCT_ID`, recurring price = `STRIPE_PRICE_ID_MONTHLY`, currency `usd`, mode `subscription`, exactly two line items — one-time 2700 and recurring 6700/month with a 14-day trial.
- `amount_total` / one-time amount equals 2700 USD.
- A local `orders` row exists whose `stripe_session_id` equals this exact session id.
- Normalized (trim + lowercase) checkout email equals the normalized email on that order row.
- Session is not `expired`, canceled, replayed against another order, or for another product.
- Delayed-settlement PaymentIntent (`processing`) still maps to `processing`.

Everything else maps to `unverified`; Stripe errors/timeouts map to `error`. Response payload stays minimal (`{ state }`) — no product, price, email or order data echoed back.

Provisioning stays idempotent: the success page never provisions. It only reads. Existing webhook upserts (`user_roles` on conflict, `subscriptions` on `stripe_subscription_id`, order update by session id) remain the single provisioning path, so a concurrent webhook + page verification cannot create duplicate accounts, roles, orders, subscriptions, messages or access.

## 2. Remove the screenshot fixture from production paths

- Move `state_fixture` handling out of `PaymentSuccess.tsx` into a dev/test-only harness module that is statically excluded from production bundles (`import.meta.env.DEV` guard plus a separate module so the branch is tree-shaken).
- `PaymentSuccess.tsx` in production reads only `session_id` and trusts only the server response.

## 3. Verification matrix (mocks and synthetic fixtures only)

New/extended tests covering: paid+fully matching → verified; `no_payment_required` → unverified; unpaid; processing; expired; test-mode session in production; wrong product; wrong price; wrong amount; wrong currency; wrong email/order binding; missing local order; malformed session id; replay; page refresh; concurrent webhook/page verification; Stripe timeout/unavailable; and assertions that no duplicate account, role, order, subscription, message or access is provisioned.

Plus a production-bundle scan test asserting:
- `state_fixture` does not appear in the production build output.
- No query parameter can make the real verifier return `verified`.
- No test-only payment bypass string is present in the production bundle.

## 4. Onboarding copy

In `src/pages/app/Onboarding.tsx`, change the goal label `"Steadier blood sugar readings"` to `"Understand my blood sugar patterns"`. Keep `"Discuss medication changes with my doctor"` unchanged. Option values are untouched (no data migration).

## 5. Gates to run (only these)

Checkout-verification tests, PaymentSuccess state tests, idempotency/concurrency tests, production-bundle fixture scan, banned-claim scan on the changed onboarding copy, TypeScript, lint on touched files, production build.

## Files expected to change

- `supabase/functions/verify-checkout-session/index.ts` (rewritten decision logic)
- `supabase/functions/_shared/membershipOffer.ts` (new — server-held offer constants + matcher, shared with tests)
- `src/pages/PaymentSuccess.tsx` (fixture removed from production path)
- `src/lib/devStateFixture.ts` (new — dev/test-only harness)
- `src/pages/app/Onboarding.tsx` (one label)
- `src/test/checkoutVerification.test.ts`, `src/test/paymentSuccessStates.test.tsx`, `src/test/productionBundleFixture.test.ts` (new)

Deliverable: a short amended §17 report covering only these corrections. No publication.
