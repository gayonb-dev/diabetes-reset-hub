#!/usr/bin/env python3
"""Batch 1 Part A — active-content inventory generator.

Read-only. Pulls active member/public-facing content from the production
database and from source-controlled content files, applies the Batch 1 risk-tag
taxonomy and emits:

  docs/doctor-review/active-content-inventory.json
  docs/doctor-review/active-content-inventory.csv
  docs/doctor-review/content-replacement-matrix.md
  docs/doctor-review/clinical-review-pack.md

No clinical replacement copy is invented here. Dispositions are limited to
KEEP / CLINICIAN REVIEW REQUIRED / OWNER COPY REQUIRED / RETIRE / TEMPORARY
FALLBACK APPLIED.
"""
from __future__ import annotations

import csv
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "doctor-review"
DB = os.environ.get("SUPABASE_DB_URL")

# --- risk taxonomy (complete Batch 1 list) --------------------------------
RISK_RULES: list[tuple[str, str]] = [
    ("fasting_scheduling", r"(fast(ing)?\s*(window|schedule|timer|hours?)|intermittent fasting|16:8|12:12|eating window|stop eating by|fast until|overnight fast|night faster|fasting after)"),
    ("cheat_meal", r"(cheat meal|cheat day|cheat and fast|treat yourself day)"),
    ("supplements", r"(supplement|berberine|chromium|cinnamon capsule|magnesium|alpha[- ]lipoic|dosage|\bmg\b|take .{0,20}daily with)"),
    ("reversal_cure", r"(revers(e|al|ing)|\bcure[ds]?\b|remission|reclaim(er)?)"),
    ("promised_outcomes", r"(lower your (a1c|blood sugar)|drop \d+|lose \d+\s*(lb|pound|kg)|guarantee[ds]?|will reduce|points? lower|in (just )?\d+ (days?|weeks?))"),
    ("diagnostic_label", r"(diabetic|pre[- ]?diabetic|normal zone|diabetic zone)"),
    ("treatment_or_testing_instruction", r"(insulin dose|adjust your (medication|insulin)|stop taking|skip your (dose|medication)|check your a1c every)"),
    ("medical_clearance", r"(cleared? (you|your) (knees|joints|back)|safe for your (knees|body|condition)|no need to (see|ask) (your )?doctor|medically safe for you)"),
    ("shame_food_language", r"(bad food|guilty|guilt[- ]free|sinful|naughty|willpower failure)"),
    ("uncited_absolute", r"(\balways\b|\bnever\b|everyone|proven to|scientifically proven|studies show)"),
    ("obsolete_feature", r"(whatsapp|coaching call|your coach|personal(ised|ized) (health )?ai|book a call|calendly|1[- ]on[- ]1)"),
    ("nonfunctional_promise", r"(printable report coming|read more soon|coming soon|click here to download)"),
    ("insulin_sensitivity_claim", r"(insulin sensitivity|blood[- ]sugar clearance|glucose uptake|burns? (the )?sugar)"),
]

SAFE_TAG = "safe_no_change_required"


def tag(text: str) -> list[str]:
    if not text:
        return [SAFE_TAG]
    low = text.lower()
    tags = [name for name, pat in RISK_RULES if re.search(pat, low)]
    return tags or [SAFE_TAG]


