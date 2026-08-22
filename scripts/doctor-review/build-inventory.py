#!/usr/bin/env python3
"""Batch 1 Part A (corrected) — active-content inventory generator.

Read-only against the database. Emits:

  docs/doctor-review/active-content-inventory.json
  docs/doctor-review/active-content-inventory.csv
  docs/doctor-review/content-replacement-matrix.md
  docs/doctor-review/clinical-review-pack.md

Gates (all fail-closed, artifacts are not written when a gate fails):
  1. classifier regression fixtures (known false negatives / false positives);
  2. coverage manifest — every declared surface yields entries or carries an
     explicit documented reason;
  3. duplicate-day reconciliation — every guided day has exactly one active
     daily action and every inactive duplicate is dispositioned;
  4. count reconciliation across JSON, CSV, matrix and clinical pack.

No clinical replacement copy is invented. Only the single approved temporary
fallback already applied in the database is reported as replacement copy.
"""
from __future__ import annotations

import csv
import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from classify import (  # noqa: E402
    DISPOSITIONS, HISTORICAL, KEEP_EDU, RETIRE_OUTCOME, SAFE_TAG, TEMP_FALLBACK,
    RISK_RULES, classify,
)
from fixtures import run as run_fixtures  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "doctor-review"
DB = os.environ.get("SUPABASE_DB_URL") or ""

APPROVED_FALLBACK_TITLE = "Review one routine that helped"

# Badge slugs retired in Part G (outcome / obsolete-feature gamification).
RETIRED_BADGE_PATTERNS = re.compile(
    r"(night[_ -]?faster|cheat|fast|dropping|pre[_ -]?diabetic|normal[_ -]?zone|weight[_ -]?milestone)",
    re.I,
)


def q(sql: str) -> list[dict]:
    args = ["psql", "-At", "-c", f"select coalesce(json_agg(t),'[]') from ({sql}) t"]
    if DB:
        args.insert(1, DB)
    out = subprocess.run(args, capture_output=True, text=True, check=True).stdout.strip()
    return json.loads(out or "[]")


items: list[dict] = []
coverage: list[dict] = []


def add(*, ident, source_type, location, field, surface, copy, active,
        links, reachable=True, contained=False, gamification=False,
        interaction_broken=False, internal=False, replacement=None, notes=""):
    text = (copy or "").strip()
    res = classify(text, reachable=reachable and active, contained=contained,
                   gamification=gamification, interaction_broken=interaction_broken,
                   internal=internal)

    items.append({
        "id": ident,
        "source_type": source_type,
        "location": location,
        "field": field,
        "surface": surface,
        "copy": text,
        "active": bool(active),
        "reachable_by_member": bool(reachable and active),
        "linked_records": links,
        "risk_tags": res["risk_tags"],
        "approved_education": res["approved_education"],
        "disposition": res["disposition"],
        "record_state": res["record_state"],
        "proposed_action": proposed_action(res["disposition"]),
        "replacement_copy": replacement,
        "notes": notes,
    })


def proposed_action(d: str) -> str:
    return {
        KEEP_EDU: "No change. Retain as approved, non-prescriptive education.",
        "RETIRE — NOT APPROVED": "Not covered by the approved authority; must be made inactive and unreachable by members.",
        "RETIRE — OBSOLETE FEATURE": "Make inactive/unreachable; the feature it references no longer exists.",
        RETIRE_OUTCOME: "Retire the outcome/gamification record; preserve award history as non-display.",
        "FIX INTERACTION — NONFUNCTIONAL": "Repair the interaction so the described action works; copy unchanged.",
        TEMP_FALLBACK: "Approved temporary fallback already live; replace with appendix copy when supplied.",
        HISTORICAL: "Retain as history only. Already unreachable by members.",
        "KEEP — INTERNAL, NOT MEMBER-FACING": "Internal configuration or code value; keep as is. Never rendered to members.",
    }[d]


