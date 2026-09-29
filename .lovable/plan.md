# Private Clinical-Reviewer Access (revised, corrections 1 to 11 applied)

Nothing in this plan runs until you approve it.

## Authorization boundary

Approving this plan authorizes: implementation, the shared-production-backend migration and required function deployments, and the owner-controlled test invitations (two synthetic test identities, see section 10).

It does NOT authorize any of the three clinical-review invitations. Those require a later, separate explicit approval after the owner test passes and you approve the masked recipient/category confirmation (section 11).

## 0. Private recipient input (status only)

- Owner-controlled test recipient: received and retained.
- Clinical-review recipients: three addresses received and retained.
- Real names and the two group category labels: NOT supplied (your later message contained placeholders only). I will ask you for them before provisioning and will not infer them. Names are optional unless the invitation wording needs them.

## 1. Audit finding

The only access record is `subscriptions`, which requires non-null Stripe subscription and customer IDs and a Stripe status. No complimentary or manual-access mechanism exists. Truthful reviewer access needs a new, separate entitlement. Nothing fake is written to `subscriptions`, `orders` or Stripe.

## 2. Full dependency inventory (first step, read-only)

List every place that decides access from subscription or membership state:

- Client: `useAuth`, `AuthGuard`, `membership.ts`, `appSurfaces.ts`, `usePaidMemberRedirect`, Billing, Onboarding, Dashboard, day-lock UI.
- Routes and loaders: every `/app/*` guard and prefetch.
- Database: `membership_access_state`, `membership_write_allowed`, `member_access_allowed`, `member_write_allowed`, `current_program_day`, `enforce_member_progress_day_unlocked`, and every RLS policy calling them.
- RPCs and Edge Functions reading `subscriptions` (about 18, including award-badges, member-checkin, mcp, export, deletion, support, magic-link, checkout verification, webhooks).
- Storage policies touching member files.

Also identify and document the exact deployed programme-day source (see section 5). Each entry is marked must-accept / must-ignore / unaffected. The authorization and RLS proof in section 10 tests every must-accept entry and re-tests ordinary-member and anonymous restrictions.

## 3. Entitlement record (hardened)

Table `complimentary_access`, one row per reviewer:

- `user_id` unique, cascade-deleted with the Auth user.
- `purpose` constrained to exactly `clinical_review`.
- `granted_at` (not null), `granted_by` (not null).
- `access_started_at`, `access_expires_at`, with constraints:
  - both null or both non-null: `(access_started_at IS NULL) = (access_expires_at IS NULL)`;
  - when present, `access_expires_at = access_started_at + interval '14 days'` and `access_started_at >= granted_at`.
- `revoked_at`, `revoked_by`, `revocation_reason`, with a constraint that all three are null together or all three non-null together, and `revoked_at >= granted_at`.
- RLS on. Authenticated may SELECT only its own row. No client INSERT, UPDATE or DELETE. Service role for owner-run provisioning and revocation only.

## 4. Activation: one atomic self-activation operation

Security-definer function `activate_my_complimentary_access()`:

- No arguments. User derived only from `auth.uid()`; anonymous callers rejected.
- Single atomic statement: `UPDATE ... SET access_started_at = COALESCE(access_started_at, now()), access_expires_at = COALESCE(access_expires_at, now() + interval '14 days') WHERE user_id = auth.uid() AND revoked_at IS NULL RETURNING id, access_started_at, access_expires_at`. The row lock serialises concurrent calls; the first sets the pair and every later or concurrent call rewrites the same stored values and returns them. If the grant is revoked or absent, the function returns the stored row via a read (or nothing) and never activates.
- Every call (first activation, reload, retry, concurrent) returns identical grant ID and timestamps; no call ever extends access.
- Fixed `search_path`, `EXECUTE` revoked from `public` and `anon`, granted to `authenticated` only.
- Concurrency test: many parallel calls for one synthetic reviewer, asserting exactly one timestamp pair exists, every response is identical, and a call after time passes returns the original expiry.
- Called by the client on first successful authenticated app load. No Edge Function needed.

