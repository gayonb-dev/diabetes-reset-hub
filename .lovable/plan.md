# Pre-Launch Punch List — DRM Member Portal

Ranked by how much each item hurts the impression of a finished, premium product. Nothing is being changed — this is a review only.

---

## Tier 1 — Broken on screen (fix before anyone sees it)

### 1. `Ask.tsx` is rendering with an undefined token — huge dead zone
`src/pages/app/Ask.tsx` uses `bg-brand-primary`, `text-brand-primary`, `border-brand-primary`, `bg-brand-primary-muted` in 10+ places (lines 291, 292, 297, 315, 344, 434, 547, 560, 577, 584). None of those classes exist in `tailwind.config.ts` (only `primary` / `primary-muted` do). Result: pinned answer callouts, category chips, active tab underline, unread counts, admin-response highlight, and topic pills all render with **no background and near-invisible text**. This is the same bug we already fixed in `Support.tsx` — it was never swept in Ask. This is the single worst first impression in the whole portal.

### 2. Streak-fire glyph is stuck orange on any background
`StreakBadge.tsx` hardcodes `#FF6A1F`, `#FF4500`, `#FF8C00`, `#22C55E`, `#E8F5F1` (lines 32, 39, 40, 50, 52). `StreakHistoryModal.tsx` does the same at lines 60, 74, 75. In the dark sidebar these greens against dark cards read as neon stickers, and in dark mode they'll be worse. Should be `hsl(var(--streak-fire-start/end))` and `text-status-normal` / `bg-primary-muted`.

