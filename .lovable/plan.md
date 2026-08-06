# S1 — Blood-glucose safety

Implements only section S1 of the remediation matrix. No other section, no redesign, no publish.

Note: PROJECT_CORNERSTONE.md was not among the uploaded files. I will work from the audit and the remediation matrix, and preserve the existing brand, VITA, cards, and navigation as-is.

## What changes for the member

A single shared threshold table drives every glucose state, in both mg/dL and mmol/L:

```text
< 54 mg/dL  (< 3.0)      urgent low     red, alert card, emergency escalation copy
54–69       (3.0–3.8)    low            red/warning, low safety card
70–99       (3.9–5.4)    in range       normal (fasting; per-type upper bounds kept)
100–125     (5.5–6.9)    elevated       warning (existing behaviour)
126–249     (7.0–13.8)   high           danger (existing behaviour)
>= 250      (>= 13.9)    urgent high    red, alert card, escalation copy
```

Thresholds are presented in the app as general references, clearly labelled as not medical advice and pending clinician review.

Behaviour:

- A low reading is never green and never labelled "Normal". The reference bar gains a low band at its left edge, so the low zone is visually distinct from the in-range zone.
- Entering a low or urgent value replaces the generic range presentation with an urgent safety card carrying the matrix copy verbatim: "This reading is low. Follow your healthcare professional's low-blood-sugar plan now. If you feel confused, faint, unable to treat yourself, or symptoms are severe, contact emergency services."
- Urgent high gets its own separately worded escalation card with no diagnosis and no dosing instructions.
- The safety card is announced to screen readers (`role="alert"`, `aria-live="assertive"`), uses an icon plus a text label (never colour alone), and is keyboard reachable.
- Future timestamps are blocked: the datetime field is capped at now, and a future value shows an inline correction message and disables Save.
- Implausible values (outside 20–600 mg/dL) now ask the member to correct the entry rather than being saveable via a second tap. Nothing is written to the database until the entry is valid.
- The latest-reading card and history dots use the same classification, so a saved low reading also renders as low everywhere on the Progress tab.

## Technical detail

New file `src/lib/glucose.ts`:
- `GLUCOSE_THRESHOLDS` table (canonical mg/dL, with mmol/L display helpers reusing `src/lib/units.ts`).
- `classifyGlucose(mgdl, readingType)` returning `urgent_low | low | in_range | elevated | high | urgent_high`.
- `isPlausible(mgdl)`, `isFutureTimestamp(iso)`, and copy constants for the safety cards.

Changed `src/components/progress/BloodSugarTab.tsx`:
- `toneFor`/`RANGES` replaced by the shared classifier; tone colours mapped to existing `--status-*` tokens plus the existing destructive token for urgent states.
- New `GlucoseSafetyCard` subcomponent (same card style: `rounded-xl`, `shadow-warm`, existing borders).
- `ReferenceBar` gains a low band and a "Low" label.
- Save guard: blocks on implausible value or future timestamp; the current "tap Save again to confirm" bypass for out-of-range values is removed.

Tests, `src/lib/glucose.test.ts` and `src/components/progress/BloodSugarTab.test.tsx` (vitest + Testing Library, existing setup):
- Boundary cases at 53/54/69/70/99/100/125/126/249/250 mg/dL and the mmol/L equivalents (2.9/3.0/3.8/3.9/13.8/13.9).
- Entering a low value renders the urgent card with `role="alert"` and never the word "Normal".
- Future timestamp blocks Save; no insert call is made (Supabase client mocked — no production writes).

Verification: `vitest run`, `tsgo` typecheck, eslint on touched files, production build.

## Out of scope

S2–S9, chat/consent, deletion, marketing claims, and any publish or deploy step.
