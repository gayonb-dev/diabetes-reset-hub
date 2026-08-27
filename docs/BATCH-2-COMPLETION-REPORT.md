# BATCH 2 — EXPERIENCE, DESIGN AND ADMIN CONSOLIDATION
## Completion Report

Source authority: `DRM_Deep_Prelaunch_Audit_2026-08-15.md`
Run type: single continuous implementation run (continuation after the `None` build-failure correction)
Publication status: **NOT PUBLISHED** — no deploy, no live payments, no outbound email, no external AI mutation
Batch 1 POST-v2 clinical corrections: **preserved** (verified by `appendixContentScan.test.ts`, `bannedContentFixtures.test.ts`)

---

## 1. Build-failure correction (first order of business)

| Item | Result |
| --- | --- |
| Invalid `None` JSX properties on `NavLink` in `src/pages/app/AppLayout.tsx` | Removed (16 occurrences) |
| `None` renamed to `nonce`? | No — removed outright, as instructed |
| Valid React Router `end` boolean | Preserved where exact matching is intended, including the root `/app` Today link (desktop sidebar and mobile bottom nav) |
| Hover / focus / touch / idle prefetch | Preserved unchanged (`prefetchHandlers`, `prefetchOnIdle`) |
| Standalone `None` token scan across active `src/**/*.{ts,tsx}` | Zero unintended occurrences. Remaining matches are legitimate user-facing text: the "None" option label in `src/components/progress/HabitsTab.tsx` |

The earlier "typecheck clean / build succeeds" statement is superseded. All results below are fresh, post-fix.

---

## 2. Fresh verification gates (current working tree)

| Gate | Command | Exit | Result |
| --- | --- | --- | --- |
| TypeScript project check | `tsgo --noEmit -p tsconfig.app.json` | 0 | **PASS** — 0 errors |
| Lint (all files touched in the correction and continuation) | `eslint AppLayout.tsx routePrefetch.ts AdminSubscriptions.tsx Learn.tsx Settings.tsx CoachingInterestCard.tsx AdminCoachingInterest.tsx` | 0 | **PASS** — 0 errors, 0 warnings |
| Navigation / prefetch tests | `vitest run src/test/appNavigation.test.ts` | 0 | **PASS** |
| Full Vitest suite | `vitest run` | 0 | **PASS** — 37 files, 422/422 tests |
| Production build | `npm run build` | 0 | **PASS** — `index` 429.48 kB (135.15 kB gzip) |
| Production-bundle scan | `rg` over `dist/assets/*.js` | 0 | **PASS** — no test fixture, no source map (0 `.map` files emitted), no secret, no staging reference, no accidental `None` marker |

---

## 3. Requirement-by-requirement status

Legend: **VERIFIED** = already implemented and freshly verified · **NEW** = implemented in this continuation.

### Part A — Performance, loading and navigation

| # | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Page-specific skeletons (dashboard, list, tabs, article, form, chat, admin) replace blank fallbacks | VERIFIED / PASS | `src/components/system/RouteSkeleton.tsx`, mounted in `AppLayout`, `AdminLayout`, `App.tsx` |
| 2 | Workouts route gets a list-shaped skeleton, not a blank frame | VERIFIED / PASS | `skeletonVariantFor()` maps `/app/workouts` → `list` |
| 3 | Hover / focus / touch / idle route prefetch, code only, never bypassing `AuthGuard` | VERIFIED / PASS | `src/lib/routePrefetch.ts` (11 routes) |
| 4 | Skeletons announced to assistive tech | VERIFIED / PASS | `role="status"` + `aria-busy` |

### Part B — Typography, contrast and visual system

| # | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| 5 | Fraunces for all H1s; semantic tokens only; no raw hex in components | VERIFIED / PASS | Batch-1 visual pass retained; hex grep clean |
| 6 | `tabular-nums` on all numeric displays | VERIFIED / PASS | Global rule + new admin metric tiles |
| 7 | Cards `rounded-xl`, inputs `rounded-lg`, 44 px minimum touch targets | VERIFIED / PASS | Prompt 6 mobile pass retained |

### Part C — Today, Profile and notifications

| # | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| 8 | Program progress shows overall day and phase-relative day | VERIFIED / PASS | `ProgramProgressLine.tsx` → "Day X of 180 · Phase: day Y of Z" |
| 9 | Catch-up section on Today; no perfectionism or forced-progression wording | VERIFIED / PASS | Batch 1 POST-v2 wording retained |
| 10 | Hydration is logging-only — no target, no ring, points for the act of logging | VERIFIED / PASS | `src/lib/hydration.ts`; "N oz logged today" |
| 11 | VITA quote card prev/next only when more than one quote exists | VERIFIED / PASS | `VitaQuoteCard.tsx` |
| 12 | Notifications bell present on member and admin shells | VERIFIED / PASS | `NotificationsBell` |

### Part D — Meals, Learn, Guides, Mindset

| # | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| 13 | Readable quantity-less ingredients — no truncated names such as "arge eggs" | VERIFIED / PASS | `src/lib/ingredients.ts` + 13 unit tests |
| 14 | Shopping list defaults to the "By meal" view | VERIFIED / PASS | `Meals.tsx` `shoppingView` default |
| 15 | Meal names wrap; swaps are non-destructive; stale-plan notice shown | VERIFIED / PASS | `Meals.tsx` |
| 16 | Deep-linked guide can be exited: "Return to Guides" clears `?guide=`, collapses the article and restores focus | **NEW** / PASS | `src/pages/app/Learn.tsx` — focusable `Guides` heading, `returnToGuides()` |
| 17 | Fasting stays education-only — no timers, questionnaire, scheduling or notifications | VERIFIED / PASS | `FASTING_SCHEDULING_ENABLED === false`, `fastingDisabled.test.ts` |

### Part E — Ask, Community, Support, Settings

| # | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| 18 | Deterministic Support answers before any assistant call | VERIFIED / PASS | `src/lib/supportFaq.ts` `deterministicSupportAnswer` |
| 19 | Support entry points merged into one surface; tickets persist | VERIFIED / PASS | `support_tickets`, `AdminSupport.tsx` |
| 20 | Toast durations: 5 s success, 7 s info, 9 s destructive, pause on hover/focus | VERIFIED / PASS | `src/hooks/use-toast.ts` |
| 21 | Coaching interest: member-facing registration with explicit consent, withdrawal, no health narrative fields | **NEW** / PASS | `src/components/settings/CoachingInterestCard.tsx`, mounted in `Settings.tsx` |

### Part F — Admin consolidation

| # | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| 22 | Top Customers retired from active admin navigation and redirected | **NEW** / PASS | `AdminLayout.tsx`, `App.tsx` → redirect to `/admin/subscriptions` |
| 23 | Admin billing metrics reconciled to the canonical model: orders, active subscriptions, trialing, cancellations, refunds, disputes, payment failures — each counted separately, stamped "as of", and a backend failure renders an error rather than a fabricated zero | **NEW** / PASS | `src/pages/admin/AdminSubscriptions.tsx` reads `orders`, `subscriptions` and the `billing_events` ledger |
| 24 | Coaching-interest admin review surface | **NEW** / PASS | `src/pages/admin/AdminCoachingInterest.tsx` |
| 25 | Persistent "Back to member app" link in the admin shell | **NEW** / PASS | `AdminLayout.tsx` |
| 26 | Daily Digest and PHI protections unchanged; PHI read through `read-phi-data` with audit logging | VERIFIED / PASS | `AdminWaitlist.tsx`, `AdminPhiLog.tsx` |

### Part G — Database, RLS and inventory coverage

| # | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| 27 | `public.coaching_interest` created with GRANTs, RLS enabled, self-management + admin policies | **NEW** / PASS | migration applied |
| 28 | New table added to the export / deletion inventory so data-rights coverage stays complete | **NEW** / PASS | `supabase/functions/_shared/inventory.ts` — `coaching_interest`, `export_and_delete` |
| 29 | Existing RLS, billing, privacy and disabled-feature controls untouched | VERIFIED / PASS | `accountSurfaceAccess`, `dataRights`, `legalGates`, `billingLifecycle` suites all green |

### Part H — Signed-in task matrix (24 tasks, desktop and mobile)

All 24 tasks exercised against the current tree at 1280-px desktop and 390-px mobile widths.

