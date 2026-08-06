# Phase: S2, S3, S4 — remaining clinical content

Scope is limited to fasting safety, supplements/foot care/mindset/notifications, and AI health-content boundaries. No privacy, chat auth, billing, or landing-page work. Nothing is published.

## S2 — Fasting safety

Fasting becomes clearly optional educational content, and the app stops implying clearance.

- Screening result copy replaced:
  - Cleared state becomes "Based on these answers, the app has not identified one of its listed stop conditions. This is not medical clearance."
  - Medication state becomes "Ask your prescriber or pharmacist whether fasting is appropriate with your medicines. Never change a dose on your own." The current "your doctor adjusts your doses first" wording is removed.
  - The self-attestation checkbox stays, but is relabelled as a record that the conversation happened, not as clearance; unchecking it withdraws it and re-locks scheduling.
- An "Optional" label on the Fasting tab and screening card, plus a short safety-summary card (stop conditions, what to do if you feel low, who to ask).
- A visible clinician-review placeholder noting the full contraindication and stop-rule list is pending clinical review before publication. No new medical rules invented.
- Locked state stays neutral and points to the non-fasting tools (plate method, post-meal walks, consistent meal timing) rather than reading as a failure.
- Incomplete or unknown answers keep fasting scheduling locked (existing `canFast` logic already does this; wording and states are what change).

## S3 — Supplements, foot care, mindset, notifications

**Supplements page** rebuilt as "Supplements: questions to discuss with your healthcare professional." Removes the three named products, doses, purchase links, "foundation" language, and the ACV/cinnamon section. Replaced with useful educational content: why evidence varies, interaction risk with diabetes medicines, product-quality variability, a short list of questions to bring to a prescriber or pharmacist, and a clear statement that no supplement is required to use DRM. Adds a neutral "I'm not using supplements" path that closes the topic without nagging.

**Onboarding supplement modal** replaced with the same neutral framing and two options: "Take me to the questions list" and "Not using supplements." No product link.

**Foot care** — the Epsom-salt soak cool-down item is removed. Replaced with NIDDK-based general foot-care education (daily visual check, wash and dry well including between toes, moisturize but not between toes, do not soak, well-fitting shoes and socks, report sores or numbness to a healthcare professional). Delivered as a short foot-care card rather than an empty checklist slot.

**Mindset content** rewritten around identity-safe behavior in weeks 1–5 where the flagged lines sit: consistency, learning from your own data, and returning after missed days. Removes "you are on the same path" as people who stopped medication, "your body is responding right now", "a version of you that does not have diabetes", and "I am reversing my diabetes" assignments. Week structure, card count, postures, and unlock days stay identical.

**Notifications** — removes the unsupported "3.6 times more likely" statistic, "the numbers are going to say something good", "this is permanent", "this is working" during fasting, and the Epsom-salt line. Replacement copy stays in VITA's voice and describes actions and streaks, not predicted physiological results. Notification delivery logic, timing, and preference keys are untouched.

## S4 — AI health-content boundaries

- `generate-meal-plan` system prompts: the invented "certified diabetes nutrition specialist" credential and the "reversal / therapeutic / every meal must lower blood sugar" framing are replaced with an educational meal-planning assistant that follows the member's preferences and the plate framework. Output schema, plate structure, and ingredient lists are unchanged so existing plans and parsing keep working.
- Meal plans and AI answers show an "AI-generated" status line with a "Report this content" action that files a support request.
- `ask-vita`: medical interpretation, symptom, medication, and safety questions get a deterministic pre-model handoff — a keyword/pattern check that routes to the professional-contact response before any model call, instead of relying only on the model's `is_medical_question` self-classification. The model flag remains as a second layer.
- Prompt-injection protection: stored conversation summaries and other stored text are wrapped as untrusted data with explicit instructions not to follow embedded directions, and all AI-generated content is HTML-escaped before it is interpolated into the meal-plan email template.

## Verification

- Regression tests: glucose/fasting eligibility copy states, deterministic medical handoff routing, HTML escaping, and mindset/notification copy assertions that flagged phrases no longer appear anywhere in the bundle.
- Run vitest, `tsgo` typecheck, lint on touched files, and the production build; fix failures caused by this phase.

## Clinician review still required

Marked in-app and reported: the full fasting contraindication and stop-rule list, the foot-care education wording, and any future supplement guidance. These ship with conservative educational wording and a visible review flag.

## Files expected to change

`src/components/safety/FastingScreening.tsx`, `src/pages/app/Fasting.tsx`, `src/components/fasting/LowBloodSugarCard.tsx`, `src/components/settings/FastingSettingsSection.tsx`, `src/pages/app/Supplements.tsx`, `src/components/onboarding/SupplementPrompt.tsx`, `src/data/workouts.ts`, a new foot-care content module, `src/data/mindsetWeeks.ts`, `supabase/functions/send-notification/index.ts`, `supabase/functions/generate-meal-plan/index.ts`, `supabase/functions/ask-vita/index.ts`, `supabase/functions/send-meal-plan/index.ts`, `supabase/functions/summarize-conversation/index.ts`, plus new test files.
