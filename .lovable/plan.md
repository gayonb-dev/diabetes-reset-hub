# Batch 2 — Final Evidence Correction (backend only)

Backend and documentation only. No design, accessibility, performance or 24-task browser
matrix work. Nothing published. Reused client evidence keeps its original execution dates.
The safeguards below control wherever any earlier wording conflicts.

## 0. Production and mutation preflight

Before any write: confirm project `wqennhjdojjqmmqzjhti` and `https://diabetesresetmethod.com`;
confirm every safety flag at its recorded pre-run value; confirm global email auto-confirm
disabled; confirm no real email, Stripe, Resend, Dexcom or external-AI call can occur. Stop only
on project mismatch or a flag that cannot be preserved. If a migration unexpectedly becomes
necessary, confirm a current production restore point before applying it.

## What is actually wrong today

Confirmed by reading the canonical manifest and the reconciliation artifact:

- `supabase/functions/_shared/inventory.ts` **already** treats `community_questions`,
  `community_answers`, `community_votes`, `win_posts`, `conversations` and `messages` as
  personal data with `export_and_delete` (matched on `author_id`, `voter_id`, member-bound
  `visitor_profile_id`).
- `docs/batch2-evidence/prompt3-inventory-reconciliation.json` labels those same surfaces
  `configuration_or_content`. This is a **generator classification defect**, not a manifest gap.
- One genuine manifest issue: `support_ticket_notes` is `reference_only` although every note is
  tied to a member-owned support ticket.

## 1. Classification by relationship, fail closed

Personal data is derived, not hand-labelled, from: foreign keys to `auth.users`, `profiles`,
`visitor_profiles` or another member-owned row; direct and indirect ownership paths; RLS
policies containing `auth.uid()` ownership checks; canonical manifest subject keys; and owner
column names (`user_id`, `member_id`, `owner_id`, `author_id`, `actor_id`, `voter_id`,
`created_by`, `submitted_by`, `recipient_id`, `profile_id` and equivalents).

Foreign-key traversal is cycle-safe and fails closed when an ownership path is detected but not
understood. The generator exits non-zero if any author-, user-, visitor-profile- or
ticket-linked table is classified non-personal or is missing from the manifest. Generated
evidence may never show `owner_columns: []` for a surface whose policies or foreign keys
establish member ownership.

## 2. Manifest and policy corrections

- `support_ticket_notes` becomes personal-by-association: matched through its parent ticket,
  deleted with the member's tickets, exported under an explicit **field allowlist**. Staff
  identifiers, security/fraud logic, secrets, internal routing metadata and other people's data
  are excluded by allowlist, not by omission. The disposition states explicitly whether note
  text is included, redacted, or routed for manual privacy review.
- Community content: the documented policy does not authorise retaining linked community
  content, so questions, answers, votes and win posts are deleted on member deletion. No
  de-identification branch is introduced. The exact rule is recorded in the artifacts.
- Manifest tests assert the rule for every corrected surface.

## 3. Two isolated synthetic members

Member A (deletion/export subject) and Member B (untouched control), both seeded across every
corrected surface, including cross-linked cases: A's answer/vote on B's content, B's
answer/vote on A's content, and separate A-only and B-only conversations, messages, tickets,
notes and win posts.

Proofs: A's export contains A's records and no B records; deleting A removes only what the
documented dependency rule requires; B's independent records remain byte-for-byte unchanged.
Any B response cascaded by deleting A's parent post is recorded explicitly as an expected
relational consequence. Both accounts and all artifacts are cleaned by exact ID.

## 4. Complete real export path

Canonical function names are taken from the repository and live function inventory; no aliases
are created. A server-created synthetic reauthentication ticket is used, sending no email.
Exercised and recorded: readable ZIP; machine-readable JSON; category and source-table
metadata; exact inclusion of corrected surfaces; exclusion of security-only fields and Member
B's data; attachment, `no-store` and `nosniff` headers; one-time download; replay rejection;
expiry/cleanup of the exact synthetic artifact. No export is PASS from manifest mapping alone.

## 5. Deletion and processor truthfulness

Run the real deletion state machine for Member A: expected-versus-actual counts per corrected
table, dependency order, reconciliation, retry/idempotence, zero unexplained rows. The
never-billed fixture is recorded as having no applicable Stripe object — never
processor-verified or processor-deleted — with zero external processor calls. Deletion
receipts, jobs, export artifacts and other synthetic audit rows are either removed by exact ID
or listed explicitly as intentionally retained test evidence. Shared/IP-partitioned rate-limit
counters are classified as expiring security metadata and reported separately, never deleted to
manufacture a zero. Retention stays report-only and deletes zero rows.

## 6. Deployment and reproducibility

Because `_shared/inventory.ts` changes deployed behaviour: test the exact source first; deploy
only the Edge Functions consuming the corrected manifest; record names, deployment timestamps
and tested source SHA; run boot/CORS smoke after deployment; publish no client bundle. No live
export is claimed as tested until the live functions run the corrected manifest bytes.

## 7. Deno gate and final artifacts

The Deno gate records exactly one of `PASS`, or `BLOCKED — accepted pre-existing toolchain
conflict` with the exact diagnostic class and location, confirmation it is unchanged, and
passing focused tests plus boot smoke. No secrets or credentials appear. `PARTIAL` is
prohibited everywhere; only PASS / FAIL / BLOCKED / NOT TESTED are used.

Regenerated: `data-lifecycle.json`, `prompt3-inventory-reconciliation.json`,
`synthetic-cleanup.json`, `gates.json`, `BATCH-2-COMPLETION-REPORT.md` and
`ARTIFACT-SHA256.txt` (which hashes every final artifact except itself). The report states
separately: application code changed; migration applied or not; Edge Functions deployed; client
published: no; real member data changed: no — plus starting and final code SHAs, before/after
counts, Member B control results, and the accepted historical auth-audit BLOCKED limitation.

Batch 2 closes only with zero FAIL, zero NOT TESTED, zero PARTIAL, accurate classification of
every member-linked surface, successful readable and machine-readable exports, successful
deletion and reconciliation, Member B unchanged except any justified parent cascade, zero
unexplained synthetic residue, safety flags restored, and no client publication.

## Technical notes

Expected changes: `supabase/functions/_shared/inventory.ts` and its consumers
(`exportBuild.ts`, export/download and deletion functions), a new cycle-safe
`tools/batch2/prompt3_reconcile.py`, a synthetic A/B export-and-deletion harness under
`tools/batch2/` (secret-gated, `@example.invalid` only), manifest/allowlist tests, and the
evidence and report files above.
