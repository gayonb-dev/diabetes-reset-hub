# Batch 2 — Evidence Reconciliation (backend and documentation only)

No new feature work, no client publication, no design/accessibility/performance testing, no repeat of the 24-task matrix. Reused evidence keeps its original execution dates. Only the affected Edge Functions may be deployed, and only if a runtime fix is proven necessary.

## 1. Recover existing evidence before anything else

- Recover the prior A/B harness run output from the retained sandbox execution logs (the full stdout of the passing run, including seeded IDs, export snapshot metadata, per-surface counts, deletion reconciliation and cleanup before/after counts) and the deployment/receipt records already captured for `export-my-data` and `process-deletion-job`, plus the recorded HTTP 404 proving the temporary `batch2-harness` function was deleted.
- Store the recovered material as `docs/batch2-evidence/export-deletion-run.json` (machine-readable) with a short human index.
- Recover existing evidence first. If a required result was never captured, cannot be recovered, or was invalidated by a runtime correction, execute only that missing or affected check. Preserve all valid, unaffected prior results. Use local/server-authorized tooling first; a temporary harness deployment is not mandatory and is used only when existing authorized tooling cannot perform the necessary check, under the previously approved authentication, no-email/no-processor, deletion, 404 and temporary-secret-removal safeguards. Do not repeatedly recreate fixtures or rerun completed client tests.
- Recover logs without copying unredacted stdout into the repository or downloads: strip credentials, tokens, signed download URLs and real member data, and use consistent synthetic aliases.

## 2. Classification correctness (generator and manifest)

Confirmed discrepancies to resolve:

- The reconciliation generator parses the canonical manifest with a single-line regex, so the multi-line `support_ticket_notes` entry (already correctly `parent` / `export_redacted_and_delete`) is invisible to it and is reported as non-personal. This is an **evidence defect**, not a runtime defect.
- `billing_holds` carries `user_id` yet is reported non-personal with `owner_columns: ["user_id"]`, and it is absent from the canonical manifest. Same review for `billing_events` and `content_containment_log`.
- `community_answer_embeddings` is manifest-listed as `match: "visitor_profile"` on `answer_id`, which does not describe its real relationship (`answer_id` → `community_answers.author_id`). Its `reference_only` disposition must either be re-derived from the true parent relationship or the entry corrected.

Work:

1. Read the manifest structurally — load a machine-readable representation from the actual module rather than another fragile text regex — so every entry (single- and multi-line) is seen.
2. Make the independent ownership checks genuinely fail closed. Ownership stays distinct from audience-access policies and from technical author/editor metadata; an unknown but potentially personal relationship must require resolution and must never silently become non-personal.
3. Prove failure with isolated negative fixtures — the previous `support_ticket_notes` misclassification, a missing manifest entry, an incorrect embedding relationship, and an unrecognized ownership path — and prove the corrected actual manifest passes. The `support_ticket_notes` entry is already correct and is not altered merely to demonstrate a failing test.
4. Reconcile **every** remaining non-personal classification (currently 13) individually, recording for each the reason it holds no member linkage.
5. Update the canonical manifest only where a real gap exists. Personal-data classification and export/deletion disposition are separate decisions: for `billing_holds`, `billing_events`, `content_containment_log` and derived embeddings, document the actual subject relationship and the approved field-level export, deletion or retention rule. Do not export raw internal event payloads and do not delete deduplication, security or financial records merely because a table becomes classified personal; preserve existing billing restrictions, event replay protection and approved retention rules. Update `src/test/inventory.test.ts` accordingly.

## 3. Runtime matching checks

- `orders`: resolve export/deletion ownership only through verified immutable relationships — `orders.user_id` or the order's member-owned subscription relationship. Do not use `customer_email`, a JWT email, or an email match as an ownership fallback. Missing or contradictory ownership fails closed. Preserve all seven ownerless legacy orders and existing financial-retention rules. Use synthetic cases to prove that matching an email does not expose or delete an ownerless or another member's order. Distinguish an inaccurate manifest description from an actual runtime defect; change runtime only where necessary.
- `community_answer_embeddings`: confirm the resolution path through answer → author, not a visitor-profile mismatch.
- For each finding, state explicitly whether it was incorrect **evidence** or incorrect **runtime behaviour**; rerun only the checks that a runtime change invalidates.

## 4. Machine-readable export/deletion results

Replace every placeholder such as `"recorded in harness artifact"` in `data-lifecycle.json` with real values or a file reference to the recovered run record:

- actual ZIP and JSON byte sizes and SHA-256 hashes;
- per-surface inclusion/exclusion results with expected vs actual counts;
- snapshot consistency: separate tickets prove separate single-use authorization, not snapshot consistency. Compare the ZIP and JSON against the same recorded dataset/snapshot, or use unchanged synthetic fixtures and compare normalized category contents while allowing documented format-specific timestamps. Do not substitute assertions or placeholders for observed results;
- attachment/response headers (`Content-Disposition`, `Cache-Control: no-store`, `X-Content-Type-Options`);
- reauthentication ticket single-use, download replay rejection and expiry results;
- deletion retry/idempotency results;
- Member B control comparison evidence, with the documented parent cascade recorded as an expected relational consequence.

## 5. Cleanup reconciliation

Reconcile cleanup across every synthetic surface: profiles, visitor profiles and sessions, reauth tickets, export artifacts and Storage objects, deletion jobs and receipts, and Auth users. Record intentionally retained security metadata separately from residue. Include the harness-deletion 404 evidence and confirm removal of any temporary secret.

## 6. Release and gate hygiene

- Record final code SHA, affected-function deployment versions and timestamps, rollback instructions, and before/after policy and grant comparisons for anything changed this pass.
- Run fresh lint on this pass's changed files only.
- Relabel the catalogue-derived RLS material as **catalogue inspection**, distinct from executed RLS probes, and attach the approved changed-surface isolation/CORS evidence.
- Deno gate stays `PASS` or `BLOCKED — accepted pre-existing toolchain conflict`; no `PARTIAL`, no `NOT TESTED`. Accepted historical limitations (empty `auth.audit_log_entries`) stay as they are and are not reopened.

## 7. Regenerate artifacts last

Only once the code, runtime behaviour and evidence agree, regenerate `prompt3-inventory-reconciliation.json`, `data-lifecycle.json`, `synthetic-cleanup.json`, `gates.json`, `BATCH-2-COMPLETION-REPORT.md` and `ARTIFACT-SHA256.txt`, and re-export the download set. Statuses are never changed merely to obtain closure; if a required check cannot be honestly passed, the report says so.

## Technical notes

Files expected to change: `supabase/functions/_shared/inventory.ts`, `supabase/functions/_shared/exportBuild.ts` and `process-deletion-job` (only if a runtime ownership fix is required), `tools/batch2/prompt3_reconcile.py`, `tools/batch2/export_deletion_ab_harness.py`, `src/test/inventory.test.ts`, and the `docs/batch2-evidence/` artifact set. Preflight (project `wqennhjdojjqmmqzjhti`, domain, safety flags, no real email/Stripe/Resend/Dexcom/external-AI calls) is re-confirmed before any write or synthetic seeding.