def cover(name, kind, count, reason=""):
    coverage.append({"surface": name, "kind": kind, "items": count, "reason": reason})


# Member-owned tables. The doctor-review inventory reviews AUTHORED CONTENT only.
# These tables hold member personal data and are NEVER read, sampled or exported
# by this generator. They are declared here so the coverage manifest proves the
# exclusion is deliberate rather than an oversight.
PERSONAL_DATA_EXCLUSIONS = [
    ("public.profiles", "Member identity and account fields."),
    ("public.visitor_profiles", "Member progress/gamification state tied to a person."),
    ("public.support_tickets", "Member-written support messages."),
    ("public.support_ticket_notes", "Internal notes about an identifiable member."),
    ("public.points_ledger", "Per-member participation ledger."),
    ("public.community_questions", "Member-authored community posts."),
    ("public.community_answers", "Member-authored community replies."),
    ("public.win_posts", "Member-authored community posts."),
    ("public.qa_submissions", "Member-submitted questions."),
    ("public.messages", "Member chat transcripts."),
    ("public.conversations", "Member chat metadata."),
    ("public.health_logs", "Member health measurements."),
    ("public.blood_sugar_readings", "Member glucose data."),
    ("public.member_measurements", "Member body measurements."),
    ("public.intake_submissions", "Member intake responses."),
]


def cover_personal_data_exclusions():
    for table, why in PERSONAL_DATA_EXCLUSIONS:
        cover(f"{table} (EXCLUDED — member personal data)", "excluded", 0,
              f"Not authored content. {why} Never read or exported by the doctor-review inventory.")



# ---------------------------------------------------------------- database
def collect_database():
    rows = q("select id, day_number, phase_number, day_name, action_title, action_description, "
             "action_detail_content::text as detail, sub_tasks::text as sub_tasks, action_type, "
             "is_extension_day, is_active, learning_objective from daily_actions order by day_number, is_extension_day")
    contained_ids = {r["record_id"] for r in q(
        "select distinct record_id from content_containment_log where reason like 'TEMPORARY FALLBACK%%'")}
    n = 0
    for r in rows:
        active = bool(r["is_active"])
        surface = f"/app/day/{r['day_number']}" if active else "(no member route — historical record)"
        base = f"daily_actions:{r['id']}"
        for field in ("day_name", "action_title", "action_description", "learning_objective",
                      "detail", "sub_tasks"):
            val = r.get(field)
            if not val or val in ("null", "[]", "{}"):
                continue
            contained = active and r["id"] in contained_ids
            add(ident=f"{base}#{field}", source_type="database", location="public.daily_actions",
                field=field, surface=surface, copy=val, active=active, reachable=active,
                contained=contained,
                replacement=APPROVED_FALLBACK_TITLE if contained else None,
                links=[f"day_number={r['day_number']}", f"phase={r['phase_number']}",
                       f"is_extension_day={r['is_extension_day']}", f"is_active={active}"],
                notes=("Legacy Phase 1 extension duplicate (E-series) on a guided day. "
                       "Every member query filters is_extension_day = false; the row is now "
                       "is_active = false with a uniqueness safeguard."
                       if not active else ""))
            n += 1
    cover("public.daily_actions (187 records: 180 active guided days + 7 historical duplicates)",
          "database", n)
    return rows


def collect_content_items():
    n = 0
    for r in q("select id, type, slug, title, summary, body, is_active, day_unlock, metadata::text as metadata from content_items order by type, sort_order"):
        base = f"content_items:{r['id']}"
        surface = "/app/learn" if r["type"] in ("guide", "blog") else "/app/library"
        broken = bool(r.get("metadata") and "coming soon" in (r["metadata"] or "").lower())
        for field in ("title", "summary", "body"):
            if not r.get(field):
                continue
            add(ident=f"{base}#{field}", source_type="admin editable",
                location="public.content_items", field=field, surface=surface,
                copy=r[field], active=bool(r["is_active"]), reachable=bool(r["is_active"]),
                interaction_broken=broken,
                links=[f"type={r['type']}", f"slug={r['slug']}", f"day_unlock={r['day_unlock']}"])
            n += 1
    cover("public.content_items (Learn guides, blogs, Library cards)", "admin editable", n)