def q(sql: str) -> list[dict]:
    if not DB:
        print("SUPABASE_DB_URL not set", file=sys.stderr)
        return []
    out = subprocess.run(
        ["psql", DB, "-At", "-c", f"select coalesce(json_agg(t),'[]') from ({sql}) t"],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return json.loads(out or "[]")


def add(items, *, ident, source_type, location, field, surface, copy, active, links, disposition=None):
    tags = tag(copy or "")
    if disposition is None:
        disposition = "KEEP" if tags == [SAFE_TAG] else "CLINICIAN REVIEW REQUIRED"
    items.append({
        "id": ident,
        "source_type": source_type,
        "location": location,
        "field": field,
        "surface": surface,
        "copy": (copy or "").strip(),
        "active": active,
        "linked_records": links,
        "risk_tags": tags,
        "disposition": disposition,
    })


def collect_database(items):
    for r in q("select id, day_number, phase_number, day_name, action_title, action_description, action_detail_content::text as detail, sub_tasks::text as sub_tasks, action_type, is_extension_day, learning_objective from daily_actions order by day_number"):
        surface = f"/app/day/{r['day_number']}"
        base = f"daily_actions:{r['id']}"
        for field in ("day_name", "action_title", "action_description", "learning_objective", "detail", "sub_tasks"):
            val = r.get(field)
            if not val or val in ("null", "[]", "{}"):
                continue
            add(items, ident=f"{base}#{field}", source_type="database", location="public.daily_actions",
                field=field, surface=surface, copy=val, active=True,
                links=[f"day_number={r['day_number']}", f"phase={r['phase_number']}",
                       f"is_extension_day={r['is_extension_day']}"])

    for r in q("select id, type, slug, title, summary, body, is_active, day_unlock from content_items order by type, sort_order"):
        base = f"content_items:{r['id']}"
        surface = "/app/learn" if r["type"] in ("guide", "blog") else "/app/library"
        for field in ("title", "summary", "body"):
            if not r.get(field):
                continue
            add(items, ident=f"{base}#{field}", source_type="admin editable", location="public.content_items",
                field=field, surface=surface, copy=r[field], active=bool(r["is_active"]),
                links=[f"type={r['type']}", f"slug={r['slug']}", f"day_unlock={r['day_unlock']}"])

    for r in q("select id, slug, name, description, unlock_hint, category, tier, xp_reward from badges order by sort_order"):
        base = f"badges:{r['id']}"
        for field in ("name", "description", "unlock_hint"):
            if not r.get(field):
                continue
            add(items, ident=f"{base}#{field}", source_type="database", location="public.badges",
                field=field, surface="/app/progress (badges)", copy=r[field], active=True,
                links=[f"slug={r['slug']}", f"category={r['category']}", f"xp={r['xp_reward']}"])

    for r in q("select id, category, quote_text, is_active, day_range_start, day_range_end from vita_quotes order by created_at"):
        add(items, ident=f"vita_quotes:{r['id']}#quote_text", source_type="admin editable", location="public.vita_quotes",
            field="quote_text", surface="/app (VITA card)", copy=r["quote_text"], active=bool(r["is_active"]),
            links=[f"category={r['category']}", f"days={r['day_range_start']}-{r['day_range_end']}"])

    for r in q("select id, name, description, nutritional_note, timing, is_active, unlock_day from snack_library order by sort_order"):
        base = f"snack_library:{r['id']}"
        for field in ("name", "description", "nutritional_note", "timing"):
            if not r.get(field):
                continue
            add(items, ident=f"{base}#{field}", source_type="database", location="public.snack_library",
                field=field, surface="/app/meals (snacks)", copy=r[field], active=bool(r["is_active"]),
                links=[f"unlock_day={r['unlock_day']}"])


SOURCE_FILES = [
    ("src/data/learnGuides.ts", "/app/learn", "source"),
    ("src/data/mindsetWeeks.ts", "/app (mindset)", "source"),
    ("src/data/workouts.ts", "/app/workouts", "source"),
    ("src/lib/glucose.ts", "/app/progress (glucose labels)", "source"),
    ("src/lib/levels.ts", "/app (levels)", "source"),
    ("src/lib/phase.ts", "/app (phase labels)", "source"),
    ("src/pages/app/Support.tsx", "/app/support", "source"),
    ("supabase/functions/_shared/copy.ts", "public chat (deterministic)", "source"),
    ("supabase/functions/_shared/vitaSafety.ts", "AI boundary prompt", "source"),
    ("supabase/functions/ask-vita/index.ts", "AI system prompt", "source"),
    ("supabase/functions/chat-agent/index.ts", "public chat prompt", "source"),
    ("supabase/functions/send-notification/index.ts", "notification templates", "seed/default"),
    ("supabase/functions/award-badges/index.ts", "badge award rules", "source"),
]

STRING_RE = re.compile(r'"([^"\\\n]{25,400})"|\'([^\'\\\n]{25,400})\'|`([^`\\]{25,400})`')


def collect_source(items):
    for rel, surface, stype in SOURCE_FILES:
        p = ROOT / rel
        if not p.exists():
            continue
        for i, line in enumerate(p.read_text(encoding="utf-8", errors="ignore").splitlines(), start=1):
            for m in STRING_RE.finditer(line):
                s = next(g for g in m.groups() if g)
                if s.startswith(("http", "/", "#", "src/")) or " " not in s:
                    continue
                if tag(s) == [SAFE_TAG]:
                    continue  # source strings are listed only when risk-tagged
                add(items, ident=f"{rel}:{i}", source_type=stype, location=rel, field="string literal",
                    surface=surface, copy=s, active=True, links=[])


def main():
    items: list[dict] = []
    collect_database(items)
    collect_source(items)
    OUT.mkdir(parents=True, exist_ok=True)

    (OUT / "active-content-inventory.json").write_text(
        json.dumps({"generated_by": "scripts/doctor-review/build-inventory.py",
                    "project": "wqennhjdojjqmmqzjhti",
                    "item_count": len(items),
                    "risk_tags": [n for n, _ in RISK_RULES] + [SAFE_TAG],
                    "items": items}, indent=2), encoding="utf-8")

    with (OUT / "active-content-inventory.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["id", "source_type", "location", "field", "surface", "active",
                    "risk_tags", "linked_records", "disposition", "copy"])
        for it in items:
            w.writerow([it["id"], it["source_type"], it["location"], it["field"], it["surface"],
                        it["active"], ";".join(it["risk_tags"]), ";".join(it["linked_records"]),
                        it["disposition"], it["copy"].replace("\n", " ")])

    flagged = [i for i in items if i["risk_tags"] != [SAFE_TAG]]
    counts: dict[str, int] = {}
    for i in items:
        for t in i["risk_tags"]:
            counts[t] = counts.get(t, 0) + 1

    lines = ["# Content replacement matrix — Batch 1", "",
             f"Total inventory items: **{len(items)}**. Flagged: **{len(flagged)}**.", "",
             "Risk-tag counts (every Batch 1 category, including zero counts):", ""]
    for t in [n for n, _ in RISK_RULES] + [SAFE_TAG]:
        lines.append(f"- `{t}`: {counts.get(t, 0)}")
    lines += ["", "| ID | Current problem | Intended replacement purpose | Interaction/layout effect | Functionality | Mobile behaviour | Safety/accessibility requirement | Approval state |",
              "| --- | --- | --- | --- | --- | --- | --- | --- |"]
    for i in flagged:
        problem = ", ".join(i["risk_tags"])
        lines.append(
            f"| `{i['id']}` | {problem} — \"{i['copy'][:120].replace('|', '/')}\" | Neutral, non-prescriptive description of the same member action |"
            " No layout change; same card/section | Unchanged | Same stacked card, 44px targets |"
            " No outcome promise, no dosing, no diagnostic label | "
            f"{i['disposition']} |")
    (OUT / "content-replacement-matrix.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    groups = {
        "Glucose": lambda i: "glucose" in i["surface"].lower() or "blood sugar" in i["copy"].lower(),
        "A1C and testing": lambda i: "a1c" in i["copy"].lower(),
        "Workouts and movement": lambda i: "workout" in i["surface"].lower() or "exercise" in i["copy"].lower(),
        "Meals and nutrition": lambda i: "meal" in i["surface"].lower() or "snack" in i["surface"].lower(),
        "Fasting education": lambda i: "fasting_scheduling" in i["risk_tags"],
        "Safety messages": lambda i: "medical_clearance" in i["risk_tags"] or "treatment_or_testing_instruction" in i["risk_tags"],
    }
    pack = ["# Clinical review pack — Batch 1 (questions only)", "",
            "No approved member copy is presented here. Every item below awaits the owner-approved content appendix.", ""]
    seen: set[str] = set()
    for name, pred in groups.items():
        sel = [i for i in flagged if i["id"] not in seen and pred(i)]
        for i in sel:
            seen.add(i["id"])
        pack += [f"## {name} ({len(sel)} items)", ""]
        for i in sel:
            pack.append(f"- `{i['id']}` — tags: {', '.join(i['risk_tags'])}\n  - Current: \"{i['copy'][:300]}\"\n  - Question for review: what wording states the same member action without the flagged claim?")
        pack.append("")
    rest = [i for i in flagged if i["id"] not in seen]
    pack += [f"## Other education ({len(rest)} items)", ""]
    for i in rest:
        pack.append(f"- `{i['id']}` — tags: {', '.join(i['risk_tags'])}\n  - Current: \"{i['copy'][:300]}\"")
    (OUT / "clinical-review-pack.md").write_text("\n".join(pack) + "\n", encoding="utf-8")

    print(f"items={len(items)} flagged={len(flagged)}")
    for t, c in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"  {t}: {c}")


if __name__ == "__main__":
    main()
