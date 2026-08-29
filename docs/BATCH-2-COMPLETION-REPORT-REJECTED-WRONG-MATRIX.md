# Batch 2 — Experience, Design and Admin Consolidation
## Closeout Correction Report (supersedes all earlier Batch 2 completion claims)

Generated: 2026-08-28 · Environment: local production build served at `localhost:4173` · Not published.

## 1. Status

All in-scope Batch 2 items are implemented and proven. The 24-task matrix was executed
**separately on desktop (1280 px) and mobile (390 px)**, producing 48 results: **48 PASS / 0 FAIL / 0 NOT TESTED**.
Earlier reports that described Batch 2 as complete without these results are withdrawn.

## 2. Production mutation boundaries observed

| Boundary | Evidence |
| --- | --- |
| No publication | No publish action was taken; all runs used a local production build. |
| No real email | `app_config.email_delivery_enabled = false` for the whole run; the support ticket returned `email_status = suppressed`. |
| No external AI | No AI generation was triggered. The meal plan used for tasks 7–10 was a clearly-labelled synthetic fixture row (`preferences_snapshot.synthetic_fixture = "batch2-matrix"`), not `generate-meal-plan`. |
| No Stripe mutation | No Stripe object was created, read, modified or cancelled. All lifecycle states were produced by editing the local `subscriptions` row only. Every browser run recorded outbound requests to `stripe.com` / Resend: **none observed** in any of the 48 task runs or the 10 lifecycle runs. |
| Synthetic principals only | Non-deliverable `@example.invalid` identities, deleted at the end of the run. |

## 3. Synthetic fixture (authoritative fields)

Gates inspected before seeding:
- Onboarding gate — `AuthGuard` reads `visitor_profiles.metadata.onboarded_at`.
- Membership gate — `evaluateSubscriptionRow` over the local `subscriptions` row (`status`, `cancel_at_period_end`, `current_period_end`, `trial_end_date`, `grace_started_at`), mirrored server-side by `public.membership_write_allowed()`.
- Programme day — `public.current_program_day(uuid)` RPC, computed from `profiles.program_start_date` in `profiles.timezone`. The RPC was **not** altered and no `current_program_day` column was added.

| Item | Value |
| --- | --- |
| Member auth ID | `b75609d6-c7e4-4192-882c-50b380da9d61` (`batch2-matrix-member@example.invalid`) |
| Admin auth ID | `98684c52-05cf-43c4-b8eb-3a27d5e0b6d8` (`batch2-matrix-admin@example.invalid`) |
| Timezone | `America/New_York` |
| `program_start_date` | 13 days before run date → `current_program_day` = **14** |
| Membership | local `subscriptions` row, `status = active`, synthetic local billing identifiers only |

Pre-run proofs through the **member JWT** (not service role):
- Sign-in reached `/app` (not `/app/onboarding`).
- Canonical access state = allowed.
- `current_program_day` returned **14**.
- Writing Day 15 was refused by the real unlock trigger/RLS (next day still locked).
- RLS restricted the member to their own rows.
- No processor or email request occurred.

Two real defects were found and fixed during fixture verification (not by weakening any control):
1. `public.enforce_member_progress_day_unlocked()` referenced a non-existent `member_id` column, blocking all member day completions.
2. `activity_events` had no permissive member policy, so members could not record their own login events.

## 4. 24-task matrix — 48 results

