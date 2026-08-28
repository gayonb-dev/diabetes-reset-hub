# Batch 2 — Closeout Correction

The existing completion report is treated as rejected evidence. All correct Batch 2 code already in the tree is preserved; the report's conclusion becomes "incomplete" until every corrected gate passes. Nothing is published.

## Approach

One continuous run, in this order:

1. **Audit the working tree** against each required behavior (routes, typography, Today/Profile/notifications, Meals, Learn/Ask/Community/Support/Settings, Admin). For each item: implement it if missing, or capture direct behavioral evidence that it already works. No item is marked done from a token name or a code read alone.
2. **Implement the gaps found.** Expected areas based on current tree: route skeletons and prefetch coverage for every listed route, Fraunces size confirmation in authenticated headings, notification read semantics, Meals persistence after reload, Learn action inventory + Return-to-Guides focus/URL restore, Support sample-input removal and ticket reference, obsolete Settings controls, Admin back-link/metrics/support-queue/coaching-interest/digest requirements.
3. **Evidence capture with Playwright** against the local authenticated app using synthetic, non-sensitive data:
   - performance: cold `/app`, time to shell, heading, useful content, first + return navigation for each primary route, request counts (before/after);
   - computed font sizes, computed contrast ratios, computed target sizes — measured from the DOM, not from tokens;
   - viewports 320 / 390 / 768 / 1280, 200% zoom, keyboard-only, reduced motion;
   - before/after screenshots for every materially changed authenticated surface, saved to `docs/batch2-evidence/screenshots/` with an index in the report.
4. **Execute the binding 24-task matrix exactly as written in the request**, each task separately on desktop and mobile, recording expected result, actual result, evidence reference and status. No substitute matrix.
5. **Run all verification gates fresh**: TypeScript, full Vitest, Deno check/tests for changed shared modules and Edge Functions, ESLint over the complete changed-file list, production build, bundle purity scan, safe-claims scan across active source *and* database-managed content, CORS/boot smoke for changed functions, Prompt 3 inventory completeness, RLS probes as anonymous / Member A / Member B / admin, and export + deletion + retention execution tests for `coaching_interest` (actual runs, not manifest entries).
6. **Synthetic cleanup** with explicit IDs and before/after row counts.
7. **Regenerate `docs/BATCH-2-COMPLETION-REPORT.md`** containing: production project ref, starting and final SHAs, live bundle vs unpublished build bundle, complete file/migration/function list, performance evidence, the exact 24-task matrix, accessibility matrix, screenshot index, RLS principal matrix, inventory/export/deletion/retention evidence, synthetic cleanup, and every gate marked PASS / FAIL / BLOCKED / NOT TESTED, with code-changed vs migration-applied vs function-deployed vs client-unpublished stated separately.

Any in-scope FAIL or NOT TESTED is fixed and the focused plus full gates rerun before the report can conclude complete.

## Technical notes

- Starting SHA: `ba3e356`.
- Evidence scripts live under `/tmp/browser/batch2/`; only report artifacts and screenshots are written into the repo.
- Auth-state coverage for task 23 uses the five canonical Prompt 5 states (`allowed`, `grace`, `restricted_billing`, `restricted_deletion`, `suspended_dispute`) driven through synthetic subscription/deletion fixtures, cleaned up afterwards.
- Contrast is computed from rendered `getComputedStyle` colors composited against actual backgrounds; font sizes and target boxes come from `getBoundingClientRect`.
- No publication step at any point.
