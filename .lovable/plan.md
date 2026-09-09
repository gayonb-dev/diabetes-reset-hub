# Private Clinical-Reviewer Access

## Audit result first: provisioning is blocked today

I checked the live access model before touching anything.

- Access is decided by one shared evaluator (`membershipLifecycle.ts`) reading the `subscriptions` row.
- The `subscriptions` table requires a non-null Stripe subscription ID and Stripe customer ID, and its status must be one of trialing / active / past_due / cancelled / incomplete / unpaid.
- There is no complimentary, review, comp-access or manual-access mechanism anywhere in the code or database. A search for those terms returns nothing.

So the only way to give a reviewer access today is to invent Stripe identifiers and mark them as a paying or trialing customer. That is exactly what your brief forbids, and it would also pollute paid-member counts.

Therefore: no accounts are created and no invitations are sent in this plan. What follows is the smallest auditable entitlement change that makes truthful reviewer access possible, plus the verification run. Provisioning and the real invitations happen only after that passes.

## What gets built

### 1. A separate complimentary-access record

A new table holding one row per granted reviewer: who it is for, why it was granted, when the review period starts, when it expires, and whether it was revoked. It is not a subscription, it creates no Stripe object, and it is stored apart from billing so revenue and paying-member figures are untouched.

Access rule: 14 days beginning at first successful sign-in. The record starts with no start date; the first authenticated load stamps it and sets the expiry 14 days later. This is enforceable, so no substitute meaning is needed.

### 2. The evaluator learns one new state

The shared membership evaluator gains a "complimentary" input. When an active, unexpired, unrevoked grant exists, the member sees the full programme exactly like a paying member. Deletion holds and dispute holds keep priority as they do now. Everything else is unchanged, so ordinary paying and non-paying members behave identically to today.

### 3. Truthful billing display

The Billing screen shows, for these accounts only: "Complimentary clinical-review access, no charge and no automatic renewal", with the expiry date once the period has started. No card prompt, no checkout button, no Stripe portal link.

### 4. Metrics stay clean

Admin subscription and revenue views count only real `subscriptions` and `orders` rows, which reviewers will not have. I will confirm this by inspection rather than assume it.

### 5. Onboarding and Day 1

Reviewer accounts get no profile seeding: onboarding incomplete, no health data, programme day starts at 1 after onboarding, as with any new member.

## Invitation flow

The existing transactional sign-in email flow is used. No passwords are emailed, no tokens or links appear in any report or screenshot, and the redirect target is the exact private review URL only, with no wildcard origins added.

Wording is used exactly as you supplied it, with the access rule sentence stating that the 14 days begin at first sign-in.

## Verification before any doctor is contacted

Using only your own test address, end to end: invitation delivery, one-time link behaviour, onboarding on first entry, reaching Day 1, no checkout redirect, truthful billing text, zero Stripe or order or marketing records, no fasting controls, no admin rights, reviewer-to-reviewer isolation under row-level security, exclusion from paid metrics, expiry and revocation, and full deletion of the test identity with no residue.

Then focused tests, TypeScript, lint on touched files, production build, and the database checks the entitlement change requires. No unrelated browser or accessibility matrices.

## Preconditions I still need to state in the final report

- Final source commit: `9b09d23914acabaaa6c29f1c9b1e45f989ae498e`, working tree clean.
- Backend project: the single shared Lovable Cloud instance serving preview and published app.
- The fasting-badge correction exists in source but has not been deployed. The deployed backend can still award the retired fasting badges. I will deploy only that one checked function before any reviewer is invited, with no client publication.
- The exact private review URL is the preview URL; I will record it verbatim in the report.

## Technical notes

- New table `complimentary_access` with `user_id`, `reason`, `granted_at`, `first_sign_in_at`, `expires_at`, `revoked_at`, plus explicit grants, row-level security allowing a member to read only their own row, and no client write path.
- Security-definer function `complimentary_access_active(uuid)`, folded into `membership_access_state`, `membership_write_allowed` and `member_access_allowed` so server enforcement matches the client evaluator.
- Client side: `membershipLifecycle.ts` facts gain `complimentaryUntil`; `useAuth` fetches the grant; `AuthGuard` and `Billing.tsx` consume it. No new surface list is derived anywhere else.
- Stamping first sign-in happens server-side in an edge function called on first authenticated load, so the member cannot set their own start date.
- Reviewer addresses live only in the private manifest I hand you, never in source, migrations, fixtures, tests or reports.

## Not done in this plan

No client publication, no pricing change, no admin role, no shared account, no Stripe object of any kind, and no invitation to the three doctors until your test journey passes.