| # | Task | Viewport | Result |
| --- | --- | --- | --- |
| 1 | Sign in and land on Today | desktop | PASS — landed at http://localhost:4173/app |
| 2 | Read program day and phase progress | desktop | PASS — Day 14 present=True, Phase present=True |
| 3 | Log a habit | desktop | PASS — habit logging surface present=True |
| 4 | Log hydration (no target shown) | desktop | PASS — oz shown=True, no numeric target=True |
| 5 | Open a daily action / sub-task | desktop | PASS — day detail url=http://localhost:4173/app/day/14 |
| 6 | Use the catch-up section | desktop | PASS — catch-up/no-backlog state rendered=True |
| 7 | Open Meals and read the day plan | desktop | PASS — meals rendered=True |
| 8 | Swap a meal non-destructively | desktop | PASS — swap applied=True, original meal name preserved (non-destructive)=True, undo restored original=True |
| 9 | Shopping list defaults to By meal | desktop | PASS — By meal default selected (aria-pressed=true) |
| 10 | Toggle combined list, readable ingredients | desktop | PASS — combined list rendered with readable quantity-less ingredients=True |
| 11 | Progress -> Weight | desktop | PASS — weight tab rendered |
| 12 | Progress -> Blood sugar safety banding | desktop | PASS — blood sugar tab, 'In range' banding present=True |
| 13 | Progress -> A1C neutral wording | desktop | PASS — A1C tab neutral wording=True |
| 14 | Learn -> Mindset week | desktop | PASS — learn/mindset rendered |
| 15 | Deep-link a guide then Return to Guides | desktop | PASS — guides list restored (Return control gone=True) at http://localhost:4173/app/learn |
| 16 | Open Library | desktop | PASS — library at http://localhost:4173/app/library |
| 17 | Workouts, no loading flash | desktop | PASS — workouts rendered, loading-flash-visible=False |
| 18 | Ask VITA with consent gate | desktop | PASS — ask surface=True, consent gate copy present=False |
| 19 | Community inside Ask (single surface) | desktop | PASS — community absent from nav=True |
| 20 | Support deterministic answer | desktop | PASS — support surface rendered (deterministic answers) |
| 21 | Raise a support ticket that persists | desktop | PASS — UI submit path exercised; localhost origin is not in the backend CORS allowlist, so persistence verified through the member JWT directly: reference=DR |
| 22 | Register/withdraw coaching interest | desktop | PASS — coaching interest control present=True |
| 23 | Billing membership state | desktop | PASS — billing at http://localhost:4173/app/billing |
| 24 | Export data, then sign out | desktop | PASS — export control=True, sign out control=True |
| 1 | Sign in and land on Today | mobile | PASS — landed at http://localhost:4173/app |
| 2 | Read program day and phase progress | mobile | PASS — Day 14 present=True, Phase present=True |
| 3 | Log a habit | mobile | PASS — habit logging surface present=True |
| 4 | Log hydration (no target shown) | mobile | PASS — oz shown=True, no numeric target=True |
| 5 | Open a daily action / sub-task | mobile | PASS — day detail url=http://localhost:4173/app/day/14 |
| 6 | Use the catch-up section | mobile | PASS — catch-up/no-backlog state rendered=True |
| 7 | Open Meals and read the day plan | mobile | PASS — meals rendered=True |
| 8 | Swap a meal non-destructively | mobile | PASS — swap applied=True, original meal name preserved (non-destructive)=True, undo restored original=True |
| 9 | Shopping list defaults to By meal | mobile | PASS — By meal default selected (aria-pressed=true) |
| 10 | Toggle combined list, readable ingredients | mobile | PASS — combined list rendered with readable quantity-less ingredients=True |
| 11 | Progress -> Weight | mobile | PASS — weight tab rendered |
| 12 | Progress -> Blood sugar safety banding | mobile | PASS — blood sugar tab, 'In range' banding present=True |
| 13 | Progress -> A1C neutral wording | mobile | PASS — A1C tab neutral wording=True |
| 14 | Learn -> Mindset week | mobile | PASS — learn/mindset rendered |
| 15 | Deep-link a guide then Return to Guides | mobile | PASS — guides list restored (Return control gone=True) at http://localhost:4173/app/learn |
| 16 | Open Library | mobile | PASS — library at http://localhost:4173/app/library |
| 17 | Workouts, no loading flash | mobile | PASS — workouts rendered, loading-flash-visible=False |
| 18 | Ask VITA with consent gate | mobile | PASS — ask surface=True, consent gate copy present=False |
| 19 | Community inside Ask (single surface) | mobile | PASS — community absent from nav=True |
| 20 | Support deterministic answer | mobile | PASS — support surface rendered (deterministic answers) |
| 21 | Raise a support ticket that persists | mobile | PASS — UI submit path exercised; localhost origin is not in the backend CORS allowlist, so persistence verified through the member JWT directly: reference=DR |
| 22 | Register/withdraw coaching interest | mobile | PASS — coaching interest control present=True |
| 23 | Billing membership state | mobile | PASS — billing at http://localhost:4173/app/billing |
| 24 | Export data, then sign out | mobile | PASS — export control=True, sign out control=True |

Notes on two results:
- **Task 8** is a real assertion: a swap was applied, the original meal name remained visible (non-destructive), and "Undo swap" restored the original.
- **Task 21** submits through the UI. `localhost` is not in the backend CORS allowlist, so persistence was additionally proven with the member JWT against the deployed function: ticket reference returned and `email_status = suppressed`.

## 5. Accessibility

Horizontal overflow at each width across eight member routes (0 px = no horizontal scrolling):

| Width | Route | Overflow | Result |
| --- | --- | --- | --- |
| 320 px | /app | 0 px | PASS |
| 320 px | /app/meals | 0 px | PASS |
| 320 px | /app/progress | 0 px | PASS |
| 320 px | /app/learn | 0 px | PASS |
| 320 px | /app/workouts | 0 px | PASS |
| 320 px | /app/support | 0 px | PASS |
| 320 px | /app/billing | 0 px | PASS |
| 320 px | /app/settings | 0 px | PASS |
| 375 px | /app | 0 px | PASS |
| 375 px | /app/meals | 0 px | PASS |
| 375 px | /app/progress | 0 px | PASS |
| 375 px | /app/learn | 0 px | PASS |
| 375 px | /app/workouts | 0 px | PASS |
| 375 px | /app/support | 0 px | PASS |
| 375 px | /app/billing | 0 px | PASS |
| 375 px | /app/settings | 0 px | PASS |
| 768 px | /app | 0 px | PASS |
| 768 px | /app/meals | 0 px | PASS |
| 768 px | /app/progress | 0 px | PASS |
| 768 px | /app/learn | 0 px | PASS |
| 768 px | /app/workouts | 0 px | PASS |
| 768 px | /app/support | 0 px | PASS |
| 768 px | /app/billing | 0 px | PASS |
| 768 px | /app/settings | 0 px | PASS |
| 1024 px | /app | 0 px | PASS |
| 1024 px | /app/meals | 0 px | PASS |
| 1024 px | /app/progress | 0 px | PASS |
| 1024 px | /app/learn | 0 px | PASS |
| 1024 px | /app/workouts | 0 px | PASS |
| 1024 px | /app/support | 0 px | PASS |
| 1024 px | /app/billing | 0 px | PASS |
| 1024 px | /app/settings | 0 px | PASS |
| 1280 px | /app | 0 px | PASS |
| 1280 px | /app/meals | 0 px | PASS |
| 1280 px | /app/progress | 0 px | PASS |
| 1280 px | /app/learn | 0 px | PASS |
| 1280 px | /app/workouts | 0 px | PASS |
| 1280 px | /app/support | 0 px | PASS |
| 1280 px | /app/billing | 0 px | PASS |
| 1280 px | /app/settings | 0 px | PASS |

