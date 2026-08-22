#!/usr/bin/env python3
"""Batch 1 POST-v2 — live database content scan.

Scans every declared database-managed content surface and reports banned
content two ways: distinct records and individual field strings.
Reads only content tables; never member-owned health/profile/billing data.
"""
from __future__ import annotations

import json
import subprocess
import sys
from collections import defaultdict

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from banned import scan_text  # noqa: E402

# Declared coverage manifest: table -> (text columns, json-array columns,
# active predicate, reason when empty).
SURFACES = {
    "daily_actions": {
        "text": ["day_name", "action_title", "action_description", "learning_objective"],
        "jsonarr": ["sub_tasks"],
        "active": "is_active",
        "id": "id",
        "label": "day_number",
    },
    "vita_quotes": {
        "text": ["quote_text"], "jsonarr": [], "active": "is_active",
        "id": "id", "label": "category",
    },
    "content_items": {
        "text": ["title", "summary", "body"], "jsonarr": [], "active": "is_published",
        "id": "id", "label": "content_type",
    },
    "badges": {
        "text": ["name", "description", "unlock_hint"], "jsonarr": [],
        "active": "NOT is_retired", "id": "id", "label": "slug",
    },
    "snack_library": {
        "text": ["name", "description"], "jsonarr": [], "active": "is_active",
        "id": "id", "label": "name",
    },
    "app_config": {
        "text": ["key"], "jsonarr": [], "active": "true", "id": "key", "label": "key",
    },
}


def q(sql: str) -> list[dict]:
    out = subprocess.run(
        ["psql", "-At", "-c", f"COPY ({sql}) TO STDOUT"],
        capture_output=True, text=True, check=True).stdout
    return [json.loads(line) for line in out.splitlines() if line.strip()]


def columns(table: str) -> set[str]:
    rows = q(f"SELECT json_build_object('c', column_name) FROM information_schema.columns "
             f"WHERE table_schema='public' AND table_name='{table}'")
    return {r["c"] for r in rows}


def scan() -> dict:
    result = {"surfaces": {}, "totals": {"records_scanned": 0, "field_strings_scanned": 0}}
    by_cat_records: dict[str, set] = defaultdict(set)
    by_cat_fields: dict[str, int] = defaultdict(int)
    detail = []

    for table, spec in SURFACES.items():
        cols = columns(table)
        text_cols = [c for c in spec["text"] if c in cols]
        json_cols = [c for c in spec["jsonarr"] if c in cols]
        if not text_cols and not json_cols:
            result["surfaces"][table] = {
                "records": 0, "field_strings": 0,
                "reason_empty": "no declared text columns present in schema"}
            continue
        sel = ", ".join(
            [f"'{spec['id']}', {spec['id']}::text", f"'label', {spec['label']}::text",
             f"'active', ({spec['active']})::text"]
            + [f"'{c}', {c}::text" for c in text_cols]
            + [f"'{c}', {c}::text" for c in json_cols])
        rows = q(f"SELECT json_build_object({sel}) FROM public.{table}")
        active_records = 0
        field_strings = 0
        for r in rows:
            is_active = (r.get("active") or "").lower() in ("t", "true")
            rid = r[spec["id"]]
            strings: list[tuple[str, str]] = []
            for c in text_cols:
                if r.get(c):
                    strings.append((c, r[c]))
            for c in json_cols:
                try:
                    arr = json.loads(r.get(c) or "[]")
                except Exception:
                    arr = []
                for i, el in enumerate(arr if isinstance(arr, list) else []):
                    if isinstance(el, str) and el:
                        strings.append((f"{c}[{i}]", el))
                    elif isinstance(el, dict):
                        for k, v in el.items():
                            if isinstance(v, str) and v:
                                strings.append((f"{c}[{i}].{k}", v))
            if is_active:
                active_records += 1
                field_strings += len(strings)
            for field, text in strings:
                cats = scan_text(text)
                if cats and is_active:
                    for cat in cats:
                        by_cat_records[cat].add((table, rid))
                        by_cat_fields[cat] += 1
                    detail.append({"table": table, "id": rid, "label": r.get("label"),
                                   "field": field, "categories": cats,
                                   "text": text[:300]})
        result["surfaces"][table] = {"records": active_records, "field_strings": field_strings}
        result["totals"]["records_scanned"] += active_records
        result["totals"]["field_strings_scanned"] += field_strings

    result["by_category"] = {
        c: {"records": len(by_cat_records[c]), "field_strings": by_cat_fields[c]}
        for c in sorted(set(by_cat_records) | set(by_cat_fields))
    }
    result["hits"] = detail
    return result


if __name__ == "__main__":
    res = scan()
    print(json.dumps(res, indent=1))
