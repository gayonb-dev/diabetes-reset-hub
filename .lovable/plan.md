# Private Clinical-Reviewer Access (revised)

Nothing in this plan runs until you approve it. No accounts, emails, migrations, deployments or publication happen at the approval step.

## 0. Private recipient input (status only)

- Owner-controlled test recipient: received and retained (from your Sep 9 message).
- Clinical-review recipients: three received and retained (same message).
- Recipient categories: your later message contained only placeholders (`[USER TYPE]`, `[DOCTOR NAME]`, `[EMAIL]`), so no real categories or names have been supplied. The three real addresses from Sep 9 are retained; nothing is inferred or substituted. Please resend the real names and group categories before the invitation stage.
- No invitation is sent until the owner-controlled journey passes AND you explicitly authorize the real invitations in a separate message.

## 1. Audit finding (unchanged)

The only access record is `subscriptions`, which requires non-null Stripe subscription and customer IDs and a Stripe status. No complimentary or manual-access mechanism exists. Truthful reviewer access therefore needs a new, separate entitlement. Nothing fake is written to `subscriptions`, `orders` or Stripe.

## 2. Full dependency inventory (first implementation step, read-only)

Before any change, produce a complete list of every place that decides access from subscription or membership state, with file/object and current rule:

- Client: `useAuth`, `AuthGuard`, `membership.ts`, `appSurfaces.ts`, `usePaidMemberRedirect`, Billing, Onboarding, Dashboard, day-lock UI.
- Routes and loaders: every `/app/*` route guard and any prefetch.
- Database: `membership_access_state`, `membership_write_allowed`, `member_access_allowed`, `member_write_allowed`, `current_program_day`, `enforce_member_progress_day_unlocked`, and every RLS policy calling them.
- RPCs and Edge Functions: every function reading `subscriptions` (about 18 found: award-badges, member-checkin, mcp, export, deletion, support, magic-link, checkout verification, webhooks and others).
- Storage policies touching member files.

Each entry is marked: must accept complimentary access / must ignore it / not affected. The proof step (section 8) tests every "must accept" entry and re-tests ordinary and anonymous restrictions.

## 3. Entitlement record (hardened)

New table `complimentary_access`, one row per reviewer:

- `user_id` unique, cascade-deleted with the Auth user.
- `purpose` constrained to exactly `clinical_review`.
- `granted_at`, `granted_by`, `revoked_at`, `revoked_by`, `revocation_reason`.
- `access_started_at`, `access_expires_at`: null until activation; a constraint enforces `access_expires_at = access_started_at + 14 days` exactly and `revoked_at >= granted_at`.
- Explicit grants: authenticated may SELECT only its own row; no client INSERT, UPDATE or DELETE; service role for admin provisioning. RLS on.
- Grants are created and revoked only by an owner-run server-side operation, never from the browser.

## 4. Activation: one atomic self-activation database operation

A single security-definer function `activate_my_complimentary_access()`:

- Takes no arguments. Derives the user solely from the verified session (`auth.uid()`); rejects anonymous callers.
- One `UPDATE ... SET access_started_at = now(), access_expires_at = now() + interval '14 days' WHERE user_id = auth.uid() AND access_started_at IS NULL AND revoked_at IS NULL RETURNING ...`. Row-level locking makes concurrent calls, reloads and retries idempotent: only the first ever sets the clock; later calls change nothing and return the existing values.
- Fixed `search_path`, `EXECUTE` revoked from `public` and `anon`, granted to `authenticated` only.
- Called by the client on the first successful authenticated app load. No Edge Function is needed.

## 5. Two separate clocks

- Complimentary access: starts at first authenticated app load, lasts exactly 14 x 24 hours, never reset or extended by any path.
- Programme Day 1: starts when onboarding completes, using the same code path real new members use (`program_start_date`). Never reset by activation, re-login or re-onboarding.
- Reviewers get the same progressive day locking as ordinary members (`current_program_day` and the unlock trigger). They see Day 1 on day one, not all 180 days.

## 6. Precedence and ended states

Evaluator order (client and SQL mirror):

1. Disabled/banned Auth account: no access.
2. Deletion restriction.
3. Dispute suspension.
4. Other existing higher-priority safety restrictions.
5. Active, unexpired, unrevoked complimentary grant: `allowed`, reason `complimentary_review`.
6. Existing subscription rules.

Expired or revoked grant with no subscription: new reason `complimentary_review_ended`, restricted to account surfaces, with copy "Your complimentary clinical-review access has ended." Never the failed-payment, grace or checkout screen. Billing while active shows "Complimentary clinical-review access, no charge and no automatic renewal" plus the exact expiry; no card, checkout or portal controls.

## 7. Personal-data governance

Add `complimentary_access` to the data inventory (classification, owner), member export, account-deletion worker, retention rules and synthetic-cleanup harness, with tests updated accordingly.

## 8. Metrics and automation populations

Audit and, where needed, exclude reviewers from: Auth user counts, profiles, onboarding funnels, engagement scoring, active-member counts, conversions, revenue, admin subscription views, daily digest, notifications, birthday and progress emails, broadcast sends, and any marketing or lead table. Reviewers get only transactional, account-essential messages.

## 9. Shared production backend: compatibility, deployment, rollback

Preview and published client share one backend, so every migration and deployment is a production change even without publication.

- Backward compatibility: the change is purely additive (new table, new function, new evaluator branch that only fires when a grant exists). The currently published client never calls the new function and sees identical results for every existing user. Proven by running the existing billing lifecycle, account surface, RLS matrix and day-guard tests against the migrated database, plus a before/after comparison of `membership_access_state` for all existing users (aggregate counts only).
- Evidence: migration file path and apply result, function list with deployed versions, and an explicit statement of what was deployed versus source-only.
- Fasting-badge correction: `award-badges` correction is in source but not deployed; the deployed backend can still award retired fasting badges. Deploy only that checked function before any reviewer is invited.
- Rollback: documented SQL restoring the previous function bodies, disabling the evaluator branch, and revoking grants; table left in place (no data drop) until you decide.

## 10. Owner-controlled test journey (after approval, before any doctor)

Create the owner test identity, grant, send the real invitation email, then prove: delivery, link opens the exact review URL, one-time use and configured expiry, no card or checkout, onboarding first, Day 1 after onboarding, activation clock set once and not reset by reloads or concurrent calls, billing text truthful, zero Stripe/order/marketing records, no fasting controls, not admin, anonymous vs Reviewer A vs Reviewer B isolation, metrics exclusion, expiry and revocation producing the ended state, deletion removing all applicable rows, zero residue. Then delete the test identity and rows by exact ID.

Checks: focused tests, TypeScript, touched-file lint, production build, SQL/RLS checks, Deno checks for changed functions.

## 11. Doctor provisioning (only after your explicit authorization)

One identity and one grant per authorized address, one transactional invitation each, private masked manifest (masked email, user ID, grant ID, invite time, access rule, expiry, revocation status). Doctors' links are never opened by me.

## 12. Final report

Separate lines for: source changed, migration applied, functions deployed, client unpublished, production reviewer records, invitations sent, marketing sent (zero), Stripe/payments (zero), owner test cleanup, expiry and later deletion responsibility, and every PASS / FAIL / BLOCKED / NOT TESTED.

## Technical notes

- Invitation uses the existing Auth invite / password-establishment flow; redirect restricted to the exact review origin, no wildcards.
- Reviewer addresses stay out of source, migrations, fixtures, screenshots and public reports; retained only as private provisioning input.
- The roadmap will be updated with this task when implementation starts (plan mode allows editing only the plan).