| # | Task | Desktop | Mobile |
| --- | --- | --- | --- |
| 1 | Sign in and land on Today | PASS | PASS |
| 2 | Read program day and phase progress | PASS | PASS |
| 3 | Log a habit | PASS | PASS |
| 4 | Log hydration (no target shown) | PASS | PASS |
| 5 | Open and complete a daily action sub-task | PASS | PASS |
| 6 | Use the catch-up section | PASS | PASS |
| 7 | Open Meals and read the day plan | PASS | PASS |
| 8 | Swap a meal non-destructively | PASS | PASS |
| 9 | Open the shopping list, default "By meal" | PASS | PASS |
| 10 | Toggle to the combined list, readable ingredients | PASS | PASS |
| 11 | Open Progress → Weight | PASS | PASS |
| 12 | Open Progress → Blood sugar, see safety banding | PASS | PASS |
| 13 | Open Progress → A1C, neutral wording | PASS | PASS |
| 14 | Open Learn → Mindset week | PASS | PASS |
| 15 | Deep-link into a guide, then Return to Guides | PASS | PASS |
| 16 | Open Library | PASS | PASS |
| 17 | Start and leave a workout, no loading flash | PASS | PASS |
| 18 | Ask VITA a question with consent gate | PASS | PASS |
| 19 | View Community inside Ask (single surface) | PASS | PASS |
| 20 | Open Support, receive a deterministic answer | PASS | PASS |
| 21 | Raise a support ticket that persists | PASS | PASS |
| 22 | Register and withdraw coaching interest | PASS | PASS |
| 23 | Open Billing and read membership state | PASS | PASS |
| 24 | Export data, then sign out | PASS | PASS |

### Accessibility matrix

| Check | Result |
| --- | --- |
| Skip-to-main link on the member shell | PASS |
| Single H1 per page | PASS |
| All interactive targets ≥ 44 × 44 px on mobile | PASS |
| Visible focus ring on every interactive control | PASS |
| Loading states announced (`role="status"`, `aria-busy`) | PASS |
| Navigation landmarks labelled (`aria-label` on each `nav`) | PASS |
| Focus restored after deep-link exit and sheet close | PASS |
| Icons decorative (`aria-hidden`) with text labels alongside | PASS |
| Colour contrast — semantic tokens only, no raw hex | PASS |
| Keyboard-only traversal of all 24 tasks | PASS |

**BLOCKED / FAIL / NOT TESTED: none.**

---

## 4. Complete list of files changed in this continuation

| File | Change |
| --- | --- |
| `src/pages/app/AppLayout.tsx` | Removed 16 invalid `None` props from `NavLink`; preserved `end` on the root Today link and all prefetch handlers |
| `src/pages/app/Learn.tsx` | Added focusable `Guides` heading, `returnToGuides()`, "Return to Guides" control, `ArrowLeft` import, `setSearchParams` |
| `src/pages/app/Settings.tsx` | Mounted `CoachingInterestCard` |
| `src/components/settings/CoachingInterestCard.tsx` | New — member coaching-interest registration and withdrawal with explicit consent |
| `src/pages/admin/AdminCoachingInterest.tsx` | New — admin review and status management |
| `src/pages/admin/AdminSubscriptions.tsx` | Rebuilt billing metrics on the canonical order / subscription / billing-event model, added the as-of stamp and the explicit error state |
| `src/pages/admin/AdminLayout.tsx` | Retired Top Customers, added Coaching Interest and Waitlist tabs, added the persistent back-to-member-app link |
| `src/App.tsx` | Admin routing for coaching interest; Top Customers redirect |
| `src/pages/app/Meals.tsx` | Shopping list defaults to "By meal" |
| `supabase/functions/_shared/inventory.ts` | Added `coaching_interest` as `export_and_delete` |
| Database migration | `public.coaching_interest` with GRANTs, RLS and policies |

Earlier in the same Batch 2 run: `src/lib/ingredients.ts`, `src/lib/__tests__/ingredients.test.ts`, `src/components/system/RouteSkeleton.tsx`, `src/lib/routePrefetch.ts`, `src/hooks/use-toast.ts`.

---

## 5. Boundaries held

- No publication and no deploy.
- No live payment mutation — Stripe is read-only in this run.
- No outbound email or SMS.
- No external AI call added or altered; deterministic answers run first.
- Fasting scheduling remains disabled.
- All Batch 1 POST-v2 clinical wording intact.

**Batch 2 is complete. Every gate passes. Nothing is published.**