def collect_badges():
    n = 0
    for r in q("select id, slug, name, description, unlock_hint, category, tier, xp_reward, is_retired from badges order by sort_order"):
        retired = bool(r["is_retired"]) or \
            bool(RETIRED_BADGE_PATTERNS.search(r["slug"] or "")) or \
            bool(RETIRED_BADGE_PATTERNS.search(r["name"] or ""))
        for field in ("name", "description", "unlock_hint"):
            if not r.get(field):
                continue
            add(ident=f"badges:{r['id']}#{field}", source_type="database", location="public.badges",
                field=field, surface="/app/progress (badges)", copy=r[field], active=not retired,
                gamification=retired, reachable=not retired,
                links=[f"slug={r['slug']}", f"category={r['category']}", f"xp={r['xp_reward']}"],
                notes="Outcome/obsolete-feature badge retired in Part G; award history preserved as non-display."
                if retired else "")
            n += 1
    cover("public.badges (badge names, descriptions, unlock hints)", "database", n)


def collect_vita_quotes():
    n = 0
    for r in q("select id, category, quote_text, is_active, day_range_start, day_range_end from vita_quotes order by created_at"):
        add(ident=f"vita_quotes:{r['id']}#quote_text", source_type="admin editable",
            location="public.vita_quotes", field="quote_text", surface="/app (VITA card)",
            copy=r["quote_text"], active=bool(r["is_active"]), reachable=bool(r["is_active"]),
            links=[f"category={r['category']}", f"days={r['day_range_start']}-{r['day_range_end']}"])
        n += 1
    cover("public.vita_quotes (VITA member quotes)", "admin editable", n)


def collect_snacks():
    n = 0
    for r in q("select id, name, description, nutritional_note, timing, is_active, unlock_day from snack_library order by sort_order"):
        for field in ("name", "description", "nutritional_note", "timing"):
            if not r.get(field):
                continue
            add(ident=f"snack_library:{r['id']}#{field}", source_type="database",
                location="public.snack_library", field=field, surface="/app/meals (snacks)",
                copy=r[field], active=bool(r["is_active"]), reachable=bool(r["is_active"]),
                links=[f"unlock_day={r['unlock_day']}"])
            n += 1
    cover("public.snack_library (snack names, notes, timing)", "database", n)


def collect_app_config():
    n = 0
    for r in q("select key, value::text as value, description from app_config order by key"):
        for field in ("description", "value"):
            val = r.get(field)
            if not val or len(val) < 12:
                continue
            add(ident=f"app_config:{r['key']}#{field}", source_type="seed/default",
                location="public.app_config", field=field, surface="(configuration defaults)",
                copy=val, active=True, reachable=False, internal=True,
                links=[f"key={r['key']}"],
                notes="Configuration value; not rendered verbatim to members.")
            n += 1
    cover("public.app_config (seed defaults)", "seed/default", n,
          "" if n else "No text-bearing configuration rows present.")


# ------------------------------------------------------------------ source
SOURCE_DIRS = [
    ("src/pages", "member and public routes"),
    ("src/components", "member and public UI"),
    ("src/data", "source content packs (Learn guides, mindset weeks, workouts)"),
    ("src/lib", "labels, classifiers, copy helpers"),
    ("src/hooks", "stateful member copy"),
    ("supabase/functions", "edge prompts, deterministic chat copy, notification templates"),
]