## 5. Two separate clocks

- Complimentary access: begins at first authenticated app load, lasts exactly 14 x 24 hours, never reset or extended.
- Programme Day 1: `program_start_date` is NOT assumed to be the deployed onboarding anchor. `current_program_day` currently falls back from `profiles.program_start_date` to earliest `subscriptions.created_at` to today. The inventory documents the exact source actually set on onboarding today. Ordinary paid-member behaviour is preserved unchanged. For reviewers, prove onboarding completion yields Day 1, and that activation, reload, re-login and repeated onboarding never reset that date.
- Reviewers get the same progressive day locking as ordinary members.

## 6. Precedence and ended states

Evaluator order (client and SQL mirror):

1. Disabled/banned Auth account.
2. Deletion restriction.
3. Dispute suspension.
4. Other existing higher-priority safety restrictions.
5. Active, unexpired, unrevoked complimentary grant: `allowed`, reason `complimentary_review`.
6. Existing subscription rules.

Expired or revoked grant with no subscription: reason `complimentary_review_ended`, surfaces = the existing canonical `ACCOUNT_SURFACES` reused unchanged (profile, settings including data export and deletion, support, sign-out, plus billing showing only the ended notice). No programme content, checkout, Stripe controls or Admin. Copy: "Your complimentary clinical-review access has ended." Never a failed-payment, grace or checkout screen.

Active grant billing text: "Complimentary clinical-review access, no charge and no automatic renewal" plus the exact expiry.

## 7. Personal-data governance

Add `complimentary_access` to the data inventory (classification, owner), member export, deletion worker, retention rules and synthetic-cleanup harness, with tests.

## 8. Metrics and automation populations

Reviewer identities necessarily remain in the Auth provider's raw identity total; that total is not altered. Where needed, clinical-review identities are reported separately. They are excluded from business customer, active-member, onboarding-funnel, conversion, engagement, revenue and marketing populations, and from automated non-essential mail: daily digest, notifications, birthday and progress emails, broadcasts, leads and marketing tables. Only account-essential transactional messages reach them.

## 9. Shared production backend: compatibility, deployment, rollback

Preview and published client share one backend; every migration and deployment is a production change.

- This change modifies existing evaluator functions and authorization behaviour (`membership_access_state`, `membership_write_allowed`, `member_access_allowed`, client evaluator). It is described as backward-compatible only after the before/after tests pass: existing billing lifecycle, account-surface, RLS matrix and day-guard tests against the migrated database, plus an aggregate before/after comparison of `membership_access_state` across all existing users.
- Evidence: migration path and result, deployed function versions, explicit deployed versus source-only statement.
- `award-badges` fasting correction is in source but not deployed; deploy only that checked function before any reviewer invitation.
- Rollback SQL restoring previous function bodies and removing the evaluator branch; table kept (no data drop) until you decide.

## 10. Owner-controlled test journey, including authorization and RLS proof

Two owner-controlled synthetic reviewer identities (Reviewer A uses the owner test address; Reviewer B is a second owner-controlled synthetic identity). Reviewer-to-reviewer RLS isolation must PASS using two genuinely separate authenticated synthetic identities. The second identity does not require an external invitation email if its authenticated session can be established through the authorized synthetic-test process. If two separate authenticated identities cannot be tested, the reviewer-access release is BLOCKED and no clinical-reviewer account may be provisioned or invited.

Prove: invitation delivery, link opens the exact review URL, one-time use and configured expiry, no card or checkout, onboarding first, Day 1 after onboarding, activation clock set once, billing text truthful, zero Stripe/order/marketing records, no fasting controls, not admin, anonymous vs A vs B isolation under RLS, every must-accept inventory entry works, ordinary and anonymous restrictions unchanged, metrics exclusion, expiry and revocation producing the ended state, deletion removing all applicable rows. Then delete both identities and their owned records by exact ID, and confirm zero residue.

