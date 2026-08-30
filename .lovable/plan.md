# Batch 2 — Final Evidence Correction (backend only)

Backend and documentation only. No design, accessibility, performance or 24-task browser
matrix work. Nothing published. Reused client evidence keeps its original execution dates.

## What is actually wrong today

Confirmed by reading the canonical manifest and the reconciliation artifact:

- The canonical manifest `supabase/functions/_shared/inventory.ts` **already** treats
  `community_questions`, `community_answers`, `community_votes`, `win_posts`, `conversations`
  and `messages` as personal data with `export_and_delete` (matched on `author_id`,
  `voter_id` and member-bound `visitor_profile_id`).
- `docs/batch2-evidence/prompt3-inventory-reconciliation.json` labels those same surfaces
  `configuration_or_content`. This is a **generator classification defect**, not a manifest gap.
- One genuine manifest issue: `support_ticket_notes` is `reference_only` although each note is
  tied to a member's support ticket.

## 1. Classification rule and manifest correction

Adopt one written rule, enforced in code:

> A public table is personal data when it has a member/author/actor/voter user column, a
> `visitor_profile_id` that can bind to a member, or a foreign key to a member-owned row
> (for example `support_ticket_notes.ticket_id` → `support_tickets.user_id`).

- Reclassify `support_ticket_notes` in the canonical manifest to
  `export_redacted_and_delete` matched through its parent ticket, redacting the internal
  staff author identifier. Notes are deleted with the member's tickets.
- Community content policy: the documented policy does **not** authorise retaining linked
  community content, so `community_questions`, `community_answers`, `community_votes` and
  `win_posts` are deleted on member deletion. No de-identification branch is introduced. This
  exact rule is recorded in the artifacts rather than a "non-personal" label.
- Update the manifest tests to assert the rule for every listed surface.

## 2. Reconciliation generator must fail closed

Rewrite the Prompt 3 reconciliation generator as a source-controlled script that:

- reads live catalogue metadata (columns, foreign keys, policies, grants) read-only;
- derives personal-data status from the rule above rather than a hand-maintained label list;
- cross-checks every derived personal-data table against the canonical manifest;
- **exits non-zero** (fail closed) if any author-linked, user-linked, visitor-profile-linked or
  ticket-linked table is classified non-personal, or is missing from the manifest.

Regenerated output: `docs/batch2-evidence/prompt3-inventory-reconciliation.json`, including the
seven named surfaces with corrected categories and dispositions.

## 3. Synthetic member: export and deletion proof

One new labelled synthetic member (isolated, `@example.invalid`), with records seeded across
every corrected surface: community question, answer, vote, win post, conversation, message,
support ticket plus a note, and control rows on already-correct surfaces.

- Run the **real** export path (`export-my-data` / `download-export`) and verify each seeded
  record appears under the correct category, with security-only surfaces
  (`reauth_tickets`, `state_nonces`, `product_validation_tokens`, secrets) absent.
- Run the **real** deletion workflow (`request-account-deletion` → `process-deletion-job`) and
  record expected-versus-actual counts per corrected surface, reconciling to zero unexplained
  rows.
- Confirm `retention-report` stays report-only and deletes zero rows.
- Delete every synthetic record by exact ID, re-query every affected surface, prove zero
  residue, and re-confirm all safety flags at their recorded pre-run values. The single real
  owner account and all real member rows are untouched. No live Stripe, Resend, Dexcom or AI
  call; the deletion fixture is never-billed.

## 4. Deno gate resolution

Re-run `deno check` over the changed functions and shared modules plus function tests and boot
smoke, then record exactly one status: `PASS` if clean, otherwise
`BLOCKED — accepted pre-existing toolchain conflict` with the unchanged supabase-js type
conflict quoted verbatim and passing tests/smoke alongside it. `PARTIAL` is removed.

## 5. Regenerated artifacts

`data-lifecycle.json`, `prompt3-inventory-reconciliation.json`, `synthetic-cleanup.json`,
`gates.json` and `docs/BATCH-2-COMPLETION-REPORT.md`, with refreshed SHA-256 for every
artifact. Downloadable copies stay redacted (no real email, UUID, token, IP or member text).

Batch 2 closes only with zero FAIL, zero NOT TESTED, zero PARTIAL, an executed synthetic
export, an executed deletion/reconciliation, accurate classifications for all member-linked
surfaces, and zero synthetic residue. The empty `auth.audit_log_entries` history stays an
accepted BLOCKED platform limitation. Nothing is published.

## Technical notes

- Files expected to change: `supabase/functions/_shared/inventory.ts`, its tests, deletion and
  export handlers where the note surface is enumerated, a new
  `tools/batch2/prompt3_reconcile.py`, a new synthetic export/deletion harness under
  `tools/batch2/`, and the evidence/report files above.
- Any database behaviour change ships as a source-controlled migration with rollback notes and
  a source hash; none is expected for classification alone.
