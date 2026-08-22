# Batch 1 — Corrected Closeout Report (POST-IMPLEMENTATION)

Generated from the current database and source. Nothing was published.

## 1. Publication and deployment status

- **No client publication occurred.** The live site was not rebuilt or released in this batch.
- **Production database content was updated** (VITA quotes, daily actions, content items).
- **Edge functions deployed:** `ask-vita`, `support-assistant`, `create-checkout-session`.
- Disabled features stay disabled: `FASTING_SCHEDULING_ENABLED = false`; no fasting
  questionnaire, timers, validation or notifications.
- Safety, privacy, billing, consent, deletion/export and RLS controls unchanged.

## 2. Hydration correction (appendix C10 / H1)

Every universal numeric hydration target is removed, including the previous fixed
`DEFAULT_WATER_TARGET_OZ = 64`.

- `src/lib/hydration.ts` — no target constant. Exposes `waterLoggedLabel()` (renders
  only "N oz logged today") and `waterAwardIdempotencyKey()`.
- `src/components/today/HabitLogging.tsx` — logging-only status, no `/ 64 oz`, no
  percentage, no target completion state.
- `src/pages/app/Dashboard.tsx` — water habit passes `target: null`.
- `src/components/dashboard/HabitRing.tsx` — `target: null` renders a log-only ring:
  no progress arc, no bloom, no completion percentage.
- Fluid-restriction guidance retained: members are told to follow any fluid restriction
  or guidance from their own care team.
- No hydration questionnaire added and no hydration target is requested or required.
  If a member later supplies a target from their own care plan, that is the only source
  a target could ever come from.

### Points

- No points are awarded for reaching an ounce threshold.
- A once-daily **logged water** award may fire after the member records water. It
  represents the act of logging, not achievement of a medical target.
- Idempotency is enforced in the database: `public.award_points(...)` returns
  `jsonb {inserted, total}` and inserts through
  `ON CONFLICT (user_id, idempotency_key) DO NOTHING`. Legacy XP/total updates only run
  when `inserted` is true. Execute is granted to `service_role` (and owner) only —
  `public`, `anon` and `authenticated` cannot call it. Verified: exactly one
  `award_points` function exists in `public`.

### Regression scan

`src/test/hydrationLogging.test.ts` fails the build on:

- fixed default hydration targets (`DEFAULT_WATER_TARGET`, `waterTarget = <n>`, `64 oz`
  target phrasing, `N oz / N oz` progress strings);
- body-weight hydration formulas ("half your body weight in ounces", `weight * 0.5 … oz`);
- target/percentage labelling on the water habit.

It also covers the once-daily award: first entry, refresh/reload replay, two rapid
concurrent entries, a later same-day entry, the member's local-midnight rollover, and
per-member key scoping. 10/10 passing.

## 3. Evidence artifacts

### BASELINE (preserved, byte-identical to the pre-implementation baseline)

| File | SHA-256 |
| --- | --- |
| `active-content-inventory-BASELINE.json` | `7a6989f651be9e61b01a4d7b5f35654d97f4d547636aeef8aed85b6dcc5baec6` |
| `active-content-inventory-BASELINE.csv` | `e42605fccfd5cfe5d4b78def2e9afe03fa8e2cd6b9a497e0dc5c756bd15eaa46` |
| `content-replacement-matrix-BASELINE.md` | `6d34e82dfda6f0d2a54f7c9ce540ae8f1f4f6cd6f3f4350127d3225cf008b57a` |
| `clinical-review-pack-BASELINE.md` | `2adae3569c285b418d9f035006248a2e40c4d10244af6eb080dc7caf0e667bb5` |
| `BATCH-1-COMPLETION-REPORT-BASELINE.md` | `418eca5c238755e7ea129a049e7a99e67ea5db58df66f3780087ef8346be85fd` |

These describe the pre-implementation state (93 clinician-review items, 129
external-review items, the retired VITA quotes still active). They are labelled
BASELINE and must not be read as current state.

### POST-IMPLEMENTATION (current state)

| File | SHA-256 |
| --- | --- |
| `active-content-inventory-POST.json` | `57c09bfe4fb27a8a024061b2c9101fcd6199a327d109bc2a1795a9f695050309` |
| `active-content-inventory-POST.csv` | `9851f4647f799671a05595f026580463c531b47a65ce3006ed8b1dfb04fbd73c` |
| `content-replacement-matrix-POST.md` | `20a3454bf5b127ff6c3fcdc023a228c0b5c1bb3dade70237af16f33efc4e9c47` |
| `content-evidence-pack-POST.md` | `654f261fd2658b072e47192c6e39921fefb80d4f81954743cea909eb98bc8910` |

The POST files were generated read-only from the live database and current source. They
carry no worksheet, no response column and no clinician sign-off gate, and they do not
claim that the 93 former classifier flags await clinician approval.

## 4. Reconciled totals (POST)

Identical across JSON, CSV, matrix and evidence pack:

- Inventory items: **1987** (active 1854, member-reachable 1841)
- CSV rows: **1987**; matrix rows: **220**; evidence-pack entries: **220**
- Dispositions: KEEP — APPROVED EDUCATION 1767 · REWRITE — OWNER APPROVAL 13 ·
  REWRITE — CLINICIAN REVIEW 36 · RETIRE — OBSOLETE FEATURE 7 ·
  RETIRE — OUTCOME/GAMIFICATION 6 · FIX INTERACTION — NONFUNCTIONAL 0 ·
  TEMPORARY FALLBACK APPLIED 12 · HISTORICAL — UNREACHABLE 146
- Generator gates: classifier fixtures PASS · coverage manifest PASS ·
  duplicate-day reconciliation PASS · no-personal-data PASS

### Database reconciliation (live query)

| Check | Value |
| --- | --- |
| `daily_actions` total | 187 |
| `daily_actions` active (guided days 1–180) | 180 |
| `daily_actions` historical (E1–E7, inactive) | 7 |
| `vita_quotes` active (replacements) | 24 |
| `vita_quotes` retired | 105 |
| `content_items` | 27 (all active) |
| Active banned-content hits | 0 |

## 5. Documentation corrections

- **Day 14 ID is `ec4ea88d-6773-43c5-8ef9-6248b02e963d`** (confirmed by live query on the
  active Day 14 record). Any earlier ID stated for Day 14 is superseded.
- No client publication occurred; production database content was updated and
  `ask-vita`, `support-assistant` and `create-checkout-session` were deployed.
- Doctor review remains a **lightweight review of the finished app**. There is no
  spreadsheet, worksheet or sign-off gate, and no clinical approval is claimed anywhere
  in these artifacts.

## 6. Verification results

| Gate | Result |
| --- | --- |
| Hydration tests (`src/test/hydrationLogging.test.ts`) | PASS — 10/10 |
| Expanded appendix content scan | PASS — 0 active banned-content hits |
| TypeScript (`tsgo --noEmit`) | PASS — 0 errors |
| Lint (touched files) | PASS — 0 errors, 0 warnings |
| Full Vitest suite | PASS — 35 files, 375 tests |
| Production build | PASS — `index` 426.81 kB (gzip 134.16 kB) |
| Bundle scan for hydration targets | PASS — no `64 oz`, `oz / 64`, `DEFAULT_WATER_TARGET` or water-target strings in `dist/` |
| `award_points` uniqueness/grants | PASS — one function, `service_role` only |

Nothing was published.
