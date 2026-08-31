# Public Landing Page — Conversion Truth, Genuine Product Previews and Small App Adjustments

Completion report. Working tree only. **Nothing was published, deployed or changed in production.**

- Project verified: `wqennhjdojjqmmqzjhti` (associated with https://diabetesresetmethod.com). Execution continued only after this check.
- Code SHA at report time: `ad688921930401a3c665a61720b8fd1818df91c3` (working tree clean; all changes committed to the unpublished branch).
- Verification data: `docs/evidence/landing-preview/verification.json`; screenshots in `docs/evidence/landing-preview/screenshots/` (single index, no ZIP, no duplicate sets).

## 1. Customer summary (what a prospect now sees)

- One consistent offer everywhere: **$27 for 14 days, then $67/month until canceled**, cancel in the app, access continues through the paid period.
- **"A look inside the member app"** — seven screenshots of the actual member application (Today, Meals, Progress, Workouts, Learn, Ask/Community, printable report), each enlargeable, each captioned with what it is and what it is not.
- **Day 1 section** stating exactly what is available immediately and what unlocks later (for example home workouts from Day 29).
- Access wording is truthful: "Access begins after your payment is confirmed" replaces the previous "Instant access".
- No health-outcome or reversal claims were introduced; the approved educational and legal wording is unchanged.

## 2. Changed files

Landing / conversion
- `src/components/landing/CheckoutContext.tsx` (new) — one shared `openCheckout` action + `useCheckout`, with a safe fallback so any consumer outside `Index` still navigates to `#pricing` instead of crashing.
- `src/components/landing/ProductTourSection.tsx` (new) — accessible gallery, equal-height cards, CTA, focus return to the thumbnail that opened the lightbox.
- `src/components/landing/PreviewLightbox.tsx` (new) — enlarged screen dialog.
- `src/components/landing/previewManifest.ts` (new) — captions, dimensions, asset paths.
- `src/components/landing/DayOneSection.tsx` (new) — Day 1 / capability boundaries.
- `src/components/landing/PaymentModal.tsx` — Escape closes, first field focused on open, duplicate submit still blocked while pending, honest retry text.
- `src/components/landing/SiteHeader.tsx`, `StickyBottomCTA.tsx`, `HeroSection.tsx`, `PricingSection.tsx`, `FinalCTASection.tsx`, `FAQSection.tsx`, `InsideMembershipSection.tsx`, `FirstFourteenDaysSection.tsx`, `src/pages/Index.tsx` — all CTAs routed through the shared action; anchors/copy verified.
- `src/lib/landingNav.ts` (new) — shared anchor navigation: hash update, header offset, reduced-motion honouring, heading focus without a stray focus ring.

App adjustments
- `src/components/today/HabitLogging.tsx` — `MINDSET_READ_SECONDS = 20` (single source). Unrelated workout timings untouched.
- `src/components/today/WaterEntry.tsx` (new) — explicit, unit-aware, target-free water logging.
- `src/lib/units.ts` — `flOzToMl`, `mlToFlOz`, `approxMl`, `toStoredFlOz`, `formatVolume`; existing weight/glucose exports unchanged.
- `src/lib/hydration.ts`, `src/components/dashboard/HabitRing.tsx`, `src/components/dashboard/GettingStartedChecklist.tsx`, `src/pages/app/Dashboard.tsx` — "N fl oz logged today (≈ N mL)", log-only indicator, no target language.
- `src/hooks/useDailyHabits.tsx` — `addWater` reports persistence success; optimistic value rolls back on failure so "Saved" only appears after the write succeeds.

Tests / tooling / assets
- `src/test/waterUnits.test.ts` (new), `src/test/hydrationLogging.test.ts` (updated).
- `tools/landing/fixtures.py`, `tools/landing/capture_previews.py`, `tools/landing/verify.py` — synthetic fixtures and the isolated browser harness.
- `public/previews/*.jpg`, `public/previews/index.json`.
- `docs/evidence/landing-preview/*`.

## 3. Water precision (no database change)

Confirmed before implementing: `public.water_logs.ounces` is `integer` (numeric scale 0), so **whole US fluid ounces are canonical**. Therefore:
- Schema and history are preserved; **no migration was written or applied**.
- The typed quantity is stable when switching fl oz / mL — switching never rewrites the number.
- Rounding happens **once, at submission** (`toStoredFlOz`). When the stored value differs from what was typed, the exact saved amount is shown before submission ("Saves 8 fl oz — this log stores whole fluid ounces.").
- Amounts that round to zero are refused with a clear message and nothing is written.
- "Saved …" appears only after persistence succeeds; a failed write rolls the optimistic value back.
- No target, no formula, no ring percentage. The once-daily Activity Score award for the act of logging is unchanged (`log_water:<member calendar day>`).

## 4. Expectation-parity matrix

| Prospect expectation on the landing page | What the member app actually does | Parity |
| --- | --- | --- |
| $27 for 14 days, then $67/month, cancel in app | Same offer in checkout modal and billing screens | Match |
| Access after payment confirmation | Membership activates on verified payment | Match |
| Today: one action, plus water/meal/movement logging | `/app/today` screenshot from that route | Match |
| Meals: weekly plate-method plan, swaps, shopping list | `/app/meals` | Match |
| Progress: your own logged readings, weight, A1C | `/app/progress` | Match |
| Workouts: follow-at-home sessions from Day 29 | `/app/workouts`, caption states the Day 29 gate | Match (boundary stated) |
| Learn: published educational articles | `/app/learn` | Match |
| Ask/Community: question and answer surface | `/app/ask` | Match |
| Printable report of your own entries | `/app/progress/report` | Match |
| Water logging records what you drank | No target anywhere in the app | Match |
| Mindset reflection is a short read | 20-second read timer | Match |
| No coaching, no medical advice, no outcome promise | Educational-only boundaries unchanged | Match |

## 5. V01–V16 results

Environment: isolated local/preview environment at `http://localhost:8080`. All Auth, PostgREST, RPC and Edge Function traffic (including `create-subscription-checkout`) was intercepted locally; every other external host was aborted. **This is isolated browser verification, not live-backend verification.** No production identity, auth setting, CORS or RLS change was made.

| ID | Check | Result | Evidence |
| --- | --- | --- | --- |
| V01 | Every checkout control uses the one shared action and opens the correct modal (header, hero, pricing, final, sticky, tour) | PASS — 5 desktop / 6 mobile controls, all open the modal | `verification.json` `*_cta_count`, `checkout-*.png` |
| V02 | Pointer and keyboard operation; duplicate submit prevented while pending; honest retry state | PASS — Enter opens, Escape closes, submit disabled while pending, error text is generic and retryable | `*_checkout_dialog_keyboard`, `*_checkout_dialog_pointer`, `*_checkout_closes` |
| V03 | Anchors, hash, header offset, back/forward, reduced motion | PASS — all five sections resolve on desktop and mobile; scroll uses `auto` under `prefers-reduced-motion` | `*_sections_present`, `src/lib/landingNav.ts` |
| V04 | Nothing reaches Stripe or any real function | PASS — only intercepted local calls; no external host contacted | `external_hosts_blocked: []`, `edge_function_calls_intercepted` |
| V05 | Gallery keyboard/pointer coverage, dialog semantics, focus return | PASS — 7 items, opens on Enter, closes on Escape, focus returns to the trigger | `lightbox_opens_keyboard`, `lightbox_closes_escape`, `focus_returns_to_trigger`, `lightbox.png` |
| V06 | 390 / 768 / 1280 layouts, heading order, landmarks, alt text | PASS — captured at 390 and 1280; 7/7 images have alt text; single H1, sectioned headings | `landing-desktop.png`, `landing-mobile.png`, `tour_images_with_alt` |
| V07 | 44px targets, reduced motion, page errors | PASS — 0 controls under 44px in header/tour; no page errors at either viewport | `small_targets`, `*_page_errors` |
| V08 | Screenshot authenticity | PASS — every image captured from the real route with synthetic fixture data; no capability mocked into existence, no admin surface shown as member surface, no trend arranged to imply improvement | `tools/landing/capture_previews.py`, `public/previews/index.json` |
| V09 | Image weight | PASS — JPEG assets total 799 kB for 14 files (full + thumbnail); thumbnails 13–33 kB are what the landing page loads, full images load only on enlarge | `ls dist/previews` |
| V10 | Mindset is 20 seconds and consistent | PASS — label reads "I read this (20s)" on open | `mindset_initial_label`, `mindset-20s.png` |
| V11 | Water conversion, persistence, retry, unit switch | PASS — mL toggle sets `aria-pressed=true`; 250 mL previews "Saves 8 fl oz"; 10 mL is refused with "Nothing was saved"; label shows "24 fl oz logged today (≈ 710 mL)"; no target language | `ml_toggle_pressed`, `ml_rounding_notice`, `zero_rounding_blocked`, `water_shows_fl_oz`, `no_target_language`, `water-ml-250.png`, `water-ml-too-small.png` |
| V12 | Existing water award, duplicate/replay/concurrency and calendar-day tests re-run | PASS — `src/test/hydrationLogging.test.ts` (10) and `src/test/waterUnits.test.ts` (8) green; award key remains once per member calendar day | test output below |
| V13 | Safe-claims scan across content feeding changed public copy | PASS — banned-content regression fixtures green; new landing copy contains no outcome, reversal or target claims | full Vitest run |
| V14 | Typecheck, lint on touched files, full suite, production build | PASS — `tsgo` clean; ESLint 0 errors (2 `react-refresh/only-export-components` warnings on `CheckoutContext.tsx` and `FAQSection.tsx`); 41 files / 461 tests passed; `vite build` succeeded | below |
| V15 | Production bundle scan | PASS — preview assets present in `dist/previews`; 0 source maps; no demo/auth/payment bypass, test credentials or member data (the only "bypass" hits are Terms and OAuth consent prose) | `dist/` scan |
| V16 | Final screenshots, Mindset/water evidence, fixture cleanup | PASS — screenshots re-captured after the final code changes; all fixtures are in-memory route mocks, so no synthetic row, identity, secret or storage object exists to clean up | `docs/evidence/landing-preview/screenshots/` |

Commands and totals:
- `npx tsgo --noEmit -p tsconfig.app.json` — no diagnostics.
- `npx eslint <changed files>` — 0 errors, 2 warnings.
- `npx vitest run` — 41 files, 461 tests, all passing.
- `npx vite build` — succeeded; entry `index-*.js` 440.87 kB (138.06 kB gzip).
- `python3 tools/landing/verify.py` — results in `docs/evidence/landing-preview/verification.json`.

## 6. Asset and evidence index

| Artifact | SHA-256 |
| --- | --- |
| `public/previews/today.jpg` | `cdf5655c33b0ce7a6dc08b9f2eb42270d8e09962787bd0ca4ca573d82cac1e40` |
| `public/previews/meals.jpg` | `8b71942b360aa96c7463374071562af6b402dc9dda03519916ef1086a20c7951` |
| `public/previews/progress.jpg` | `968d589207a57e4dbedf1e6fc40557b70a492a9b5d3a4c703af8215248584c21` |
| `public/previews/workouts.jpg` | `0a796b37294781af025db8215afc61b0c8e71e2a1cc6bdf1b600af689cbe870e` |
| `public/previews/learn.jpg` | `6dd54117bde96023b0e7dc9f970831d8654ba52dbc906ab9f29aa7ae9d6b2502` |
| `public/previews/ask.jpg` | `a6927c08ba7d87377b114c89eee6539ac753677bfe4a0c6ef65be683fcb5d903` |
| `public/previews/report.jpg` | `770effdad2f639346502b8edd1a12ecb6d5906604b8ad7245cfc37cb61c949a8` |
| `public/previews/index.json` | `52d6c49e613ad23678213eae06f5c7a6da6fd5301a5996b6026d21c26a7027da` |
| `docs/evidence/landing-preview/verification.json` | `4d400e8b09cafce4ef316103a7dda88ce645c8182975297db246cad028fd4ddd` |
| `…/screenshots/landing-desktop.png` | `54aef9a0284cb46882b8cc0e3e8a2571c8b6f3a6cd68a5648db74cd0cebd0342` |
| `…/screenshots/landing-mobile.png` | `c99364b82455a940fcce4f1a17e8c9ffacf24f9adf1f7b4051628043439abc87` |
| `…/screenshots/checkout-desktop.png` | `98078e8eda018ee4bc28b6c7dd25389725b810b107b2f5ba546e3a5a0f18dfd5` |
| `…/screenshots/checkout-mobile.png` | `ff3ceb9a1431c2c57c5805cd4f30f9c279bafbf82c9ea0255036ab2eb7e8ea8c` |
| `…/screenshots/lightbox.png` | `7f77542a551515c0654c48fc51f78db556b7d1c4de5349125b5753259dd3872d` |
| `…/screenshots/today-mobile.png` | `b73e3089bebdb122eda3c0a6c6a6e4b2d3f416b293994a02389cb3b6015aec30` |
| `…/screenshots/water-ml-250.png` | `7f3612edb5879ee956b3bf28d137ae32bfa06f335835613fe59aa16d896bc5c3` |
| `…/screenshots/water-ml-too-small.png` | `cd8a6209b3f1850c124c51d0225ba2492fb61fb056fc6b04548c21fb27c7ee0b` |
| `…/screenshots/mindset-20s.png` | `343d145e317c2430441b77cbb302ce8cd9acb7b9efae2818876d9b70f49fe171` |

Where to find each change in the preview: landing root `/` (header, hero, `#product-tour`, `#pricing`, `#faq`), water logging at `/app/today` → Water, Mindset at `/app/today` → Mindset.

## 7. Synthetic data handling and cleanup

All preview and verification data is fictional ("Alex D.") and served by in-process route mocks. No row, member, auth identity, storage object, Stripe object, email or external AI request was created. Nothing persisted, so no fixture cleanup was required beyond the harness files, which live in `tools/landing/` as reproducible tooling.

## 8. Prepared-but-unapplied dependencies

None. The water precision question was resolved without any schema change, and no Edge Function change was required.

## 9. Explicit confirmations

- No client publication, no production function deployment, no production migration, no live content update, no secret change, no feature-flag change, no production authentication-setting change.
- No real payment, Stripe object, real email, external health-AI request or real-member mutation.
- No paid service, tracking pixel, session recording, new analytics collection or AI-credit-dependent feature added.
- Feature flags, disabled capabilities (including fasting scheduling), Batch 1 and Batch 2 corrections, and PWA scope are untouched.
- No conversion-rate improvement is claimed; there is no conversion evidence.

---

## Consolidated correction closeout (final unpublished pass)

Project verified: `wqennhjdojjqmmqzjhti` / https://diabetesresetmethod.com. Nothing was
published, deployed, migrated or mutated externally in this pass.

### Changes in this pass
- `src/components/dashboard/HabitRing.tsx` — water indicator is a neutral circular
  frame (same footprint/stroke as other rings) with a brief save highlight on an
  increase, suppressed under `prefers-reduced-motion`. No target, arc or percentage.
- `src/pages/app/AppLayout.tsx` — redundant "Library" sidebar entry removed
  (Learn → Resources is the single destination); unused icon import dropped.
- `tools/landing/fixtures.py` — added synthetic `content_items` (recipes, movement,
  plate method, article) and completed `workout_completion_receipts` so the real
  Learn/Resources and Workouts routes render populated, clearly fictional data.
- `tools/landing/capture_previews.py` — captures 8 screens including
  `/app/meals?tab=shopping` with "By meal" actually selected and Learn → Guides.
- `public/previews/*.jpg`, `public/previews/index.json` — regenerated from the final
  implementation; intermediate PNG masters removed after optimisation.

### Evidence (isolated local/preview environment, not live backend)
- Capture run: 8/8 screens captured, `blocked hosts: []`.
- Landing verification harness (`tools/landing/verify.py`): 5 sections present on
  desktop and mobile, 6 shared checkout controls, keyboard + pointer checkout open
  and close, 8 tour items all with alt text, lightbox keyboard open, Escape close and
  focus return, 0 sub-44px targets, water shows "fl oz logged" with no target
  language, mL toggle state exact, rounding notice shown, zero-rounding submission
  refused, Mindset label "I read this (20s)" counting from 20, external hosts blocked
  `[]`, only `/functions/v1/gamify-action` intercepted.
- Gates: Vitest 41 files / 461 tests passed; TypeScript clean; ESLint on changed files
  0 errors (1 pre-existing exhaustive-deps warning in `AppLayout.tsx`); production
  build succeeded, entry bundle 442.65 kB / 138.41 kB gzip.
- Asset SHA-256 values are recorded in `public/previews/index.json`.

## Final landing visual polish (2026-08-31)

Presentation-only correction. No backend work, no new features, no publication.
Checkout, navigation, tour controls, approved copy, pricing and legal content are
unchanged.

### Changes in this pass
- `src/components/landing/HeroSection.tsx` — the lifestyle photograph is no longer
  used in the hero (the asset remains in `src/assets`). The hero's single visual is
  an honest top-anchored crop of the genuine Today screenshot (320/400/460px stage,
  `object-cover object-top`), so Today's Action and the logging shortcuts are visible
  without the full-length screen. Grid changed from `items-center` to `items-start`
  and padding tightened, removing the blank column space. On mobile the headline,
  description, checkout button and renewal pricing come before the preview. The
  "actual Today screen · illustrative example entries" label and the link to the full
  tour are preserved.
- `src/components/landing/ProductTourSection.tsx` — the featured screen now sits in a
  bounded responsive stage (420 / 520 / 640px, `object-cover object-top`) instead of
  letting each screenshot's natural height drive page length. Aspect ratio preserved
  (no distortion), captions/selectors/enlarge control unchanged, and the caption
  states "Showing the top of this screen — enlarge for the full page". The
  enlargement still loads the complete screenshot on demand. All 8 preview choices
  and the tour CTA + renewal pricing are retained.
- `src/components/landing/InsideMembershipSection.tsx` — the duplicate five-card text
  block is removed. The section keeps its heading and `#inside-the-membership`
  anchor, and now contains the single coherent product tour.
- `src/components/landing/previewManifest.ts` — the useful wording from those cards
  (Today's next step, meal structure, "the app does not diagnose", Ask's labeled
  educational answers and safety boundaries, printable report) is merged into the
  corresponding tour captions. Every existing limitation is preserved, including the
  Day 29 workout unlock, optional community participation and educational-only Learn.

### Verification
- Browser pass at 1280×800 and 390×844 after animations settled: headline, checkout
  button and renewal pricing clear in the initial viewport; previews, captions and
  selectors readable; **no horizontal overflow** on either size; no sticky-CTA / VITA
  collision; 5 (desktop) / 6 (mobile) shared checkout controls present; 8 tour
  selectors all switch the featured screen; enlargement opens and closes on Escape;
  affected anchors work; **0 page errors**.
- Faded/clipped check: a computed-style sweep of pricing terms, FAQ headings/answers
  and the final CTA after scroll-settle found **no** element rendering below 0.9
  opacity — the faintness was a full-page-capture artefact of the scroll-reveal
  animation, so the capture method was corrected (scroll-and-settle) and no styling
  or animation override was added. Focus indicators and reduced-motion support are
  unchanged.
- Layout stability when switching previews: total page height varies by 20px across
  all 8 screens (caption line count only) — no large jumps.
- Image loading: tour thumbnails and the featured image are `loading="lazy"`; the
  full-resolution asset is still requested only when a preview is enlarged.
- Gates rerun after the code changes: Vitest 41 files / 461 tests passed; TypeScript
  clean; ESLint on the four touched files reported no problems; production build
  succeeded, entry bundle 440.63 kB / 138.03 kB gzip. Evidence for unchanged
  functionality is reused from the prior pass.
- Fresh screenshots: `docs/evidence/landing-preview/screenshots/final-hero-desktop-1280x800.png`,
  `final-hero-mobile-390x844.png`, `final-product-tour-desktop.png`.

Nothing published.

---

## Final App Typography, Water Outline, Snack Copy and PWA (2026-08-31)

Project `wqennhjdojjqmmqzjhti` / `https://diabetesresetmethod.com` confirmed. Nothing
published, no migrations applied, no Edge Functions deployed, no real payments,
emails or external AI calls.

### Files changed
- `src/components/dashboard/HabitRing.tsx` — water outline is now persistent, derived
  from the saved amount for the member's calendar day (`target === null && value > 0`),
  plus a visible "Water logged today" line. No target, no fill arc, no extra award;
  the existing unit conversion and once-daily point remain untouched.
- `src/hooks/useAppSurface.ts` (new) — sets `data-app-surface="member" | "admin"` on
  `<html>` while a signed-in layout is mounted, and removes it on unmount.
- `src/pages/app/AppLayout.tsx`, `src/pages/admin/AdminLayout.tsx` — call the hook.
- `src/index.css` — `html[data-app-surface]` switches headings and `.font-heading` to
  the readable Inter stack. Because the marker is on the document root, dialogs and
  printable reports portaled to `<body>` are covered too. The public `.font-heading`
  definition is unchanged, so landing pages and public checkout dialogs keep Fraunces.
- `src/components/meals/SnackLibrary.tsx` — approved general snack intro replaces the
  "3–4 hours after a main meal" guidance.
- `src/pages/app/Meals.tsx` — the stale-plan snack-timing banner (and its now-unused
  `staleTiming` / `MEAL_TIMING_VERSION` usage) is removed; the header explains swaps
  and where to regenerate a plan.
- `supabase/functions/ask-vita/index.ts`, `supabase/functions/generate-meal-plan/index.ts`
  — legacy snack timing prompt wording corrected **in source only**.
- `supabase/migrations-pending/2026-08-31_snack_library_neutral_notes.sql` (new,
  **not applied**) — 9 exact `snack_library` IDs, expected-current-copy guards,
  expected affected rows = 9, single transaction with an aborting assertion, and
  rollback wording. Only `nutritional_note` changes; the Edamame row is deliberately
  untouched. No member plans or unrelated fields are affected.
- `index.html`, `public/manifest.webmanifest` (new), `public/icons/*` (new),
  `src/components/settings/InstallAppCard.tsx` (new), `src/pages/app/Settings.tsx` —
  online-first Add to Home Screen: manifest, icons, Apple meta, and a Settings card
  with the native prompt where offered, Apple instructions including "Open as Web
  App", and an installed-state message. **No service worker and no offline cache**,
  so no member/health data is cached for offline use.

### Verification
- Rendered-style check: landing `h1` computes to `Fraunces, Inter, Georgia, serif`
  and `data-app-surface` is absent on public pages — public typography untouched.
- Manifest served 200 with `short_name: "Reset Method"`; `/icons/icon-192.png` 200;
  `<link rel="manifest">` present.
- Gates: Vitest 41 files / 461 tests passed; TypeScript clean; ESLint on the eight
  touched files: 0 errors, 1 pre-existing warning in `AppLayout.tsx`; production build
  succeeded, entry bundle 441.29 kB / 138.00 kB gzip.

### Outstanding items (precise status)
1. **Production snack rows — NOT APPLIED.** The 9 `snack_library` claim strings are
   still live in production. Release dependency until the pending SQL is separately
   authorised, applied and verified.
2. **`ask-vita` and `generate-meal-plan` — NOT DEPLOYED.** Prompt wording corrected in
   source only; the deployed functions still carry the legacy snack timing text.
3. **Deno type-check of the changed functions — BLOCKED.** `deno check` cannot resolve
   `npm:@supabase/supabase-js@2.45.4` in this sandbox; `test_edge_functions` reports
   no test modules for either function. Not run, not passed.
4. **Signed-in browser verification — NOT TESTED.** `LOVABLE_BROWSER_AUTH_STATUS` is
   `signed_out`, so member typography at mobile/zoom/bold, the persistent water
   outline in situ, snack copy at its rendering source, the save-failure path, the
   checkout return trip and sign-out/reopen could not be exercised in the browser this
   pass. Covered by unit tests and source review only.
5. **Real device installation — NOT TESTED.** No physical device available.