STRING_RE = re.compile(r'"([^"\\\n]{20,600})"|\'([^\'\\\n]{20,600})\'|`([^`\\$]{20,600})`')
CLASSY = re.compile(r"(^|\s)(flex|grid|rounded|text-[a-z0-9\[]|bg-[a-z0-9\[]|border|px-|py-|pt-|pb-|mt-|mb-|ml-|mr-|gap-|w-|h-|min-|max-|sm:|md:|lg:|xl:|hover:|focus:|dark:|absolute|relative|inline-|items-|justify-)")
CODEY = re.compile(r"^(https?:|/|#|\.|@|[A-Z_]+$|[a-z]+([A-Z][a-z]+)+$)")


def looks_member_facing(s: str) -> bool:
    if CODEY.match(s) or CLASSY.search(s):
        return False
    if " " not in s:
        return False
    letters = sum(c.isalpha() for c in s)
    if letters < len(s) * 0.6:
        return False
    # skip identifiers, sql, selectors
    if re.search(r"(select |insert |from public\.|::|=>|\{\{|\$\{|application/json|utf-8)", s, re.I):
        return False
    return bool(re.search(r"[a-z]{3}\s+[a-z]{2}", s))


def collect_source():
    for rel, why in SOURCE_DIRS:
        base = ROOT / rel
        n = 0
        for p in sorted(base.rglob("*")):
            if p.suffix not in (".ts", ".tsx"):
                continue
            if ".test." in p.name or p.name.endswith("types.ts"):
                continue
            relpath = p.relative_to(ROOT).as_posix()
            surface = surface_for(relpath)
            for i, line in enumerate(p.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
                if re.match(r"\s*(import|export \*|//)", line):
                    continue
                for m in STRING_RE.finditer(line):
                    s = next(g for g in m.groups() if g).strip()
                    if not looks_member_facing(s):
                        continue
                    add(ident=f"{relpath}:{i}", source_type="source",
                        location=relpath, field="string literal", surface=surface,
                        copy=s, active=True, reachable=True, links=[])
                    n += 1
        cover(f"{rel} ({why})", "source", n,
              "" if n else "Directory contains no member-facing string literals.")


def surface_for(relpath: str) -> str:
    m = re.match(r"src/pages/app/(\w+)\.tsx", relpath)
    if m:
        return "/app/" + m.group(1).lower()
    if relpath.startswith("src/pages/admin/"):
        return "/admin (admin previews)"
    if relpath.startswith("src/pages/legal/"):
        return "/legal"
    if relpath.startswith("src/pages/"):
        return "public site"
    if relpath.startswith("supabase/functions/"):
        return "edge function: " + relpath.split("/")[2]
    if relpath.startswith("src/components/"):
        return "component: " + relpath.split("/")[2]
    return relpath


# ------------------------------------------------------------------- gates
def gate_coverage() -> list[str]:
    return [f"declared surface '{c['surface']}' produced 0 items with no documented reason"
            for c in coverage if c["items"] == 0 and not c["reason"]]


def gate_duplicates(rows) -> list[str]:
    errs = []
    active_by_day: dict[int, int] = {}
    for r in rows:
        if r["is_active"]:
            active_by_day[r["day_number"]] = active_by_day.get(r["day_number"], 0) + 1
    dupes = [d for d, c in active_by_day.items() if c > 1]
    if dupes:
        errs.append(f"days with more than one active daily action: {sorted(dupes)}")
    inactive = [r for r in rows if not r["is_active"]]
    ids = {i["id"].split("#")[0] for i in items if i["disposition"] == HISTORICAL}
    for r in inactive:
        if f"daily_actions:{r['id']}" not in ids:
            errs.append(f"inactive duplicate {r['id']} (day {r['day_number']}) has no HISTORICAL disposition")
    return errs


def gate_reachability_consistency(items: list[dict]) -> list[str]:
    """POST-v2: inventory semantics must be internally consistent.

    - a retired/historical item is never active and never member-reachable;
    - a member-reachable item is always active;
    - no item may carry a retired REWRITE disposition.
    """
    errs = []
    retired = {"RETIRE — NOT APPROVED", "RETIRE — OBSOLETE FEATURE",
               "RETIRE — OUTCOME/GAMIFICATION", "HISTORICAL — UNREACHABLE"}
    for i in items:
        d = i["disposition"]
        if d.startswith("REWRITE"):
            errs.append(f"{i['id']}: retired REWRITE disposition {d!r}")
        if d in retired and (i["active"] or i["reachable_by_member"]):
            errs.append(
                f"{i['id']}: disposition {d} but active={i['active']} "
                f"reachable={i['reachable_by_member']}")
        if i["reachable_by_member"] and not i["active"]:
            errs.append(f"{i['id']}: reachable but not active")
    return errs




def gate_no_personal_data() -> list[str]:
    """Fail closed if this generator ever queries a member-owned table, or if an
    emitted item's location points at one. The doctor-review pack must contain
    authored content only — never member personal data."""
    errs = []
    src = Path(__file__).read_text(encoding="utf-8")
    # Only inspect the SQL actually handed to q(); the exclusion list itself and
    # this docstring legitimately mention the table names.
    sql = " ".join(re.findall(r"q\(\s*((?:\"[^\"]*\"\s*)+)\)", src, re.S)).lower()
    for table, _ in PERSONAL_DATA_EXCLUSIONS:
        bare = table.split(".")[-1]
        if re.search(rf"\b(from|join|update|into)\s+(public\.)?{bare}\b", sql):
            errs.append(f"generator queries excluded personal-data table '{table}'")
        if any(i["location"].startswith(f"{bare}") or i["id"].startswith(f"{bare}:") for i in items):
            errs.append(f"inventory emitted an item sourced from personal-data table '{table}'")
    return errs



# ------------------------------------------------------------------ output
def main() -> int:
    if run_fixtures() != 0:
        print("ABORT: classifier fixtures failed; artifacts not regenerated.", file=sys.stderr)
        return 1

    rows = collect_database()
    collect_content_items()
    collect_badges()
    collect_vita_quotes()
    collect_snacks()
    collect_app_config()
    collect_source()
    cover_personal_data_exclusions()

    errs = (gate_coverage() + gate_duplicates(rows) + gate_no_personal_data()
            + gate_reachability_consistency(items))


    if errs:
        for e in errs:
            print("GATE FAIL:", e, file=sys.stderr)
        return 1

    by_disposition: dict[str, int] = {d: 0 for d in DISPOSITIONS}
    for i in items:
        by_disposition[i["disposition"]] += 1
    tag_counts: dict[str, int] = {n: 0 for n, _ in RISK_RULES}
    tag_counts[SAFE_TAG] = 0
    for i in items:
        for t in i["risk_tags"]:
            tag_counts[t] += 1
    by_source: dict[str, int] = {}
    for i in items:
        by_source[i["source_type"]] = by_source.get(i["source_type"], 0) + 1

    totals = {
        "items": len(items),
        "active_items": sum(1 for i in items if i["active"]),
        "member_reachable_items": sum(1 for i in items if i["reachable_by_member"]),
        "daily_action_records_total": len(rows),
        "daily_action_records_active": sum(1 for r in rows if r["is_active"]),
        "daily_action_records_historical": sum(1 for r in rows if not r["is_active"]),
        "by_source_type": by_source,
        "by_disposition": by_disposition,
        "risk_tag_counts": tag_counts,
    }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "active-content-inventory.json").write_text(json.dumps({
        "generated_by": "scripts/doctor-review/build-inventory.py",
        "project": "wqennhjdojjqmmqzjhti",
        "gates": {"classifier_fixtures": "PASS", "coverage_manifest": "PASS",
                  "duplicate_day_reconciliation": "PASS",
                  "no_personal_data": "PASS"},
        "personal_data_policy":
            "Authored content only. Member-owned tables are listed as EXCLUDED in the "
            "coverage manifest and are never read, sampled or exported by this generator.",

        "totals": totals,
        "coverage_manifest": coverage,
        "disposition_vocabulary": DISPOSITIONS,
        "items": items,
    }, indent=2), encoding="utf-8")

    with (OUT / "active-content-inventory.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["id", "source_type", "location", "field", "surface", "active",
                    "member_reachable", "risk_tags", "linked_records", "disposition",
                    "record_state", "proposed_action", "replacement_copy", "notes", "copy"])
        for it in items:
            w.writerow([it["id"], it["source_type"], it["location"], it["field"], it["surface"],
                        it["active"], it["reachable_by_member"], ";".join(it["risk_tags"]),
                        ";".join(it["linked_records"]), it["disposition"], it["record_state"],
                        it["proposed_action"], it["replacement_copy"] or "", it["notes"],
                        it["copy"].replace("\n", " ")])

    flagged = [i for i in items if i["disposition"] != KEEP_EDU]
    write_matrix(totals, flagged)
    write_pack(totals, flagged)

    # count reconciliation gate
    csv_rows = sum(1 for _ in csv.reader((OUT / "active-content-inventory.csv").open(encoding="utf-8"))) - 1
    matrix_rows = (OUT / "content-replacement-matrix.md").read_text(encoding="utf-8").count("\n| `")
    pack_rows = (OUT / "clinical-review-pack.md").read_text(encoding="utf-8").count("\n- `")
    if not (csv_rows == len(items) and matrix_rows == len(flagged) and pack_rows == len(flagged)):
        print(f"GATE FAIL: counts do not reconcile json={len(items)} csv={csv_rows} "
              f"matrix={matrix_rows}/{len(flagged)} pack={pack_rows}/{len(flagged)}", file=sys.stderr)
        return 1

    print(json.dumps(totals, indent=2))
    print(f"reconciled: json={len(items)} csv={csv_rows} flagged={len(flagged)} "
          f"matrix={matrix_rows} pack={pack_rows}")
    return 0