Checks: focused tests, TypeScript, touched-file lint, production build, SQL/RLS checks, Deno checks for changed functions.

## 11. Doctor provisioning (later explicit approval only)

Before any doctor invitation: a private confirmation listing each retained address masked (first character plus domain) with its owner-supplied category. Full addresses never shown.

Retry-safe order per reviewer: look up or create the Auth identity (never a duplicate), create the grant (unique per user, so a retry reuses it), then send one invitation keyed to that identity. On delivery failure, record it privately and retry idempotently; no duplicate identities, grants or invitations. Masked private manifest: masked email, user ID, grant ID, invite time, access rule, expiry, revocation status. Doctors' links are never opened by me.

## 12. Final report

Separate lines for: source changed, migration applied, functions deployed, client unpublished, production reviewer records, invitations sent, marketing sent (zero), Stripe/payments (zero), owner test cleanup, expiry and later deletion responsibility, and every PASS / FAIL / BLOCKED / NOT TESTED.

## Final implementation clarifications (override earlier sections where they differ)

A. Table has an immutable `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` (update trigger rejects changes to `id`, `user_id`, `purpose`, `granted_at`, `granted_by`). `user_id` stays unique with cascade delete from the Auth identity.

B. Duration is `interval '336 hours'` everywhere: the activation statement and the table constraint. No `'14 days'` anywhere.

C. Activation and status return a single explicit shape: `{ state: 'absent' | 'pending_activation' | 'active' | 'expired' | 'revoked', grant_id, access_started_at, access_expires_at }`. Only `active` grants access; `expired` and `revoked` carry `state` set accordingly and the client treats anything but `active` as no complimentary access. Revoked rows are never activated. The function reads only `auth.uid()`'s row and cannot return another user's record.

D. No direct table SELECT for authenticated users. Access is only through the self-status/activation function, which exposes state, grant ID, start and expiry. `granted_by`, `revoked_by` and `revocation_reason` are never client-visible. Export/deletion documentation classifies these as administrative audit fields separately from member data.

E. Verified: canonical `ACCOUNT_SURFACES` in `membershipLifecycle.ts` is already `["billing", "settings", "support", "profile"]`, so Billing is canonical and no list change is needed. After expiry, Billing shows only the ended notice; the checkout button, Stripe portal and invoice controls are hidden for `complimentary_review_ended`, verified by test. No programme content or Admin.

F. Cleanup reporting states: zero remaining deletable user-owned and synthetic application data; plus each retained security, authentication or email-delivery audit record listed separately with its purpose and retention rule. No absolute "zero residue" claim.

G. Expiry testing uses a synthetic grant created specifically with granted_at earlier than or equal to the synthetic access_started_at. Its start and expiry timestamps may then be set to an already-expired 336-hour interval while every production constraint remains enabled and satisfied. No constraint is disabled, deferred or bypassed; no real reviewer row is altered. The synthetic identity, grant and owned records are removed after evidence is captured, subject to the documented retained-audit exceptions.

H. `granted_by` / `revoked_by`: grants and revocations run only through an owner-run admin operation that validates the caller's session and `has_role(auth.uid(), 'admin')`, and records that verified admin user ID. Never accepted from an ordinary client; the service-role credential alone is never recorded as the actor.

## Change log (this revision)

1. Activation returns the stored entitlement on every call; concurrency test added.
2. Both-null-or-both-set constraint on access timestamps; all-or-none constraint on revocation fields.
3. Programme-day source to be identified, not assumed.
4. Post-expiry surfaces pinned to canonical `ACCOUNT_SURFACES`.
5. Metrics wording corrected; raw Auth total unaltered.
6. Two owner-controlled synthetic identities for A/B isolation, or NOT TESTED.
7. Masked recipient/category confirmation; labels requested, not inferred.
8. Explicit authorization boundary added.
9. Retry-safe identity, grant, invitation order.
10. "Purely additive" removed; compatibility claimed only after tests.
11. Section 2 now points to section 10 for the authorization/RLS proof.
