# Landing and App Closeout — One Consolidated Correction

Single continuous correction pass on the unpublished working tree. No publication, no production deployment/migration, no real payments, emails or external AI. Project `wqennhjdojjqmmqzjhti` / diabetesresetmethod.com is verified first; work stops if it differs.

## Approach

Every item below starts with an inspection step: compare the delivered evidence against the current implementation and decide whether the fix is *stale evidence* (recapture only) or *implementation drift* (fix the code). Both categories are recorded separately in the report.

## 1. Landing structure

- Add a genuine Today preview in/immediately under the hero (eager-loaded, responsive, labelled).
- Rework the product tour into one "Inside your membership" section: one featured screen plus accessible tabs/thumbnails for the other categories, concise capability captions, checkout CTA with renewal pricing directly adjacent.
- Fold repetitive feature-card text into the tour; no new duplicate section, no seven stacked full screenshots.
- Keep Day 1 (what you can do) and First 14 days (how you explore) distinct; keep founder section, identity and all existing anchors.

## 2. Conversion controls

- Confirm every CTA (header, hero, pricing, final, sticky, tour) uses the shared `useCheckout` action; keep the approved $27/14 days then $67/month offer, existing fields and server-side verification.
- Verify pointer/keyboard, dismissal, duplicate-submit protection, honest retry.
- Anchor map: `#how-it-works`, `#inside-the-membership`, `#pricing`, `#faq` — each exactly once, hash update, heading focus, header offset, reduced motion, direct entry/reload/back-forward.
- Re-check shared header consumers outside Index (legal pages) so the provider fallback still navigates.

## 3. Screenshot coverage and labels

Recapture with the existing isolated fixtures (Auth/PostgREST/RPC/Edge Function interception incl. checkout; unexpected hosts blocked) so each area shows the promised capability: Today actions + logging, Meals with real recipe content and shopping list on "By meal", Progress glucose/A1C/weight/measurements/habits, Workouts with populated synthetic history, Learn Guides (not only Mindset), Ask/VITA and Community distinguished, printable health-visit report. Multiple views per category where one image cannot prove the feature.

Every preview (thumbnail and enlargement) carries the visible label "Example member view — illustrative data, not a member's results." Day-29 workout unlock disclosed wherever surrounding copy could imply earlier access; the rule itself is unchanged.

## 4. Gallery usability and delivery

Selected states, keyboard tabs/thumbnails, alt text and captions, no hover-only controls, accessible dialog name and visible close, Escape, focus trap and restoration, scroll lock, reduced motion, 44×44 targets. Responsive crops so phone text stays readable; explicit dimensions, optimized formats, eager above-the-fold image, lazy below-the-fold, full-resolution only on enlarge.

## 5. Water styling and evidence

Replace the solid blue badge with the standard habit-indicator geometry: same size, neutral interior, matching outer track/stroke as a visual frame only, centred water icon, live amount, brief saving/saved feedback with reduced-motion support. No target, no 64 oz, no formula, no percentage ring, no hidden denominator, no extra points.

Logging behaviour stays as implemented: whole-fl-oz storage, fl oz + approximate mL quick adds, dual-unit custom entry, quantity preserved across unit switches, single rounding at submission, disclosed saved amount, refusal when a positive amount rounds to zero, "Saved" only after persistence, honest revert/retry, agreement across control, Today summary and reload, once-daily server award.

New water evidence: mL visibly selected with 250 entered and disclosure shown, successful persistence and reloaded total, separate mL amount rounding to zero rejected with no log/award, failure/retry and award-protection assertions.

## 6. Mindset

Keep 20 seconds across label, countdown and completion gate; recapture only if typography/layout changes make the shot stale.

## 7. Meals typography

Read the computed styles in Shopping List and Off-Plan Meal and reuse those existing role-based styles across all Meals tabs (tab labels, body text, meal/recipe names, comparable headings, inputs, labels, buttons), including My Meal Plan and Snacks. Remove local overrides in the shared tab components that recreate the inconsistency. Heading/body hierarchy preserved; landing typography untouched. Check long names on 390/768/1280.

