# S1 — Blood-glucose safety (revised)

Implements only section S1 of the remediation matrix. No other section, no redesign, no publish.

Precondition: PROJECT_CORNERSTONE.md must be uploaded first. It will be read before any edit and treated as the standing product and brand authority.

## Classification rules

Low safety is applied first for every reading type, then the existing context-specific range:

```text
< 54 mg/dL   (< 3.0 mmol/L)    urgent_low   all reading types
54-69        (3.0-3.8)         low          all reading types

>= 70, by reading type:
fasting     70-99   in range | 100-125 elevated | 126+ high
post_meal   70-139  in range | 140-199 elevated | 200+ high
bedtime     70-119  in range | 120-179 elevated | 180+ high
other/cgm   70-139  in range | 140-199 elevated | 200+ high
```

No new urgent-high threshold is introduced. The existing context-sensitive high state stays exactly as it is. Values above 600 mg/dL (and below 20) are rejected as implausible and cannot be saved.

Classification always runs on the canonical mg/dL value converted from the entered unit, before any display rounding.

## Safety messaging

Urgent low (below 54 mg/dL):
"This reading is dangerously low. Follow your healthcare professional's low-blood-sugar plan now. If you feel confused, faint, unable to treat yourself, or symptoms are severe, contact emergency services."

Low (54-69 mg/dL):
"This reading is low. Follow your healthcare professional's low-blood-sugar plan now. If symptoms are severe or you cannot treat yourself, contact emergency services."

Both states also display: "Never change medication based on this app alone."

Presentation: an alert card in the existing card style (rounded-xl, shadow-warm, existing borders and tokens), with `role="alert"` so a newly entered low value is announced without moving the member's focus. Icon plus text label, never colour alone. No forced focus unless accessibility testing shows it is needed.

## Where it applies

Every surface that labels or colours a glucose reading is updated to use the shared classifier, with no other redesign:

- `src/components/progress/BloodSugarTab.tsx` — entry field, latest-reading card, reference bar (gains a low band and "Low" label at the left edge), history chart dots and tooltips.
- `src/pages/app/Dashboard.tsx` — `bloodSugarTone` currently treats anything under 100 as normal, so a saved 55 shows green; it will delegate to the shared classifier.
- `src/components/dashboard/QuickStats.tsx` — tone mapping extended for the low/urgent-low states.
- `src/pages/app/ProgressReport.tsx` — printable report readings table and averages get the low state rather than an unmarked value.

Any further glucose-labelling site found during a full grep is updated the same way and listed in the report.

## Validation

- Future timestamps blocked: the datetime field is capped at now; a future value shows an inline correction message and disables Save.
- Implausible values (outside 20-600 mg/dL) ask the member to correct the entry; the existing "tap Save again to confirm" bypass is removed.
- Nothing is written to the database until the entry is valid.

## Technical detail

New `src/lib/glucose.ts`:
- `GLUCOSE_LOW_THRESHOLDS` and per-reading-type range table (canonical mg/dL; mmol/L display via `src/lib/units.ts`).
- `classifyGlucose(mgdl, readingType)` -> `urgent_low | low | in_range | elevated | high`.
- `isPlausible(mgdl)`, `isFutureTimestamp(iso)`, and the approved copy constants.

Tests (vitest + Testing Library, existing setup; Supabase client mocked so no production writes):
- `src/lib/glucose.test.ts` — boundaries at 53/54/69/70 for every reading type, plus each type's elevated/high boundaries, and mmol/L equivalents (2.9/3.0/3.8/3.9) verifying conversion happens before rounding.
- `src/components/progress/BloodSugarTab.test.tsx` — entering a low value renders the alert with `role="alert"`, both copy variants, the medication line, and never the word "Normal"; a previously saved low reading renders as low in the latest-reading card and the history chart; future timestamp and out-of-range values block Save with no insert call.

Verification commands: `vitest run`, `tsc --noEmit` (the project's existing TypeScript check), eslint on touched files, and a production build.

## Remaining release requirements

- Clinician approval of the low thresholds and low/urgent-low copy.
- Clinician approval of high-glucose escalation logic, including whether an urgent-high threshold and its instructions should exist. Not implemented in this batch.

## Out of scope

S2-S9, chat/consent, deletion, marketing claims, and any publish or deploy step.
