## Scope

Sessions B and C in full, plus M21 (offline banner). **M20 swipe gestures are dropped** — post-launch.

### Standing corrections (override the attached spec)
- Rings 88px mobile / 112px desktop; ring values stay visible in tabular numerals.
- Content widths unchanged (`max-w-3xl lg:max-w-6xl xl:max-w-7xl` + 320px rail).
- Single shell breakpoint at `lg` (1024px); no new `md:` shell switches.
- Sidebar streak badge stays removed.
- Cheat Meal is the 4th tab inside `/app/meals`.
- Design tokens only — no raw hex outside `index.css`, `tailwind.config.ts`, `Vita.tsx`, badge metals.

---

## Session B — Core screens

**M4 Dashboard** — `Dashboard.tsx`, `QuickStats.tsx`, `JourneyTrack.tsx`, `GettingStartedChecklist.tsx`
Greeting stacks (name line, then streak • level pill). Rings single row, `flex-1` equal widths, 10px gap, 9px labels, values visible. Action card + journey track full width, 16px padding; journey dots `overflow-x-auto flex-nowrap` inside the card. Quick stats 2×2 (BS+Water, Weight+A1C), 8px gap. Rail contents fall into the main column below `lg` in order: VITA quote → streak card → Coming Up. Checklist collapsed by default on mobile.

**M5 Onboarding** — `Onboarding.tsx`
Inputs ≥52px; segmented controls with >3 options become a vertical radio list; multi-select chips wrap, 8px gap, 44px min height; CTA fixed bottom, 16px padding + safe-area inset.

**M6 Blood sugar log** — `BloodSugarTab.tsx`
56px/24px input; unit toggle above, right-aligned; reading-type selector horizontally scrollable; full-width reference bar; 80px notes; full-width 52px save fixed above safe-area inset.

**M7 Habit logging** — `HabitLogging.tsx`
52px section headers; snack slot picker becomes a searchable bottom sheet; Days 15–28 walk buttons stack vertically, 52px full width, `primary` logged / `primary-muted` pending.

**M9 Meals** — `Meals.tsx`, `SnackLibrary.tsx`
Horizontally scrollable week selector, 44px tabs; full-width day cards, 56px meal rows, swap always visible; single-column Snack Library and Shopping List; sticky category headers; 44×44 checkboxes; full-width 52px share; print/download becomes a floating icon button bottom-right above the bottom nav opening a sheet (Download PDF / Share).

---

## Session C — Per-section, to the numbers

**M8 Workouts** — `WorkoutLibrary.tsx`, `WorkoutSession.tsx`, `WorkoutComplete.tsx`
Single-column library; 52px full-width begin button; VITA 40px in-session; sets/reps at 24px; modification note always visible; rest timer becomes a full-screen takeover with 64px centered countdown; post-workout VITA `celebrating` at 120px with 48px checklist rows.

**M10 Settings** — `Settings.tsx`
Sticky section labels; 52×32 toggles; bottom-sheet time pickers; sign-out moved to the very bottom; delete-account confirmation unchanged from desktop.

**M11 Ask** — `Ask.tsx`
Tapping the VITA bar opens a full-screen compose view with autofocus; vote and answer counts remain visible; 44×44 reaction buttons; tag chips scroll horizontally above the keyboard.

**M12 Fasting** — `Fasting.tsx`
56px countdown; 60px full-width begin button; 44px end-fast link; compact horizontal eating-schedule timeline; last 7 fasts.

**M13 Profile** — `Profile.tsx`, `BadgeGallery.tsx` — 2×2 stats grid, 3-column badge gallery, last 3 community items.

**M14 Billing** — `Billing.tsx` — last 6 history entries on mobile.

**M15 Admin** — `AdminLayout.tsx` — non-blocking, dismissible "best viewed on desktop" banner on every `/admin` route below `lg`.

**M16 Support** — `Support.tsx` — 52px full-width CTAs.

**M17 Learn/Library** — `Learn.tsx`, `Library.tsx` — single-column cards, 44px targets per spec.

**M18 Cheat Meal** — `CheatMeal.tsx` (tab inside `/app/meals`) — 7 equal day columns, 44px min width, 56px height; 56px full-width log button.

**M19 item 6** — shared `ResponsiveSelect` (Select on desktop, bottom sheet on mobile); every member-facing dropdown converted and itemised in the report. Admin dropdowns untouched.
**M19 item 7** — native `<input type="date">` / `type="time"` on mobile.
Android back closes the More sheet / any bottom sheet instead of navigating (history-state hook).

---

## M21 Offline banner
`OfflineBanner` mounted in `AppLayout`, listens to `online`/`offline`, token-based colors, shows a brief "Back online" confirmation and clears 2s after reconnect.

---

## Technical notes
New files: `src/components/ui/responsive-select.tsx`, `src/components/ui/search-sheet.tsx`, `src/components/system/OfflineBanner.tsx`, `src/hooks/useBackButtonClose.ts`. Presentation-only — no schema, copy, or business-logic changes.

## Verification
- Playwright screenshots at **360px, 375px, and 390px** for every screen listed in B and C.
- Assert `scrollWidth <= clientWidth` on every route at all three widths.
- Assert **no interactive target under 44px** on every screen (measure all buttons/links/inputs/role=tab, report violations).
- Explicitly assert the **VITA quote card renders exactly once** at 360/375/390/1023/1024/1280/1536 — catching both duplication and disappearance around the old `xl:hidden` fallback now that the rail is at `lg`.
- Back-button check: More sheet and a bottom sheet each close without route change.
- **Per-section status table** (M4–M19, M21) with done / partial / not-done, plus the full file-change list.
