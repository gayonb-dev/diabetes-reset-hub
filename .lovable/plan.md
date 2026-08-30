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

1. Fix the generator to parse the manifest structurally (all entries, single- and multi-line), so manifest coverage is reported accurately.
2. Make the independent ownership checks genuinely fail closed: a table with an owner-style column, an FK path to `auth.users` / `profiles` / `visitor_profiles` / a member-owned parent, or a subject-linked `auth.uid()` RLS predicate must never be emitted as non-personal. Verify the corrected generator fails on `support_ticket_notes`, `billing_holds` and `community_answer_embeddings` before the manifest is fixed, then passes after.
3. Reconcile **every** remaining non-personal classification (currently 13) individually, recording for each the reason it holds no member linkage.
4. Update the canonical manifest where a real gap exists (billing/containment surfaces, embeddings relationship), with correct match kind, disposition, order and redaction; update `src/test/inventory.test.ts` accordingly.

## 3. Runtime matching checks

- `orders`: verify export/deletion actually resolve orders through immutable ownership (`orders.user_id`, or `subscription_id` → member-owned subscription) rather than `customer_email` alone. The manifest entry is currently `customer_email`; if runtime relies on it, change runtime to prefer immutable ownership with email only as a documented legacy fallback consistent with the applied RLS migration. Preserve the seven ownerless legacy orders untouched and preserve financial-retention rules (no deletion of records retention requires).
- `community_answer_embeddings`: confirm the resolution path through answer → author, not a visitor-profile mismatch.
- For each finding, state explicitly whether it was incorrect **evidence** or incorrect **runtime behaviour**; change runtime only where required, and rerun only the checks that a runtime change invalidates.

## 4. Machine-readable export/deletion results

Replace every placeholder such as `"recorded in harness artifact"` in `data-lifecycle.json` with real values or a file reference to the recovered run record:

- actual ZIP and JSON byte sizes and SHA-256 hashes;
- per-surface inclusion/exclusion results with expected vs actual counts;
- snapshot consistency proof (both formats from one server snapshot, or two tickets);
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
