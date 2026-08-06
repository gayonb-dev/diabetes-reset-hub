# S2–S4: Clinical content remediation (appendix-governed)

`DRM_S2_S4_Content_Approval_Appendix.md` is the final authority for all member-facing wording and interactions. Copy is implemented verbatim. Where a component limitation would force a wording change, that item stops and the old-vs-new text is reported instead of shipped.

Clinical-review status stays internal — members never see "pending clinician review". CLINICIAN GATE items are tracked in the completion report only. Nothing is published.

## Fasting data rule

While scheduling is off, DRM asks for and stores no fasting-specific medication, pregnancy/breastfeeding, Type 1, eating-history, exclusion, or clinician-confirmation data. Any existing code that conflicts with this is revised before verification and listed in the report.


## S2 — Fasting release state

- `FASTING_SCHEDULING_ENABLED` stays `false` in every environment (new `src/lib/featureFlags.ts`, mirrored in `supabase/functions/_shared/featureFlags.ts`). Turning it on requires editing the constant plus a `CLINICAL_APPROVAL` record — not deleting a comment. A test asserts the flag is false and scheduling is unreachable.
- Delete `src/components/safety/FastingScreening.tsx` and remove it from onboarding, `/app/fasting`, and Settings (`src/components/settings/FastingSettingsSection.tsx`). Remove its required-answer validation from onboarding so it cannot block setup. No replacement questionnaire, attestation checkbox, or "cleared" state.
- Make timers, schedules, logging controls, fasting meal-plan modes, prompts, notifications, handlers, and background actions unreachable: `WindowCountdown`, `FastingTimeline`, `FastingTargetCard`, fasting writes in `useFastingProfile`, and the `if_fast_start` / `if_fast_complete` notification templates.
- Remove Fasting from primary desktop nav, mobile More grid, onboarding, Getting Ready checklist, Today prompts, habit rings, and the default meal-plan journey.
- `/app/fasting` stays as an authenticated education-only page carrying the appendix copy verbatim (Optional badge, "Fasting and diabetes", unavailable card, safety section, low-reading section reusing the S1 classifier text, tools list, both CTAs, ADA/NIDDK source line). Deliberate entry is one Learn → Guides link, "Fasting and diabetes: read this first".
- Deactivate the existing intermittent-fasting, fasting-and-meal-timing, and cheat-meal Learn guides now — the default entries in `src/data/learnGuides.ts` and any active database overrides in `content_items`. The fasting guides' scheduling, medication-adjustment, mechanism, and predicted-result language and the cheat-meal guide's "begin your overnight fast" instruction plus its unsupported "cheat meals do not derail biology" claim all conflict with the education-only state. A broader cheat-meal replacement waits for the later content/claims phase.
- Remove every automatic fasting side effect from the Cheat Meal flow (`src/pages/app/CheatMeal.tsx` and its handlers): no `if_fasting_log` writes, no "fast begins" wording, no timer activation, no fasting notifications. A meal choice never starts a disabled health feature.
- No database columns are dropped and no stored records are erased in this phase.


## S3 — Supplements, foot care, mindset, notifications

- New Learn/Safety article `supplements-and-diabetes-safety` with the appendix body, source card, NCCIH/FDA links, and `Return to Guides` CTA. `/app/supplements` redirects to `/app/learn?guide=supplements-and-diabetes-safety` with the interim line "Opening supplement safety guidance…".
- Remove the Supplements nav item, `SupplementPrompt.tsx` onboarding modal, Dashboard prompt, Getting Ready purchase items, Support/Ask category prompts, product cards and search links, dose instructions, and the `supplement-guide` / `acv-cinnamon` entries. No replacement checklist task.
- New Learn/Safety article `everyday-foot-care` (appendix body, NIDDK link). In workouts: delete the `epsom_soak` checkbox from `src/data/workouts.ts`, add the informational foot reminder link below the cooldown checklist — not a checkbox.
- Replace all six weeks of `src/data/mindsetWeeks.ts` with the appendix text, preserving week numbers, titles, unlock days, card counts, postures, and the absent Week 6 assignment.
- Apply every row of the appendix's ten-level table — all names and messages, including Level 1 becoming **The Starter** — across `src/lib/levels.ts`, `LevelBadge.tsx`, `LevelUpOverlay.tsx`, `Dashboard.tsx`, `StreakHistoryModal.tsx`, and `gamify-action`. Replace visible "Reversal Streak" with "Daily Action Streak" and "Phase 3 — Reversal" with "Phase 3 — Build Your Routine".
- Rewrite every notification template to the approved table in both `supabase/functions/send-notification/index.ts` and the admin previews in `src/pages/admin/AdminContent.tsx`, plus any stored/editable database copies, so corrected defaults are not undone by old rows. Deactivate `cheat_meal_window`, `if_fast_start`, `if_fast_complete`. Habit reminders are never announced as urgent.