### 3. Dead math + wrong glyphs already flagged are only partly resolved
Confirmed cleaned in prior turn — but the same class of bug now needs a project-wide sweep, not point fixes (see #1 and #6). Treat "confirmed fixed" as unverified until a grep passes cleanly.

---

## Tier 2 — Premium feel is undermined

### 4. Hardcoded hex colors across the "money" surfaces
Every screen a paying member spends real time on has raw hex, which (a) breaks dark mode instantly and (b) reads as amateur inconsistency between charts and cards. Full list:
- `Billing.tsx` — 9 hexes for status pills (`#F59E0B`, `#22C55E`, `#EF4444`) instead of `--status-*`.
- `Fasting.tsx` lines 189, 208, 209, 264 — the hero countdown color is a raw green.
- `MealSetupTransition.tsx` lines 188, 225, 230, 246, 275–277, 309, 325 — the entire "generating meal plan" full-screen state is inline-styled with `#085041`, `#E8A029`, `#FFFFFF`, `rgba(255,255,255,…)`. Zero token usage on the screen the user stares at for 60+ seconds.
- `CheatMeal.tsx` line 236 — `#22C55E`.
- `Profile.tsx` line 137 — `#7C5CBF` (purple that appears nowhere in the palette).
- `BadgeGallery.tsx` lines 22–24 — bronze/silver/gold hardcoded (this one is defensible but should still be tokens).
- `progress/A1CTab.tsx` lines 23–25, 119–121; `WeightTab.tsx` line 230; `BloodSugarTab.tsx` lines 53, 267–273, 332–333; `HabitsTab.tsx` lines 18–21, 109, 111–112, 123–126, 159; `MeasurementsTab.tsx` line 147; `LevelUpOverlay.tsx` lines 37, 107.
- `App.css` lines 15, 18, 41 — stray Vite template colors still present.

### 5. Typography is a single generic sans across everything
`--font-heading` and `--font-body` both resolve to Inter. No display font, no serif accent, no tabular numerals on the numeric surfaces (blood-sugar reading, fasting countdown, weight, A1C, streak). The result is that a $67/mo product looks visually identical to any weekend Tailwind template. The tokens exist (`font-heading`) — they just point at the same family.

### 6. Sidebar branding vs card branding is inconsistent
`AppLayout.tsx` uses raw `text-white/60`, `bg-white/8`, `bg-white/15` for the sidebar (lines 31–32, 126–127, 138–144, 194, 202) instead of `sidebar-foreground`. `Profile.tsx` (lines 116, 120, 122, 126) does the same for the profile hero. `Ask.tsx` line 274 uses `text-white` on an accent circle. Nothing wrong visually today, but it will drift the moment sidebar hue changes and will silently break dark mode.

### 7. Loading is all spinners, no skeletons anywhere
Every async surface uses `<Loader2 className="animate-spin" />` centered on empty space: `AuthGuard`, `Fasting`, `Meals`, `Dashboard` (via streak), `Settings`, `Onboarding`, `AdminWaitlist`, `IntakeForm`, `Login`, `PaymentModal`, `EmailPopup`. A `<Skeleton>` primitive already exists at `src/components/ui/skeleton.tsx` and is used **only** by shadcn's sidebar. Premium apps ghost the shape of the content coming in — the streak badge in `AppLayout` is currently the only place that does this.

### 8. Empty states are text-only across 16 surfaces
"No entries yet." / "No fasts logged yet." / "No community questions yet." / "No cheat meals logged yet." / "No wins shared yet." / "No charges yet." / "No notifications yet." / "No articles curated yet." / "No A1C results logged yet." / "No measurements logged yet." — no icon, no VITA, no CTA, no illustration. This is where a premium product either wins delight or loses it, and the mascot (`Vita` with 4 postures) is already built for exactly this purpose. Currently used nowhere in an empty state.

### 9. `MealSetupTransition.tsx` is the longest-dwelt screen and it's placeholder-tier
Full-screen dark green background, four white circles with amber checkmarks as the "week 1/2/3/4" progress, and an inline-styled amber "Cancel" button. No animation on the progress bar beyond width, no motion on the check-ins, no explanation of what's happening beyond one line of copy, no way to background it. The user is asked to look at this for up to a full minute while the meal plan generates.

---

## Tier 3 — Confusing navigation & content gaps

### 10. Mobile bottom nav omits four primary sections
Desktop sidebar exposes 12 destinations. Mobile bottom nav (`AppLayout.tsx` line 210) shows only Today / Progress / Learn / Ask / Settings. Supplements, Workouts, Meals, Fasting, Cheat Meal, Profile, Support are **only reachable by opening Settings and navigating out** — and Settings has no sub-menu of these routes. On mobile the Meals tab (which the user just complained about) is technically unreachable from the bottom bar. This is the biggest silent nav dead-end in the product.

### 11. "Coming soon" copy shipped in a live product
- `PricingSection.tsx` line 16: "Priority access to 1-on-1 coaching (coming soon)".
- `CoachingWaitlist.tsx` line 78: "Coming soon — limited spots…"
Combined with the memory rule "never use coaching in marketing/SEO copy," both strings arguably shouldn't render as written.

### 12. Admin surface uses the same shell as the member app
`AdminLayout.tsx` has 10 tabs in a horizontally-scrolling row with no active state emphasis beyond a solid green pill. No breadcrumb, no page title inside `<Outlet>` pages, no filter persistence. Not fatal but reads as an internal tool bolted on, which subtly leaks through when you tab from `/admin` back to `/app` and the visual language is identical.

### 13. No 404 recovery from `/app/*`
`NotFound.tsx` exists but any typo inside the authenticated area drops to a bare route. There is no in-app "back to Today" affordance from unknown app routes.

### 14. `bg-brand-primary-muted` sweep is needed
Same category as #1 — grep across `src/` after fixing Ask should return zero hits.

---

## Tier 4 — Mobile responsiveness

### 15. Progress charts are hand-rolled SVG with fixed viewbox
`BloodSugarTab`, `WeightTab`, `A1CTab`, `MeasurementsTab`, `HabitsTab` all draw their own SVGs with hex-coded stroke colors. No responsive width binding, no tooltips, no axis labels, no hover states. On a 360-wide phone the graphs either overflow or squash depending on which tab. `recharts` is already used by shadcn `chart.tsx` and unused elsewhere.

### 16. `IntakeForm.tsx` is a 500-line single scroll on mobile
Fixed-width `Input`s in a single column with no step indicator, no per-section save, no progress %. On a phone it reads as one long survey with the submit button below the fold by ~10 screens.

### 17. Modals bypass shadcn `<Dialog>` and re-implement backdrops
`AdminDashboard.tsx` (194), `PaymentModal.tsx` (112), `EmailPopup.tsx` (81), `Learn.tsx` (286), `PaymentResult.tsx` (13, 124), `SupplementPrompt.tsx` (60), `AdminContent.tsx` (312, 618), `AdminBroadcasts.tsx` (106) — all hand-roll `fixed inset-0 bg-black/50 backdrop-blur-sm`. No focus trap, no ESC handling, no scroll lock on iOS, no `Dialog` a11y. On mobile Safari the background scrolls behind the modal.

### 18. Sticky mobile CTA on the landing page hides the last section
`StickyBottomCTA.tsx` has no bottom padding compensation on the sections it overlays. The FAQ's last row is covered on iPhone SE viewport.

---

## Tier 5 — Placeholder / template residue

### 19. `App.css` still contains the Vite React starter
Lines 15, 18, 41 keep the `#646cffaa` React/Vite logo drop-shadows and `#888` `.read-the-docs` text. Nothing references them, but they're shipped.

### 20. `BookSession.tsx` line 49 — literal comment says "Calendly/Cal.com embed placeholder"
The page is live-linked from onboarding.

### 21. `favicon`, social preview, `robots.txt`, `sitemap.xml`
Not inspected in detail but worth verifying before launch that all four are branded to DRM and not defaults.

---

## Things you're doing well (keep)

- Semantic HSL token system in `src/index.css` — the foundation is correct; the failures above are because components ignore it, not because it's missing.
- `Vita` mascot is genuinely differentiating and is one of the few things that will not look like every other AI-built app.
- Gamification (`useGamificationProfile`, level names, streak) is a real premium hook competitors won't have.
- Onboarding gate in `AppLayout.tsx` is doing the right thing — new users can't reach a half-empty dashboard.
- `min-h-dvh` sweep already applied — that's the correct call for iOS Safari.
- Tokenized `--status-*`, `--ring-*`, `--streak-fire-*` already exist and just need to be used.

---

## Not asked for, but you should know

- **Focus/keyboard states**: No visible `:focus-visible` styling was found beyond browser defaults. For accessibility and premium polish, every interactive surface needs a token'd focus ring.
- **`framer-motion` is installed and unused in the portal.** One well-timed entrance on Today (rings blooming) would do more for perceived quality than any color change.
- **Dark mode is technically unshipped** (per prior turn) — the tokens are half-there, but no `ThemeProvider` and no toggle. Currently every dark-mode hex above is dead code. Decide explicitly whether to ship or descope.
- **Recharts** is imported by `components/ui/chart.tsx` but no page uses it — the hand-rolled SVGs are duplicative work.
- **No global command palette** — `components/ui/command.tsx` is present but unmounted. Cmd-K is table stakes for members who'll use this daily.

---

## Suggested order of operations (when you're ready to implement)

1. Ask.tsx `brand-primary` sweep (Tier 1 #1) — 10 minutes, single file.
2. Hardcoded hex sweep in `Billing`, `Fasting`, `MealSetupTransition`, progress tabs (Tier 2 #4).
3. Mobile bottom-nav restructure or overflow menu (Tier 3 #10).
4. `<Skeleton>` + `<EmptyState>` primitives applied everywhere (Tier 2 #7–8).
5. `MealSetupTransition` redesign (Tier 2 #9).
6. Typography — introduce a display face and tabular numerals (Tier 2 #5).
7. Recharts migration for progress (Tier 4 #15).
8. Modal consolidation to shadcn `<Dialog>` (Tier 4 #17).
9. Everything else.
