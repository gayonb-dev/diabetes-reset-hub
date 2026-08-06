# Phase: S2, S3, S4 — remaining clinical content

Scope is limited to fasting safety, supplements/foot care/mindset/notifications, and AI health-content boundaries. No privacy, chat auth, billing, or landing-page work. Nothing is published.

Clinical-review status stays internal. Members never see "pending clinician review" notices; review flags live in code comments and the completion report only.

## Safeguards (added before implementation)

- **Fasting scheduling feature flag.** A single exported constant (`FASTING_SCHEDULING_ENABLED`, default `false`) in a dedicated `src/lib/featureFlags.ts`, mirrored server-side in `supabase/functions/_shared/featureFlags.ts`. Default is `false` in every environment; enabling requires editing the constant and the accompanying `CLINICAL_APPROVAL` record (approver, date, document reference), not deleting a comment. A test asserts the flag is `false` and that scheduling UI/handlers are unreachable while it is false.
- **No broken supplements route.** `/app/supplements` becomes a redirect to the new Learn/Safety supplement education article. Every internal link is updated or removed: `src/App.tsx`, `src/pages/app/AppLayout.tsx`, `src/pages/app/Dashboard.tsx`, `src/components/dashboard/GettingStartedChecklist.tsx`, `src/components/onboarding/SupplementPrompt.tsx` (deleted), `src/pages/app/Support.tsx`, `src/pages/LLMInfo.tsx`.
- **Full reference scan** for `/app/supplements`, "Nature Made", "Solgar", "R-ALA", "benfotiamine", "apple cider vinegar"/"ACV", "Ceylon cinnamon", "supplement pack", "supplement foundation" — across member UI, onboarding, Getting Started checklist, Learn content (`src/data/learnGuides.ts`), notifications, Ask/VITA knowledge (`supabase/functions/ask-vita/index.ts`), admin content, and database-managed content (`content_items`, `daily_actions`, `vita_quotes`). Commercial recommendations are removed; the approved educational article replaces them only where appropriate. Each hit is reported with its disposition.
- **Duplicate notification templates.** The unsafe defaults exist in both `supabase/functions/send-notification/index.ts` and `src/pages/admin/AdminContent.tsx` (e.g. the "3.6 times more likely" line at AdminContent.tsx:727). Both are corrected, plus any stored/editable copies in the database, so existing rows stop emitting removed claims after the source defaults change.
- **Fasting safety summary reuses S1.** Low-glucose wording and professional-contact boundaries come from `src/lib/glucose.ts` / `GlucoseSafetyCard`. No new treatment, carbohydrate, medication, or emergency instructions are authored in this phase.
- **Report this content.** Requires an authenticated member; the edge function verifies the referenced record belongs to the reporter before accepting. The stored row holds only content type, owned record id, generation timestamp, selected reason, reporter id, and created/updated timestamps. No raw health or AI text is copied into the general support record.
- **Escaping at the render boundary.** AI text is escaped where it is interpolated into HTML, not at generation. Meal-plan email, daily digest, and every other AI-to-HTML template discovered by the scan are covered and tested.
- **Content regression scan** covers member content, AI prompts, admin templates, notification defaults, and seed data. The public landing-page rewrite stays out of this phase; any unsafe landing copy found (e.g. in `src/pages/Index.tsx`, `src/components/landing/FAQSection.tsx`) is reported for the later claims phase, not edited.


## S2 — Fasting safety

Fasting becomes an optional advanced tool, entered deliberately, and stays out of the default first-14-day experience.

- Fasting scheduling remains unavailable in production until clinical review completes. The tab presents fasting as optional educational content and the safety check; it does not schedule windows for members.
- Fasting is removed from the default early journey: no fasting prompts, nav emphasis, or onboarding steps before a member deliberately opens the tool.
- Screening result copy replaced:
  - Cleared state becomes "Based on these answers, the app has not identified one of its listed stop conditions. This is not medical clearance."
  - Medication state becomes "Ask your prescriber or pharmacist whether fasting is appropriate with your medicines. Never change a dose on your own." The "your doctor adjusts your doses first" wording is removed.
  - The self-attestation checkbox is relabelled as a record that the conversation happened, not clearance; unchecking withdraws it.
- An "Optional" label plus a short safety-summary card (stop conditions, what to do if you feel low, who to ask).
- Locked/unavailable states stay neutral and point to the non-fasting tools (plate method, post-meal walks, consistent meal timing).
- Incomplete or unknown answers keep everything locked.