## 8. Library consolidation

Inspect `/app/library` content and inbound links, then move: recipes/meal tools → Meals, movement → Workouts or Guides, articles → Learn/Guides, questions → existing Ask/Support. Unique material is preserved under an existing section, never deleted. Remove the Library nav entry from `appNav`, add redirects for old deep links (resource-specific where possible), keep access controls and unlock rules, update internal links and previews, and record the old → new mapping in the report.

## 9. Coaching consolidation

Trace the Settings coaching-interest submission through its handler to its data source, keep whichever admin section reads that source (`/admin/coaching-interest` vs `/admin/waitlist` decided by the trace, not the name), remove the redundant menu entry and page, redirect the retired route, keep one label that does not imply coaching is available. Historical submissions stay accessible through the retained view; permissions unchanged. Verified with isolated synthetic data end to end, no email delivery.

## 10. Visibility and wording

- Determine whether faded first-14-days/audience/FAQ content and the pre-final-CTA gap are scroll-animation capture artefacts or runtime issues; fix real issues (content must settle readable under normal scroll, anchor jumps and reduced motion), otherwise recapture. Remove genuine excess spacing only.
- Align the pricing card refund sentence with the approved Refund Terms without strengthening the promise.
- Keep "Access begins after your payment is confirmed", honest states, renewal/cancellation wording, optional community framing, Day 1 actions matched to real entry points. No PWA/device-sync/app-store/personalized-AI/coaching claims.
- Investigate the glucose reference inconsistency (report band 70–130 vs "Elevated" 118/121 vs Progress ranges) across fixtures, labels and `src/lib/glucose.ts`; make presentation consistent or clearly separate the two reference concepts. No invented thresholds; if the intended policy cannot be established it is reported as unresolved.

## 11. Expectation parity

Update the matrix: exact wording | route/component or policy | availability | evidence | limitation | keep/clarify/remove. Feature claims cite genuine screenshots; payment/cancellation/access claims cite tested behaviour and policy. Negative disclaimers stay.

## 12. Verification

V01–V16 reported individually with their original requirements, plus V17 Meals typography, V18 Library consolidation, V19 coaching consolidation. PASS/FAIL/BLOCKED/NOT TESTED with direct evidence; screenshots always paired with the corresponding test assertion. One prepared fixture, reusable browser runs, focused regressions during correction, final gates after all code changes: TypeScript, lint on every touched file, full Vitest, production build, bundle leakage scan, fixture cleanup. Deno checks only if Edge Functions or shared modules actually change.

## 13. Report

Update `docs/LANDING-PRODUCT-PREVIEW-COMPLETION-REPORT.md` in place (one report, one evidence index — no ZIP, no duplicate report set) with the customer-facing summary, changed-file list, code identifiers, actual commands/totals/results, V01–V19 and parity results, screenshot index and preview URL, Library and coaching mappings, stale-evidence vs implementation fixes, any prepared-but-unapplied backend dependency, synthetic-data handling and cleanup, and explicit confirmation of no publication or production changes.

## Technical notes

- Touch points: `src/components/landing/*` (hero, tour, lightbox, manifest, pricing, sticky CTA), `src/pages/Index.tsx`, `src/lib/landingNav.ts`, `src/components/today/WaterEntry.tsx` and the habit-ring component, `src/lib/hydration.ts`/`units.ts` (extend only), `src/pages/app/Meals.tsx` and Meals tab components, `src/lib/appNav.ts`, `src/App.tsx` routes/redirects, `src/pages/admin/AdminLayout.tsx` plus the retired admin page, `tools/landing/*`, `public/previews/*`, `docs/evidence/landing-preview/*`.
- No schema change is planned; any discovered backend dependency is prepared and documented, not applied.
