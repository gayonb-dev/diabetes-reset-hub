# Final App Typography, Water Outline, Snack Copy, Landing Check and PWA

One continuous implementation on the unpublished client. No publication, no production migrations, no backend deploys, no member-data mutation.

## 1. Water: persistent "logged today" outline

- `HabitRing` water variant keeps the neutral centre, dimensions and layout; the outer circle stroke turns brand blue when the current member-calendar-day has a persisted positive water amount, and stays neutral otherwise.
- The blue state is derived from saved daily data (the existing daily-habits day record using the member-timezone calendar-day logic), not from transient UI state, so it survives navigation, reload, resume and day rollover.
- Failed saves never turn the outline blue; a later failed save never clears a valid blue state from an earlier successful entry.
- Accessible name and visible text state "Water logged today" alongside the amount, so colour is not the only signal. Reduced motion honoured; no fill, percentage, checkmark, target or extra award.

## 2. Readable typography across the signed-in app and Admin

- Reference: the readable sans styling already used in Meals → Shopping List / Off-Plan Meal (the Inter stack). The decorative `font-heading` (Fraunces) stack is the source of the serif titles.
- Introduce a functional-app heading treatment that resolves to the readable sans family, and apply it at the shared layer first: app layout, cards, dialogs, tables, tabs, buttons, forms, notifications and report components.
- Then remove page-level `font-heading` overrides across Today, all Meals tabs (including Snacks), Progress and printable report, Ask/Community, Learn and guide details, Workouts, Profile, Billing, Settings, Support, onboarding and every Admin page.
- Hierarchy preserved by size/weight/spacing; no blanket global override that would affect icons, controls or print. Public landing typography and brand artwork unchanged.
- Record the exact resolved family/weights and any intentional exceptions in the report.

## 3. Snack copy provenance and conformance

- Provenance established: the claim strings ("near-zero glucose impact", "cinnamon supports glucose control", "prevents spikes") live in stored `snack_library` rows seeded by an old migration; the fixed timing sentence is hard-coded in `src/components/meals/SnackLibrary.tsx` and repeated in Edge Function prompts.
- Client-side fixes now: replace the hard-coded intro with the approved sentence — "Snacks are optional. If a snack fits your care plan, choose a time and food that work with your hunger, medicines, activity and daily schedule." — and remove the obsolete snack-timing banner nudge that tells members to regenerate a plan.
- Stored rows are production content: prepare the exact neutral replacement wording as a reviewed, unapplied SQL file plus the affected record identifiers, and document it as a BLOCKED production dependency under section 0. Food descriptions, ingredients and quantities retained; no new medical claims.
- Edge Function prompt wording corrected in source only, not deployed.

## 4. Landing check before any landing code change

- Verify by ordinary scrolling with animations settled, plus reduced-motion, at 1280×800 and 390×844: one coherent tour section with all eight previews, both `#inside-the-membership` and `#product-tour` unique IDs resolving into it, and FAQ/pricing/founder/final CTA legibility.
- If the duplication and faded text are capture artefacts, replace the captures only (scroll and settle before shooting). If normal browsing reproduces a defect, fix only its actual cause. No screenshot-only CSS.
- After the typography change, re-capture the eight product previews from the real app routes using the existing isolated synthetic fixture harness, and regenerate the optimized assets and preview index.

## 5. PWA / Add to Home Screen (online-first, manifest-led)

- No manifest exists today (only an `apple-touch-icon` link). Add `public/manifest.webmanifest` with stable id, app name/short name, `/app` start URL, appropriate scope, `standalone` display and existing brand colours; add head links (manifest, theme-color, apple-touch-icon).
- Generate 192px, 512px and padded maskable icons plus an Apple touch icon from existing brand artwork. No account identifiers or tokens in any URL or metadata.
- Settings gains a clearly labelled "Add to Home Screen" control: fires the native prompt only when `beforeinstallprompt` is available and the member invokes it; otherwise shows accurate manual instructions including Safari Share → Add to Home Screen. Dismissal, unsupported browsers and standalone mode all handled without dead buttons or false success. Absence of the install event is not treated as "already installed".
- Manifest-only: no service worker, no caching framework, no offline queue, no push or background sync. Nothing about auth, redirects, billing/deletion restrictions or sign-out changes; installed sessions are not assumed shared. A short note explains that member features need internet and re-sign-in may be required.
- Check standalone safe-area spacing, bottom navigation, keyboard/input behaviour and scrolling.

## 6. Verification and evidence

- Behaviour checks: water (empty day, persisted, reload/navigation, failed save, next calendar day, reduced motion); typography route/override inventory with shared-component checks and page-specific exceptions; snack rendering source and copy conformance; landing tour/anchors/legibility/current previews; PWA manifest validity, supported and unsupported install paths, dismissal, standalone layout, access checks and sign-out.
- Final gates once on final code: focused regressions, full unit suite, TypeScript, lint on touched files, production build, and a bundle scan for private data, harness code or secrets (synthetic preview images are intentional).
- Real phone installation is not performed here; Android/iPhone install and production-origin checks are recorded as NOT TESTED / BLOCKED for the controlled-release checklist.

## 7. Reporting

Update `docs/LANDING-PRODUCT-PREVIEW-COMPLETION-REPORT.md` in place with one clearly identified section for this work: changed files and final revision, typography reference and exceptions, snack-copy provenance and disposition (including the unapplied content correction), landing artefact-vs-defect conclusion, water and PWA results, device/browser coverage, per-item PASS/FAIL/BLOCKED/NOT TESTED, and confirmation that nothing was published and production was unchanged. No new report set.

## Technical notes

- Files expected to change: `src/components/dashboard/HabitRing.tsx` and its Dashboard/Today callers; `src/index.css` and `tailwind.config.ts` typography layer; broad `font-heading` removals across `src/pages/app/*`, `src/pages/admin/*` and shared app components; `src/components/meals/SnackLibrary.tsx`; `src/pages/app/Settings.tsx` plus a new install-prompt hook/component; `index.html`; new `public/manifest.webmanifest` and icon assets; regenerated `public/previews/*` and `index.json`; the completion report. A prepared, unapplied SQL file for `snack_library` wording.
- Project confirmed as `wqennhjdojjqmmqzjhti` / https://diabetesresetmethod.com before any work begins.