## Learn article routing

`Learn.tsx` reads the `guide` query parameter, opens the requested article and scrolls its heading into view, renders real source links and CTAs, and falls back safely on an unknown slug. Focus moves to the article heading only following an expected user-initiated navigation or redirect; background query or state updates must not unexpectedly steal focus. The plain-string guide model is extended to carry links, source cards, and CTA targets without changing any approved wording.

## S4 — AI boundaries

- Ask screen: appendix labels, placeholder, boundary line, and button. AI answer cards get the `AI-generated • Educational only` label, the footer, `Report this answer`, and `Ask the community` only for non-medical program questions. Verified DRM-team answers keep their own label.
- Deterministic pre-model safety layer in `supabase/functions/ask-vita/index.ts` selects the exact emergency, medication, personal-result, fasting, or uncertain-classification message. Deterministic keyword detection is the first layer, not the only one; uncertain classification fails safe. Tests cover false positives (navigation questions such as "Where do I record my medicines?" must still get a normal answer) and false negatives.
- **Report ownership — metadata-only reports over reviewable protected sources.** A report is always metadata: content type, referenced source record id, generation timestamp, reason, reporter id, audit timestamps. Never raw questions, answers, meal plans, or health text in the report table.
  - Meal plans reference the existing protected, member-owned `meal_plans` row. No metadata-only duplicate record is created.
  - Generated Ask answers are persisted server-side into a protected, member-owned generation record that stores the generated answer itself (and the question only when no authorized source record already holds it), so a DRM reviewer can inspect exactly what was reported. Records are immutable after write.
  - The protected source records get RLS scoped to their owner and audited administrator access — admin review goes through the protected access path and writes a `phi_access_log` row. AI-answer generation records are added explicitly to the upcoming P3 deletion, export, retention, and reconciliation inventory. The storage/reporting capability remains unpublished until that release gate passes: this phase may implement and test the protected records, ownership controls, reporting references, and audited access, but must not claim complete deletion coverage or activate the capability in production.
  - Tests: Member A can report their own content; Member A cannot reference Member B's record; anonymous and invalid references are rejected; a reported answer is retrievable by an admin through the audited path; admin review writes an audit row.
- Report dialog uses the appendix title, intro, five reasons, privacy note, buttons, and success/error messages verbatim.
- Meal plan: `AI-generated meal plan` label and safety note below `My Meals`, short label on exports, `Report this meal plan`, and the replacement generation-state line.
- **Meal-plan prompt replacement, not addition.** The old prescriptive rules in `generate-meal-plan` are deleted, not layered under the appendix identity block: reversal and therapeutic framing, predicted glucose / insulin-resistance / weight outcomes, universal calorie, carbohydrate, sodium, glycemic-index and snack prescriptions, "non-negotiable" plate language, the entire intermittent-fasting prompt addition while the flag is false, and any fasting behaviour triggered by stale database values. The output schema stays; nutrition values are labelled estimates and the plate method stays a flexible educational framework.
- Shared server escape helper at `supabase/functions/_shared/html.ts`, imported by every edge function that renders AI text into HTML, applied at the final render boundary — `send-meal-plan`, `daily-digest`, and any others found by the scan. A browser-side `src/lib/html-utils.ts` is added only if client code also needs escaping. Each HTML-rendering path gets a test asserting injected markup is escaped.

## Database content staging

Stored notification and Learn content changes ship as an idempotent, reversible migration — guarded by slug/template key, safe to re-run, with a documented reversal path. Targeted row counts and sanitized identifiers are reported. No direct mutation or publication of production content during this unpublished phase.

## Scans and verification


- Reference scan for `/app/supplements`, Nature Made, Solgar, R-ALA, benfotiamine, apple cider vinegar/ACV, Ceylon cinnamon, supplement pack, supplement foundation — across member UI, onboarding, checklist, Learn, notifications, Ask/VITA knowledge, admin content, and database-managed content. Each hit reported with its disposition.
- Content-regression scan across member content, AI prompts, admin templates, notification defaults, and seed data.
- `tsc --noEmit`, vitest regression tests, lint on touched files, production build.
- Deferred to the later claims phase and reported, not edited: onboarding reversal goals, remaining reversal/proof/compliance labels, the existing blood-sugar and snack Learn articles, landing page, legacy intake, six-week page, public chat prompt, lead magnet, `llms.txt`, and testimonials. The fasting and cheat-meal Learn guides are handled now, not deferred.

## Report

Files changed, visible replacements, scan results with dispositions, revisions made to conflicting earlier work, test/type/lint/build results, remaining CLINICIAN GATE items, and the preview URL. No publish.
