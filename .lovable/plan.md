# Batch 1 — Part I closeout and corrected final export

Closes Batch 1 with verification evidence only plus the two correction items named below. No publication, no real email, no external AI call, no Stripe change, no real member data mutated.

## 1. Support ticket diagnostics (controlled schema removal)

Confirmed by inspection: `public.support_tickets` has a `user_agent text` column, and it currently holds no data (0 non-null values across 0 rows). Export-time redaction is not sufficient, so the column is removed. This is treated as a controlled destructive removal, not an additive change.

- The migration fails closed: it aborts unless the column exists **and** a count taken immediately before the drop returns zero non-null values. The observed count is raised as a notice and recorded in the Batch 1 report.
- Replace it with minimum non-identifying diagnostics: `client_platform` (`web` / `ios` / `android` / `unknown`) and `client_viewport` (`mobile` / `desktop`), both constrained. No version strings, no raw header.
- Stop sending the raw user agent from `Support.tsx` and stop accepting it in `support-request`; derive the two coarse fields instead.
- Update the Prompt 3 personal-data manifest entry from "redacted on export" to "not collected".
- Rollback recreates the empty column only; it makes no claim to restore data, because there was none.


## 2. Activity Score canonical source (correction)

Current state confirmed by query: `points_ledger` has 0 rows, `visitor_profiles.reset_points` sums to 0, and `user_streaks.total_xp` sums to 2000 across existing rows. The ledger and the legacy XP field therefore do not reconcile today.

- Inventory every writer of `total_xp`, `helpful_points`, `reset_points`, `level` and list which UI surfaces read each.
- Make `points_ledger` the only Activity Score authority: `useActivityScore` stays the sole read path, and `award_points` stays the sole write path (idempotent on `(user_id, idempotency_key)`).
- Prove idempotency and no double-award with a replay test (same key twice, two concurrent awards, workout replay) asserting a single ledger row and one unchanged total.
- Reconciliation rule: where a member's legacy XP cannot be mapped to ledger entries, do not display a number. The Activity Score card and any level display fall back to a "score is being migrated" state instead of showing two contradictory values. Streak display is unaffected.
- Record before/after counts for ledger rows, legacy XP totals and reconciled vs hidden members.

## 3. Part A inventory correction (final regeneration)

Regenerate the four artifacts against `DRM_Batch1_Content_Inventory_QA_Findings.md` acceptance criteria, with the fail-closed gates already built into the generator:

- 187 daily records reconciled — 180 active guided days plus 7 historical duplicates, counted and asserted.
- The seven Day 15–21 duplicate conflicts each dispositioned explicitly as historical/non-display, with proof each is unreachable.
- Coverage manifest covering database, admin-editable rows, source files, prompts, notification defaults and seed content, with an explicit reason for any surface producing zero items — including the newly added `support_tickets`, `points_ledger` and `workout_completion_receipts` surfaces.
- False-negative and false-positive regression fixtures must all pass before artifacts are written.
- Contextual KEEP / REWRITE / RETIRE dispositions, preserving the approved education-only fasting and supplement safety guides.
- Exact record IDs and before/after copy for Day 64 and every other temporary fallback, listed in the replacement matrix.

## 4. Part I verification gates

Run and report actual PASS / FAIL / BLOCKED for each: production build; full Vitest suite; Deno checks on all edge functions; lint on touched files only; RLS tests as anonymous, Member A, Member B and admin; export, deletion and retention coverage for the new personal-data surfaces; timezone boundary cases; glucose reference boundaries in both units; habit concurrency; support truth (ticket persisted before any success message); workout replay and history; score and badge reconciliation; banned-content scan across source and database; signed-in desktop and mobile task checks; bundle purity; protected-system regressions (magic link, deterministic VITA, billing, consent, deletion); and cleanup of synthetic fixtures by exact ID with before/after row counts.

## 5. Final export

Export the corrected four doctor-review artifacts plus one complete Parts A–I Batch 1 report containing all gate results and before/after counts, and an explicit statement that doctor review remains open pending the owner-approved clinical appendix.

## Technical notes

- Schema work: one additive migration (drop of the empty `user_agent` column plus two coarse diagnostic columns) with GRANTs and rollback notes.
- Verification runs against mocked email/AI/Stripe paths; synthetic records are created and removed by exact ID only.