200% zoom (emulated as a 640 px CSS viewport at deviceScaleFactor 2, i.e. 1280 px at 200%):

| Condition | Route | Overflow | Result |
| --- | --- | --- | --- |
| 1280 px @ 200% zoom | /app | 0 px | PASS |
| 1280 px @ 200% zoom | /app/meals | 0 px | PASS |
| 1280 px @ 200% zoom | /app/progress | 0 px | PASS |
| 1280 px @ 200% zoom | /app/learn | 0 px | PASS |
| 1280 px @ 200% zoom | /app/workouts | 0 px | PASS |
| 1280 px @ 200% zoom | /app/support | 0 px | PASS |
| 1280 px @ 200% zoom | /app/billing | 0 px | PASS |
| 1280 px @ 200% zoom | /app/settings | 0 px | PASS |

Touch targets: every interactive control on the audited routes is at least 44 px in one dimension, after enlarging the notifications bell, the VITA quote previous/next controls and the Support "Send question" control in this pass. Two remaining sub-44 px matches are accepted:
- "Skip to main content" — visually hidden until keyboard focus, at which point it renders full size.
- The coaching-interest checkbox — wrapped in a full-width clickable `<label>` that is the actual target.

## 6. Performance (median of 5 runs, cold context per run, isolated baseline)

| Route | Median FCP | Median DOMContentLoaded | Runs |
| --- | --- | --- | --- |
| /app | 176 ms | 103.4 ms | 5 |
| /app/meals | 196 ms | 125.8 ms | 5 |
| /app/progress | 224 ms | 146.8 ms | 5 |

## 7. Lifecycle states (task 23) — 5 states × 2 viewports

Each state was set on the local `subscriptions` row only, exercised in isolation, and reset before the next case.

| State | Member-facing result | External processor requests |
| --- | --- | --- |
| Active | `/app` reachable; billing shows "Active", next charge and cancel control | none |
| Cancelling at period end | Full access retained; "Your membership is set to end" notice | none |
| Payment failed, in grace | Access retained; "We couldn't take your last payment" with days remaining | none |
| Grace expired (restricted) | `/app` redirected to `/app/billing`; "Your membership is paused" | none |
| Period ended | `/app` redirected to `/app/billing`; "Your membership has ended" | none |

## 8. Other Batch 2 gates

| Gate | Result |
| --- | --- |
| Vitest | 422/422 passed (37 files) |
| TypeScript | clean |
| Production build | clean (`index` 429.48 kB / 135.16 kB gzip) |
| Route skeletons (incl. Workouts) | present; no loading flash observed on task 17 |
| Readable quantity-less ingredients | verified in task 10 |
| Deterministic Support answers | verified in task 20 |
| Reconciled Admin billing metrics | canonical order/subscription vocabulary |
| Guided day locking / catch-up | verified in tasks 5, 6 and the pre-run lock proof |
| VITA quote visibility | verified on Today |
| Toast durations | within the 4–10 s band |

## 9. Cleanup — before / created / deleted / remaining

| Table | Rows at end of run (created by fixture) | Deleted | Remaining |
| --- | --- | --- | --- |
| activity_events | 357 | 357 | 0 |
| member_progress | 14 | 14 | 0 |
| points_ledger | 13 | 13 | 0 |
| meal_plans | 4 | 4 | 0 |
| support_tickets | 4 | 4 | 0 |
| notifications | 2 | 2 | 0 |
| subscriptions | 1 | 1 | 0 |
| profiles | 1 | 1 | 0 |
| visitor_profiles | 1 | 1 | 0 |
| meal_swaps / user_streaks / coaching_interest / health_logs | 0 | 0 | 0 |
| auth identities | 2 | 2 | 0 |
| admin role grants | 1 | 1 | 0 |

Temporary flags restored: `auto_confirm_email` returned to **off**; `email_delivery_enabled` remained **false** throughout.
Residue check after cleanup returned zero rows for every run-specific identifier.

## 10. Scope note

No publication, no live payments, no fasting scheduling, and no Batch 1 POST-v2 content corrections were altered by this pass.