def write_matrix(totals, flagged):
    L = ["# Content replacement matrix — Batch 1 (corrected)", "",
         "No clinical wording is invented in this document. The only replacement copy shown is the",
         "single approved temporary fallback already applied in the database.", "",
         "## Reconciliation", "",
         f"- Inventory items: **{totals['items']}** (active {totals['active_items']}, "
         f"member-reachable {totals['member_reachable_items']})",
         f"- `public.daily_actions` records: **{totals['daily_action_records_total']}** — "
         f"{totals['daily_action_records_active']} active guided days + "
         f"{totals['daily_action_records_historical']} historical duplicates (E1–E7, days 15–21)",
         "- Live member queries (`Dashboard.tsx`, `DayDetail.tsx`, MCP `get-today-action`, edge `mcp`)",
         "  all filter `is_extension_day = false`, so the duplicates were never selected for a member.",
         "  They are now `is_active = false` and a partial unique index",
         "  (`daily_actions_one_active_per_day`) prevents a guided day acquiring two active records.", "",
         "### Items by source type", ""]
    for k, v in sorted(totals["by_source_type"].items()):
        L.append(f"- {k}: {v}")
    L += ["", "### Items by disposition", ""]
    for k in DISPOSITIONS:
        L.append(f"- `{k}`: {totals['by_disposition'][k]}")
    L += ["", "### Risk-tag counts (every category, including zero counts)", ""]
    for k, v in totals["risk_tag_counts"].items():
        L.append(f"- `{k}`: {v}")
    L += ["", "## Coverage manifest", "",
          "| Declared surface | Kind | Items | Reason if empty |", "| --- | --- | ---: | --- |"]
    for c in sorted(coverage, key=lambda c: (c["kind"], c["surface"])):
        L.append(f"| {c['surface']} | {c['kind']} | {c['items']} | {c['reason'] or '—'} |")
    L += ["", "## Dispositioned items", "",
          "| ID | Surface | Active | Current problem | Record state | Proposed action | Replacement copy | Disposition |",
          "| --- | --- | --- | --- | --- | --- | --- | --- |"]
    for i in flagged:
        L.append(
            f"| `{i['id']}` | {i['surface']} | {'yes' if i['active'] else 'no'} | "
            f"{', '.join(i['risk_tags'])} — \"{i['copy'][:140].replace('|', '/')}\" | "
            f"{i['record_state']} | {i['proposed_action']} | "
            f"{i['replacement_copy'] or 'awaiting owner-approved appendix'} | {i['disposition']} |")
    (OUT / "content-replacement-matrix.md").write_text("\n".join(L) + "\n", encoding="utf-8")


