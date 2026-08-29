# Batch 2 — current status (INCOMPLETE)

This is the only current Batch 2 status report. `docs/BATCH-2-COMPLETION-REPORT-REJECTED-WRONG-MATRIX.md`
is superseded and must not be cited as evidence. Nothing has been published.

## Now complete

- **Binding 24-task matrix executed** — `docs/batch2-evidence/task-matrix.json`
  now holds 24 desktop results (1280×1800) and 24 mobile results (390×844,
  touch), 48 independent records, each with expected behaviour, observed
  behaviour, a screenshot reference and an independent status.
  Summary: **46 PASS, 0 FAIL, 2 BLOCKED, 0 NOT TESTED**.
- **Task 16 (Support) is BLOCKED on both viewports for one deliberate reason**:
  `support-request` enforces an exact production origin allow-list and rejects
  `http://localhost:8080` at preflight. The same authenticated request from an
  allow-listed origin returned `{"ok":true,"reference":"DRM-…","email_status":"suppressed"}`,
  proving the ticket is persisted before success, the reference is returned and
  the email state is reported honestly. See `docs/batch2-evidence/support-ticket.json`.
  No real email was sent (`email_delivery_enabled=false`).
- **Progress-day guard** — `docs/batch2-evidence/progress-day-guard.json`, 20/20 PASS
  across anonymous, Member A, Member B, synthetic Admin JWT and service role.
- **Gates re-run on the current tree**: TypeScript PASS, Vitest 422/422 PASS,
  targeted ESLint PASS (1 pre-existing warning in `AppLayout.tsx`), production
  build PASS.
- **Synthetic residue**: 0 synthetic notifications, 0 synthetic support tickets.

## Fixes made while executing the matrix

- `src/pages/app/AppLayout.tsx` — the notifications bell existed only in the
  `lg`+ sidebar, so members below 1024px had no notifications entry point at
  all. A mobile-only bell is now rendered at the top of the main region.
- `src/pages/app/Fasting.tsx` — states plainly that there is no questionnaire,
  eligibility screening, timer or scheduler and that scheduling is unavailable.
- `src/pages/app/Ask.tsx` — the community entry point is labelled
  "Post to community", visibly distinct from the VITA composer.
- `src/pages/AdminDashboard.tsx` — Intake Forms and Challenge Progress panels
  removed.
- Migrations `0002` and `0003` — member-scoped email policies compare the JWT
  email claim instead of subquerying `auth.users`, which was causing the Admin
  subscriptions billing error.

## Evidence completed since the matrix run

- **Performance** — `docs/batch2-evidence/performance.json` and
  `route-loading.json`: 14 routes measured against the local production build,
  five first-load and five return-navigation runs each.
- **Accessibility** — `docs/batch2-evidence/accessibility.json`,
  `zoom-200-reflow.json` and `screenshots/index.md`: 11 routes at
  320/390/768/1280 plus both 200% zoom methods, keyboard focus and
  reduced motion. Final result: 0 low-contrast findings, 0 routes with
  horizontal overflow, 0 focusable elements without a visible focus
  indicator, reduced motion honoured (0 still-animating elements).
  Remaining sub-44px items are documented as accepted deviations
  (collapsed skip link, switches with full-width labels, inline text links,
  internal admin tab strip).
- Contrast and target fixes applied this pass are listed in
  `accessibility.json → fixes_applied_this_pass`.
- Gates re-run after those fixes: TypeScript clean, Vitest 438/438,
  production build 429.47 kB.

## Immutable order ownership (this pass)

See `docs/batch2-evidence/orders-immutable-ownership.md` for the full record.

- Migration `0005_orders_immutable_ownership_only.sql` removed the legacy
  email-claim fallback from the member `orders` SELECT policy. A member now
  reads an order only through `orders.user_id = auth.uid()` or an owned
  `orders.subscription_id`. Member writes revoked; Admin and service role
  unchanged; no order data written or backfilled.
- Future orders get an owner on both paths: the subscription webhook already
  bound `user_id`/`subscription_id`; `stripe-webhook` now calls
  `_shared/orderOwnership.ts#assignImmutableOwner`, resolving the account from
  the signed Stripe session address only, writing conditionally on
  `user_id IS NULL` (replay- and concurrency-safe), and leaving the order
  ownerless when no account matches.
- Synthetic-principal proof against production RLS: owner sees exactly its own
  order (1), cross-member sees 0, email-claim attack sees 0. The 7 legacy
  ownerless orders are member-inaccessible and Admin-visible.
- Deployed `stripe-webhook` only, from the exact tested source (SHA-256 in the
  evidence file); safe smoke returned HTTP 400 "No signature provided".
- Focused regression: `src/test/orderOwnership.test.ts` 8/8; full suite
  39 files / 446 tests; TypeScript clean; build 429.47 kB. Admin Billing is the
  only client surface reading `orders`, and its policy is unchanged.
- Synthetic cleanup: before 10 orders (3 synthetic), created 0, deleted 3 by
  exact id, remaining 7 with 0 synthetic. Safety flags re-read unchanged.

## Still outstanding before Batch 2 can be called complete

- Prompt 3 inventory run and `rls-principal-matrix.md` / `data-lifecycle.json`.
- `auto_confirm_email` audit for the 2026-08-28 window.
- Redaction sweep across all evidence artifacts.
- Final `docs/BATCH-2-COMPLETION-REPORT.md`, written only after the above pass.


