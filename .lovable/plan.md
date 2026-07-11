## Visual finish pass — plan (with VITA-card guardrail)

Strictly in-brand: uses existing tokens (`src/index.css`, `tailwind.config.ts`). No external theme imports.

### 1. Numeric typography system
Add utilities to `src/index.css`:
- `.stat-value` → 28px (32px md+), 700, tabular, `leading-none`
- `.stat-label` → 11px caps, tertiary-fg (above the value)
- `.stat-unit` → 13px, muted-foreground, tabular, sits beside value
- `.ring-value` → 15px, 600, tabular (beneath each ring)
- `.metric-hero` → 32px, 700, tabular (Latest BS / Weight / A1C)
- `.countdown-hero` → 56px, 700, tabular (Fasting timer)

Apply:
- `QuickStats.tsx` — reorder to label-above / value / unit-beside.
- `HabitRing.tsx` — value/target line uses `.ring-value` at all sizes.
- `Fasting.tsx` — active countdown → `.countdown-hero`.
- `BloodSugarTab.tsx`, `WeightTab.tsx`, `A1CTab.tsx` — add a compact "Latest" hero card at top of each tab with the value rendered via `.metric-hero` (uses data already fetched).

### 2. Rings at hero scale
`Dashboard.tsx` — bump `HabitRing` `size` from 72/96 to **88 mobile / 112 md+**. Rings stay in Row 2 (directly after the greeting) — that position is already correct. `HabitRing.tsx` — extend stroke logic: `stroke = size >= 112 ? 10 : size >= 96 ? 8 : 6`; scale icon to `h-7 w-7` at ≥112. Framer-motion draw-on and bloom logic untouched.

### 3. One type + shape system
- Add `font-heading` to non-serif h1s: `Privacy.tsx`, `NotFound.tsx`, `WorkoutComplete.tsx`, `Onboarding.tsx` (three h1s), `AdminCommunity.tsx`. (`ProgressReport.tsx` intentionally stays sans — it is the print-for-doctor document.)
- Radius sweep: cards `rounded-xl` (12px), inputs `rounded-lg` (8px). Fix any `rounded-2xl` on standard cards (Dashboard today's-action card, Fasting cards using `Card`, mobile sheet).
- Shadow sweep: resting cards use `shadow-warm`; keep `shadow-elevated` for modals/popovers only.

### 4. Right-rail dead-space fix
- `AppLayout.tsx` main: `max-w-3xl xl:max-w-5xl` → `max-w-3xl lg:max-w-6xl xl:max-w-7xl`.
- `Dashboard.tsx` grid: `xl:grid xl:grid-cols-[minmax(0,1fr)_320px]` → `lg:grid lg:grid-cols-[minmax(0,1fr)_320px]`, and move the in-column VITA fallback from `xl:hidden` to `lg:hidden`, and the aside from `hidden xl:block` to `hidden lg:block`.
- Playwright screenshot Dashboard at 1280, 1440, 1680; iterate if any width still shows a dead third; attach the three PNGs.

### 5. Chrome quieting
- Sidebar active NavLink (`AppLayout.tsx` `navClass`): add `border-l-2 border-accent` on active, `border-l-2 border-transparent` on inactive, adjust `pl` to preserve alignment. Drop the full pill fill; keep a subtle `bg-white/5` on active.
- Trial banner (`AppLayout.tsx`): restyle to `bg-accent-muted border-b border-accent/30 text-foreground` with a live **days:hours** countdown to `trial_end_date`, and the "Manage" link becomes a `Button size="sm" variant="default"` (primary green).
- `GettingStartedChecklist.tsx` — flatten fully to global card: `bg-card border border-border rounded-xl shadow-warm`; retire the amber tinted background/border and amber "Getting Ready" heading (heading becomes `text-foreground`, count uses `text-tertiary-fg`).
- `VitaQuoteCard.tsx` — global card treatment (`bg-card border border-border rounded-xl shadow-warm`) **plus one subtle amber signature**: keep the amber `VITA SAYS` label caps in place. No amber border/edge — the label alone marks it as a VITA moment.

### 6. Final greps (reported verbatim in completion report)
- `rg "#[0-9a-fA-F]{3,6}" src --glob '!src/index.css' --glob '!src/integrations/**' --glob '!tailwind.config.ts'` — expected: Vita.tsx (mascot palette), BadgeGallery.tsx (bronze/silver/gold metals), ProgressReport.tsx (print chart colors, doctor doc).
- `rg "<h1[^>]*font-sans"` — expected: zero.
- `rg -n "\.dark\s*\{" src/index.css` and confirm the `.dark {}` block is byte-identical to current.

### Files expected to change
`src/index.css`, `src/components/dashboard/QuickStats.tsx`, `HabitRing.tsx`, `GettingStartedChecklist.tsx`, `VitaQuoteCard.tsx`, `src/pages/app/AppLayout.tsx`, `Dashboard.tsx`, `Fasting.tsx`, `src/components/progress/{BloodSugarTab,WeightTab,A1CTab}.tsx`, `src/pages/Privacy.tsx`, `src/pages/NotFound.tsx`, `src/pages/app/WorkoutComplete.tsx`, `src/pages/app/Onboarding.tsx`, `src/pages/admin/AdminCommunity.tsx`.

### Verification
- `tsgo` clean.
- Playwright screenshots Dashboard at 1280 / 1440 / 1680.
- Three grep outputs verbatim.