## S3 — Supplements, foot care, mindset, notifications

**Supplements** removed from the default member journey: the onboarding supplement modal is deleted (not replaced), and the Supplements tab is removed from navigation and the member journey. The named products, doses, purchase links, "foundation" language, and ACV/cinnamon content go away entirely.

Neutral supplement education moves into Learn/Safety as an article: "Supplements: questions to discuss with your healthcare professional" — evidence varies, interaction risk with diabetes medicines, product-quality variability, questions to bring to a prescriber or pharmacist, and a clear statement that no supplement is required to use DRM. No product names, no doses, no purchase links.

**Foot care** — the Epsom-salt soak cool-down item is removed from the workout checklist and not replaced with another task. NIDDK-based foot-care education becomes a Learn/Safety article (daily visual check, wash and dry well including between toes, moisturize but not between toes, do not soak, well-fitting shoes and socks, report sores or numbness to a healthcare professional). One brief contextual line links to it from the workout cool-down — not a recurring task or new feature surface.

**Mindset content** rewritten around identity-safe behavior in the weeks holding flagged lines: consistency, learning from your own data, and returning after missed days. Removes "you are on the same path" as people who stopped medication, "your body is responding right now", "a version of you that does not have diabetes", and the "I am reversing my diabetes" assignments. Week structure, card count, postures, and unlock days unchanged.

**Notifications** — removes the unsupported "3.6 times more likely" statistic, "the numbers are going to say something good", "this is permanent", "this is working" during fasting, and the Epsom-salt line. Replacement copy stays in VITA's voice and describes actions and streaks, not predicted physiological results. Delivery logic, timing, and preference keys untouched.

## S4 — AI health-content boundaries

- `generate-meal-plan` prompts: the invented "certified diabetes nutrition specialist" credential and the "reversal / therapeutic / every meal must lower blood sugar" framing are replaced with an educational meal-planning assistant that follows member preferences and the plate framework. Output schema and parsing unchanged.
- `ask-vita` program knowledge is corrected to match S2/S3 (no named supplements or doses, fasting as optional and gated).
- Deterministic medical handoff as the **first** safety layer, not the only one: a keyword/pattern check runs before the model and routes symptom, medication, dosage, interpretation, and emergency questions to the professional-contact response. The model's `is_medical_question` flag remains a second layer, and uncertain or failed classification fails safely to the handoff.
- Meal plans and AI answers show an "AI-generated" status line with a **Report this content** action. The report submits a content reference (type, record id, generation timestamp) and a chosen reason only — no raw health content is copied into a general support record.
- Prompt-injection protection: stored conversation summaries and other stored text are wrapped as untrusted data with explicit instructions not to follow embedded directions.
- All AI-generated text is HTML-escaped wherever it enters HTML — meal-plan emails, daily digest emails, and any other HTML template.

## Verification

- Regression tests: fasting eligibility copy and locked states; deterministic medical routing including **false positives** (benign questions containing trigger words must not be blocked) and **false negatives** (phrasings that must be caught); HTML-escaping of AI text in email templates; report-content payload contains no health text; content assertions that flagged mindset/notification phrases no longer appear.
- Run vitest, `tsc --noEmit`, lint on touched files, and the production build; fix failures caused by this phase.

## Clinician review still required (internal, reported not displayed)

Fasting contraindication and stop-rule list; foot-care education wording; any future supplement guidance. Fasting scheduling stays unavailable until review is complete.

## Files expected to change

`src/components/safety/FastingScreening.tsx`, `src/pages/app/Fasting.tsx`, `src/components/settings/FastingSettingsSection.tsx`, `src/components/fasting/*`, deletion of `src/components/onboarding/SupplementPrompt.tsx` and `src/pages/app/Supplements.tsx` with route/nav removal in `src/App.tsx` and `src/pages/app/AppLayout.tsx`, `src/data/learnGuides.ts` (new supplements + foot-care safety articles), `src/data/workouts.ts`, `src/data/mindsetWeeks.ts`, `supabase/functions/send-notification/index.ts`, `supabase/functions/generate-meal-plan/index.ts`, `supabase/functions/ask-vita/index.ts`, `supabase/functions/send-meal-plan/index.ts`, `supabase/functions/daily-digest/index.ts`, `supabase/functions/summarize-conversation/index.ts`, a shared HTML-escape helper, plus new test files.