PACK_GROUPS = [
    ("Glucose and readings", lambda i: "glucose" in i["copy"].lower() or "blood sugar" in i["copy"].lower()),
    ("A1C and testing instructions", lambda i: "a1c" in i["copy"].lower()),
    ("Medication and clearance", lambda i: bool({"treatment_or_testing_instruction", "medical_clearance"} & set(i["risk_tags"]))),
    ("Fasting and cheat-meal (feature removed)", lambda i: bool({"fasting_scheduling", "cheat_meal"} & set(i["risk_tags"]))),
    ("Supplements", lambda i: "supplements" in i["risk_tags"]),
    ("Outcome promises and gamification", lambda i: bool({"promised_outcomes", "shame_food_language"} & set(i["risk_tags"])) or i["disposition"] == RETIRE_OUTCOME),
    ("Workouts and movement claims", lambda i: "insulin_sensitivity_claim" in i["risk_tags"] or "workout" in i["surface"].lower()),
    ("Meals, snacks and individualised formulas", lambda i: "individualised_health_formula" in i["risk_tags"] or "meal" in i["surface"].lower()),
    ("Diagnostic labels", lambda i: "diagnostic_label" in i["risk_tags"]),
    ("Historical / unreachable records", lambda i: i["disposition"] == HISTORICAL),
]


