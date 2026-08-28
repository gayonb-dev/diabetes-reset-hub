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

## Binding additions (cumulative)

**Freeze the authority first.** Resolve `ba3e356` to its full 40-char SHA; record branch, full working-tree status and every uncommitted file (all existing work preserved). Copy the 24 numbered tasks verbatim into `docs/batch2-evidence/task-matrix.json` — exactly 24 distinct IDs, no paraphrase or substitution — before any change. Record production ref `wqennhjdojjqmmqzjhti`, domain `https://diabetesresetmethod.com`, live client bundle and safety flags.

**Production mutation boundary.** Permitted: additive source-controlled migration (with rollback notes and before/after schema counts), redeploy of an Edge Function that materially changed (only after its focused tests and type checks pass), and labelled synthetic records removed by exact ID. Prohibited: publication, real member-data changes, any Stripe mutation, real email, external health-AI calls, secret/origin changes, retention-mode activation, destructive schema or historical deletion, fabricated testimonials/community/support/coaching demand. DB changes, function deployments and unpublished client changes are reported separately.

**Reproducible before/after.** Baseline built from the starting SHA in a separate temporary worktree/build dir — never resetting or overwriting the current tree, never deployed or wired to production mutation paths. Same synthetic fixture and viewports for baseline and corrected shots; baseline labelled "local build from starting SHA". No fabricated before shots — if a state cannot be reconstructed, the reason and alternative baseline evidence are stated.

**Route loading** covers Today, Meals, Progress, Workouts, Learn, Ask, Profile, Settings, Billing, Support and every changed Admin route, proving shell + nav + announced loading status stay visible, no unexplained blank region, no duplicate chunk requests across hover/focus/idle, safe cached content during revalidation, and that auth/billing/deletion decisions are always re-evaluated.

**Performance**: at least three comparable runs per measurement, median reported, with time to shell/heading/useful content, first vs return navigation, JS chunk and data-request counts, before/after values and conditions. A new duplicate request, shell disappearance or median regression is corrected or reported as an in-scope failure.

**Accessibility thresholds** proven from computed DOM: 4.5:1 normal text, 3:1 large text and meaningful graphics, no essential text under 14px, body ~16px, nav 15–16px, Fraunces only at ≥24px (or marketing), ~44px targets, one H1 and one main per page state, visible focus, dialog/sheet focus containment and restoration, no colour-only meaning, text alternatives for charts and tables, no overflow at 320/390/768/1280 or 200% zoom, reduced motion removes nonessential movement, and overlays never cover required actions.

**Functional detail** proven directly (not by task label): notification panel-open marks nothing read; opening one notification marks only it read and updates the count without reload; mark-all clears it; meal selections, selected day, shopping-list view and 3/3 plate state survive reload; ingredient correction preserves quantity-less names and never merges incompatible units; every active Learn Read/Open/Printable/Back/Return/Previous/Next control exercised interactively; Support success only after durable persistence with a real reference and truthful email state; no raw user agent collected or displayed; magic link enabled; restricted members keep Billing, Settings, Support, export and deletion; Daily Digest local-only with zero external AI; PHI audit limited to display/index/pagination with no new purge; Top Customers + its refresh path, WhatsApp scripts, Intake Forms and Challenge Progress absent from active Admin; no active member flow writes Challenge Progress.

**Principals**: anonymous, synthetic Member A, synthetic Member B and a genuine admin-role JWT; service role tested separately and never counted as the admin result. Target rows verified after each attempt, including cross-member denial, self-management, admin access and deletion restriction. Task 23 exercises all five states; no billing state may redirect an authenticated member to Login; deletion restriction keeps its precedence.

**Data lifecycle**: every new/altered table, column, function, storage surface and Admin operation reconciled to the Prompt 3 inventory; export and deletion executed against synthetic members with expected-vs-actual counts; retention run in report-only mode proving zero deletion; all processors mocked or disabled. `coaching_interest` proven to hold only identity linkage, consent/status and timestamps, with withdrawal, cross-member denial, admin access and cleanup.

**Named protected-system regressions** (each named and verified, not summarised): glucose safety in mg/dL and mmol/L, hydration without numeric target, habit/meal concurrency, workout completion and replay protection, ledger idempotency, retired-badge exclusion, deterministic public VITA with zero model calls, magic link and safe next, payment verification truth, billing lifecycle and restricted routes, chat consent and authorization, export/deletion/retention, and fasting/supplements/cheat-meal/personalized-health-AI/unsafe claims staying disabled. Safe-content scan spans active source, DB-managed content and the new production bundle, with documented dispositions for excluded historical files.

**Evidence privacy and cleanup**: synthetic labelled data only; no tokens, cookies, magic links, raw emails, health text, IPs, secrets or private identifiers captured. A run manifest lists every synthetic auth user, row and storage object; cleanup by exact ID with before/created/deleted/remaining counts, a post-cleanup re-query requiring zero residue, and temporary flags restored to recorded pre-run values with proof.

**Artifacts produced**: `docs/batch2-evidence/task-matrix.json`, `performance.json`, `accessibility.json`, `route-loading.json`, `rls-principal-matrix.md`, `data-lifecycle.json`, `synthetic-cleanup.json`, `screenshots/index.md`. Every evidence reference in the report resolves to one of these or an existing screenshot.

**SHA truthfulness**: full 40-char starting SHA; a final tested SHA only if that commit actually contains the tested code, otherwise the uncommitted state is stated plainly with current SHA, working-tree status and a reproducible tree/diff digest; plus live bundle, new unpublished build bundle and full changed-file/migration/function reconciliation.

**Completion rule**: any in-scope FAIL or NOT TESTED keeps Batch 2 incomplete; failures are fixed and both focused and affected full gates rerun. BLOCKED only for an independent platform limitation after all unaffected work is done. No ZIP, no publication, no landing-page conversion-design change, no PWA/service worker; authenticated screenshots needed for the separate landing-page preview correction are preserved. PWA, Day 181+, large badge catalogue, broad dependency upgrades and publication stay out of scope.

## Technical notes

- Starting revision: `ba3e356` (full SHA resolved and recorded at run start).
- Evidence scripts live under `/tmp/browser/batch2/`; only report artifacts and screenshots are written into the repo.
- Baseline build isolated under a temporary worktree; current tree untouched.
- Contrast computed from rendered `getComputedStyle` colors composited against actual backgrounds; font sizes and target boxes from `getBoundingClientRect`.
- No publication step at any point.

