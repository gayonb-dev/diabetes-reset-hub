# Seed Days 91–180 + Blog Batch 3, and fix hidden blog links

## What's wrong today
There are 10 blog entries in the library. Five of them store their link and source under one set of key names (`external_url` / `source_name`) and five under another (`url` / `source`). The Learn page only reads the second set, so those five older entries show no "Read article" link at all.

Current state confirmed: 90 non-extension program days (max Day 90), 7 extension days, 10 blog entries.

## Plan

1. **Report the existing blog rows** — list each title with its full metadata so the key mismatch is visible (already gathered: 5 rows use `external_url`/`source_name`, 5 use `url`/`source`).

2. **Normalise the 5 mismatched rows** — copy their values into `url` and `source`, keeping the original keys as well so no value is dropped. The 5 already-correct rows stay untouched.

3. **Seed Days 91–180** into the program day table verbatim (title, description, sub-tasks exactly as written), with `is_extension_day = false`. Following the Day 90 convention: Phase 4 for Days 91–135, Phase 5 for Days 136–180; day name formatted `Day N: <Title>`; action type inferred from the same conventions already in use. The 7 extension days are left alone.

4. **Seed blog entries 11–15** verbatim, mapping the file's `source_name` → `source` and `external_url` → `url`, continuing the existing sort order and unlock day.

5. **Make the Learn page resilient** — read the link as `url ?? external_url` and the source as `source ?? source_name`, so any future key mismatch degrades gracefully instead of hiding the link.

6. **Report** — number of rows normalised, confirmation every blog row now renders a working link, and final counts (program days with `is_extension_day = false` = 180; blog entries = 15).

## Technical notes
- Two database operations: one data update to normalise blog metadata, one bulk insert for the 90 new `daily_actions` rows and 5 new `content_items` blog rows. No schema change needed.
- Only one source file changes: `src/pages/app/Learn.tsx` (metadata key fallbacks in the blog tab).
- No copy is rewritten; medication-related wording in this batch is inserted exactly as supplied.