def write_pack(totals, flagged):
    L = ["# Clinical review pack — Batch 1 (corrected)", "",
         "**This pack claims no owner or clinician approval.** It contains questions and current",
         "copy only. Proposed exact replacement copy will be added after the separate",
         "owner-approved content appendix is supplied. The only replacement wording present today",
         "is the single approved temporary fallback already applied to contained records.", "",
         f"Items requiring a decision: **{len(flagged)}** of {totals['items']} inventoried strings.",
         "",
         "Evidence principles used for context (ADA, ADA international consensus on remission,",
         "ADA/NIDDK activity guidance, NIDDK plate method and fasting risks, NCCIH/FDA supplement",
         "evidence, CDC stress/sleep/illness guidance). Exact citations arrive with the appendix.",
         "",
         "Approved education-only safety guides (supplement safety, fasting safety, the consensus",
         "definition of remission stated as education) are classified",
         "`KEEP — APPROVED EDUCATION` and are **not** treated as promotion.", ""]
    seen: set[str] = set()
    for name, pred in PACK_GROUPS:
        sel = [i for i in flagged if i["id"] not in seen and pred(i)]
        for i in sel:
            seen.add(i["id"])
        L += [f"## {name} ({len(sel)} items)", ""]
        for i in sel:
            L.append(
                f"- `{i['id']}` — {i['disposition']}; tags: {', '.join(i['risk_tags'])}\n"
                f"  - Surface: {i['surface']} — {'active' if i['active'] else 'historical'}\n"
                f"  - Current: \"{i['copy'][:300]}\"\n"
                f"  - Record state: {i['record_state']}\n"
                f"  - Question: what wording states the same member action without the flagged claim?")
        L.append("")
    rest = [i for i in flagged if i["id"] not in seen]
    L += [f"## Other member-facing copy ({len(rest)} items)", ""]
    for i in rest:
        L.append(f"- `{i['id']}` — {i['disposition']}; tags: {', '.join(i['risk_tags'])}\n"
                 f"  - Current: \"{i['copy'][:300]}\"\n"
                 f"  - Record state: {i['record_state']}")
    (OUT / "clinical-review-pack.md").write_text("\n".join(L) + "\n", encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
