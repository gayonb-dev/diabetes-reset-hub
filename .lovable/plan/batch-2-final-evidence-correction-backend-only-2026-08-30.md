# Batch 2 — Final Evidence Correction (backend only)

Backend and documentation only. No design, accessibility, performance or 24-task browser-matrix
work. No client publication. The only production deployments permitted are the affected Edge
Functions identified in §7, after testing and rollback capture. Reused client evidence keeps its
original execution dates. The safeguards below control wherever earlier wording conflicts or is
silent.

## 0. Production and mutation preflight

Before any write: confirm project `wqennhjdojjqmmqzjhti` and `https://diabetesresetmethod.com`;
confirm every safety flag at its recorded pre-run value; confirm global email auto-confirm
disabled; confirm no real email, Stripe, Resend, Dexcom or external-AI call can occur. Stop if
the project differs, a safety flag cannot be preserved, or isolation from real email, Stripe,
Resend, Dexcom and external-AI calls cannot be proven before synthetic writes begin. If a
migration unexpectedly becomes necessary, confirm a current production restore point before
applying it.

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

## 1. Ownership, not audience access

A policy merely containing `auth.uid()` is not ownership evidence (an entitlement check letting
active members read shared educational content is audience access). The classifier requires a
traceable relationship between the current row and the person through: a row subject/owner
column; a foreign key; a parent member-owned record; a visitor-profile relationship; or an RLS
predicate connecting a current-row subject field to `auth.uid()`.

Recognised owner columns include `user_id`, `member_id`, `owner_id`, `author_id`, `actor_id`,
`voter_id`, `created_by`, `submitted_by`, `recipient_id`, `profile_id` and equivalents.
Foreign-key traversal is cycle-safe; unknown ownership relationships fail closed.

Generator fixtures, positive and negative: direct ownership; indirect parent ownership;
visitor-profile ownership; author/voter ownership; ticket-note parent ownership;
entitlement-only read access (must not be read as ownership); cyclic foreign keys; an unknown
relationship; and a personal table missing from the canonical manifest.

The generator exits non-zero when an author-, user-, visitor-profile- or ticket-linked table is
classified non-personal or is missing from the manifest, and evidence may never show
`owner_columns: []` for a surface whose policies or foreign keys establish ownership.

## 2. Manifest corrections and the support-note rule

`support_ticket_notes` becomes personal-by-association, matched through its parent ticket and
deleted with the member's tickets. Export follows a deterministic rule:

- Schema-designated member-visible note: export allowlisted text, ticket reference, timestamps.
- Admin-only or free-form note with no member-visible designation: no raw body in the automatic
  archive — export a neutral reference recording that an internal support-note record exists
  and requires manual privacy review.
- Never export staff identifiers, internal security/fraud reasoning, secrets, routing metadata
  or another person's data.

The export README and machine-readable metadata state this disposition accurately.

Community content: the documented policy does not authorise retaining linked community content,
so questions, answers, votes and win posts are deleted on member deletion; no de-identification
branch is introduced. Manifest and allowlist tests assert the rule for every corrected surface.

## 3. Two isolated synthetic members

Member A (deletion/export subject) and Member B (untouched control), seeded across every
corrected surface, including cross-linked cases: A's answer/vote on B's content, B's
answer/vote on A's content, and separate A-only and B-only conversations, messages, tickets,
notes and win posts.

Proofs: A's export contains A's records and no B records; deleting A removes only what the
documented dependency rule requires; B's independent records remain byte-for-byte unchanged.
Independent Member B rows are reported separately from B rows that are children of an A-owned
parent, and any such cascade is recorded as an expected relational consequence. Both accounts
and all artifacts are cleaned by exact ID.

## 4. Complete real export path

Canonical function names come from the repository and live function inventory; no aliases are
created. Reauthentication is single-use and honoured exactly as the contract requires: if the
readable and machine-readable exports need separate requests, two separate server-created
synthetic single-use tickets are issued; if one server snapshot legitimately yields both
formats, both outputs are proven to come from that snapshot. A consumed or expired ticket is
proven unable to produce another export. No real email is sent.

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

## 6. No production test endpoint; access controls preserved

The A/B fixture and reconciliation harness stays local/server-authorized tooling under
`tools/batch2/` and does not become a publicly callable or permanently deployed function. No
new production verification secret is added. If an unavoidable temporary private function is
required it fails closed without a temporary high-entropy secret, returns no secrets, tokens,
member content or raw identifiers, is deleted immediately after verification, is confirmed 404
afterwards, and has its temporary secret removed. Local tooling is strongly preferred.

Manifest changes must not broaden grants, RLS policies or browser access. Record before/after
policy and grant digests for every corrected surface and confirm: anonymous access did not
increase; A cannot read B's private records and B cannot read A's; Admin/service-role behaviour
is unchanged and intentional; the seven legacy ownerless orders and all real records keep
identical counts and ownership values; no real row content enters an evidence artifact.

## 7. Deployment, rollback and final gates

Record current deployed versions or reproducible source SHAs and a tested rollback procedure
before deploying. No client publication: the only production deployments permitted are the
affected Edge Functions identified here — only those consuming the corrected manifest — after
testing and rollback capture. No live export is claimed as tested until the live functions run
the corrected manifest bytes.

Fresh runs: manifest and allowlist tests; reconciliation-generator fixtures; export
inclusion/exclusion tests; deletion, dependency and idempotence tests; cross-member isolation
tests; Deno tests and checks for changed functions/shared modules; lint on changed files; boot
and CORS smoke; policy/grant drift comparison; real synthetic ZIP and JSON export; real
synthetic deletion and reconciliation; retention report-only execution; exact-ID cleanup and
safety-flag restoration. Previous client build, accessibility, performance and 24-task evidence
keeps its original date and is not rerun.

Only PASS / FAIL / BLOCKED / NOT TESTED are used; `PARTIAL` is prohibited. The only permitted
final BLOCKED results are the accepted historical auth-audit limitation, the two recorded
localhost Support-browser checks whose allowed-origin server proof passed, and the unchanged
Deno/Supabase type-resolution conflict (only with the exact diagnostic class and location,
confirmation it is unchanged, and passing focused tests plus boot smoke). Any other new
in-scope BLOCKED result prevents closure.

## 8. Final artifacts

Regenerated: `data-lifecycle.json`, `prompt3-inventory-reconciliation.json`,
`synthetic-cleanup.json`, `gates.json`, `BATCH-2-COMPLETION-REPORT.md` and
`ARTIFACT-SHA256.txt` (hashing every final artifact except itself).

The report includes: corrected personal-data classifications; both export formats and their
contents; Member A versus Member B isolation results; the support-note disposition;
before/after policy and grant digests; affected function deployment versions; rollback
instructions; starting and final code SHAs; exact synthetic cleanup counts; permitted BLOCKED
items only; zero FAIL, zero NOT TESTED, zero PARTIAL; application code changed; migration
applied or not; real member data changed: no; client published: no.

## Technical notes

Expected changes: `supabase/functions/_shared/inventory.ts` and its consumers
(`exportBuild.ts`, export/download and deletion functions), a new cycle-safe
`tools/batch2/prompt3_reconcile.py` with fixture suite, a local synthetic A/B
export-and-deletion harness under `tools/batch2/` (`@example.invalid` only), manifest/allowlist
tests, and the evidence and report files above.
