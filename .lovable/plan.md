# Final Landing Visual Polish

Presentation-only correction. No backend work, no new features, no publication. All completed functionality (checkout, navigation, tour controls, approved copy, pricing, legal) stays exactly as it is.

## 1. Compact, product-led hero

- Remove the lifestyle photograph from the hero layout (`hero-diabetes-reset.jpg` stays in `src/assets`, simply unused by `HeroSection.tsx`).
- The genuine Today screenshot becomes the hero's single visual, shown as an honest top-anchored crop inside a bounded frame (fixed aspect ratio, `object-cover object-top`) so Today's Action and the logging shortcuts are visible without the full-length screen.
- Keep headline, description, primary checkout button and renewal terms prominent; drop `items-center` on the grid so the copy column no longer floats against a tall image, and tighten the section padding to remove the resulting empty space.
- Mobile order: headline → description → CTA → pricing/disclaimer → preview (grid order utilities).
- Keep the visible "Actual app screen · illustrative example entries" caption and the "See more screens" link to `#product-tour`.

## 2. Bounded tour stage

- Keep the featured-screen selector and all eight previews.
- Featured image sits in a responsive bounded stage: fixed height per breakpoint (roughly 420px mobile / 520px tablet / 640px desktop) with `object-cover object-top`, so page length no longer follows each screenshot's natural height and switching previews causes no layout jump.
- No distortion (aspect preserved by cover), no shrink-to-unreadable. A short "Showing the top of this screen — enlarge for the full page" note sits with the caption; the enlargement keeps the complete screenshot.
- Captions, selector list, enlarge button, tour CTA and renewal pricing stay adjacent and unchanged in wording.

## 3. Remove the duplicate feature block

- Fold the useful wording from the five `InsideMembershipSection` cards (Today, Meals, Progress, Ask, printable report) into the corresponding tour captions in `previewManifest.ts`, keeping every limitation and explanation currently stated.
- The section keeps its `id="inside-the-membership"` anchor and heading, but its body becomes the tour only — one coherent product-tour section, no text-card repetition.
- Day 1, first-14-days, audience, founder, pricing and FAQ sections are untouched.

## 4. Faded / clipped text check

- Inspect pricing terms, FAQ headings and answers, and the final CTA in the real browser after animations settle (`ScrollReveal` end state, reduced-motion path).
- If only the capture is affected, fix the capture (scroll-and-settle before screenshot), not the code.
- If text is genuinely faint or clipped, fix the responsible styling/animation — no screenshot-only overrides. Focus indicators and reduced-motion behaviour preserved.

## 5. Verification (proportionate)

- Browser pass at 1280×800 and 390×844: hero initial viewport and full page — headline/CTA/renewal pricing clear, previews and captions readable, no horizontal overflow, no sticky-CTA/VITA collision, selectors + enlargement + anchors working, thumbnails lazy and full-resolution loaded only on enlargement.
- Run affected tests, `tsgo` typecheck, lint on touched files, production build. Reuse existing valid evidence for unchanged functionality.
- Update `docs/LANDING-PRODUCT-PREVIEW-COMPLETION-REPORT.md` in place with the visual-polish section and fresh desktop/mobile screenshots into the existing evidence folder. No new report set.

## Technical notes

Files touched: `src/components/landing/HeroSection.tsx`, `ProductTourSection.tsx`, `InsideMembershipSection.tsx`, `previewManifest.ts` (captions only), possibly `ScrollReveal.tsx`/`FAQSection.tsx`/`PricingSection.tsx` only if the faded-text check proves a real styling bug, plus the existing report and evidence screenshots. No image files deleted, no manifest asset paths changed, nothing published.
