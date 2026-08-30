#!/usr/bin/env python3
"""
Prompt 3 inventory reconciliation.

Relationship-based, cycle-safe, fail-closed classification of every public-schema
table against the canonical manifest in supabase/functions/_shared/inventory.ts.

The manifest is loaded STRUCTURALLY (the real module is executed and dumped to
JSON by tools/batch2/dump_inventory.ts). Source-text regex parsing is not used,
because it silently missed multi-line entries in the previous run and produced a
manifest that disagreed with runtime behaviour.

Independent ownership evidence is collected for EVERY table, including tables the
manifest claims are non-personal. A table is personal when any of these hold:
  - it carries a subject column (user_id / member_id / author_id / ...);
  - it has a foreign-key path to auth.users, profiles, visitor_profiles or to
    another table that is itself personal (cycle-safe traversal);
  - an RLS policy connects a current-row subject column to auth.uid().

Ownership (whose row is it) is kept separate from audience (who may read it):
predicates such as has_role(...), membership_access_state(...) or
member_access_allowed() grant access to a class of readers and are NOT ownership.

The run FAILS CLOSED when:
  - a table with ownership evidence is listed in REFERENCE_TABLES;
  - a table with ownership evidence is absent from the manifest;
  - a table appears in neither the manifest nor REFERENCE_TABLES;
  - a manifest entry names a column the table does not have.

Run with --self-test to execute the negative fixtures without touching the database.
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DUMPER = Path(__file__).resolve().parent / "dump_inventory.ts"
OUT = ROOT / "docs" / "batch2-evidence" / "prompt3-inventory-reconciliation.json"

OWNERSHIP_COLUMNS = {
    "user_id", "member_id", "owner_id", "author_id", "actor_id", "actor_user_id",
    "voter_id", "created_by", "submitted_by", "recipient_id", "profile_id",
    "visitor_profile_id", "subject_ref",
}

ROOT_OWNER_TABLES = {"users", "profiles", "visitor_profiles"}

# Predicates that describe an AUDIENCE (entitlement / role), not row ownership.
AUDIENCE_PREDICATES = (
    "has_role(", "membership_access_state(", "member_access_allowed(",
    "member_write_allowed(", "membership_write_allowed(",
)


# --------------------------------------------------------------------------
# catalogue access
# --------------------------------------------------------------------------

def psql_json(sql: str) -> list[dict]:
    wrapped = f"SELECT json_agg(t) AS result FROM ({sql}) t;"
    r = subprocess.run(["psql", "-t", "-A", "-c", wrapped], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"psql error: {r.stderr}")
    out = r.stdout.strip()
    if not out or out == "null":
        return []
    return json.loads(out)


def load_manifest() -> tuple[dict[str, dict], set[str], dict]:
    r = subprocess.run(["bun", "run", str(DUMPER)], capture_output=True, text=True, cwd=str(ROOT))
    if r.returncode != 0:
        raise RuntimeError(f"manifest load failed: {r.stderr}")
    dump = json.loads(r.stdout)
    manifest = {e["table"]: e for e in dump["inventory"]}
    if len(manifest) != len(dump["inventory"]):
        raise RuntimeError("duplicate table entries in canonical manifest")
    return manifest, set(dump["reference_tables"]), dump


def load_catalog() -> dict:
    tables = [
        r["table_name"] for r in psql_json(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
        )
    ]
    cols_rows = psql_json(
        "SELECT table_name, column_name FROM information_schema.columns "
        "WHERE table_schema = 'public' ORDER BY table_name, ordinal_position"
    )
    columns: dict[str, list[str]] = {t: [] for t in tables}
    for r in cols_rows:
        columns.setdefault(r["table_name"], []).append(r["column_name"])

    fk_rows = psql_json(
        """
        SELECT c.conrelid::regclass::text AS table_name,
               a.attname                  AS column_name,
               c.confrelid::regclass::text AS foreign_table
        FROM pg_constraint c
        JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
        WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
        """
    )
    fks: dict[str, list[dict]] = {t: [] for t in tables}
    for r in fk_rows:
        t = r["table_name"].replace("public.", "")
        ft = r["foreign_table"].split(".")[-1]
        fks.setdefault(t, []).append({"column": r["column_name"], "foreign_table": ft})

    pol_rows = psql_json(
        """
        SELECT c.relname AS table_name, p.polname AS policy_name,
               COALESCE(pg_get_expr(p.polqual, p.polrelid), '') AS using_expr,
               COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') AS check_expr
        FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
        WHERE c.relnamespace = 'public'::regnamespace
        """
    )
    policies: dict[str, list[dict]] = {t: [] for t in tables}
    for r in pol_rows:
        policies.setdefault(r["table_name"], []).append(r)

    return {"tables": tables, "columns": columns, "fks": fks, "policies": policies}


# --------------------------------------------------------------------------
# pure classification (unit-testable, no I/O)
# --------------------------------------------------------------------------

def ownership_evidence(table: str, catalog: dict, manifest: dict, _stack: tuple = ()) -> list[dict]:
    """Independent, cycle-safe ownership evidence for one table."""
    if table in _stack:  # cycle: stop, evidence already reported higher up
        return []
    stack = _stack + (table,)
    ev: list[dict] = []

    for col in catalog["columns"].get(table, []):
        if col in OWNERSHIP_COLUMNS:
            ev.append({"kind": "subject_column", "column": col})

    for fk in catalog["fks"].get(table, []):
        ft = fk["foreign_table"]
        if ft in ROOT_OWNER_TABLES:
            ev.append({"kind": "fk_to_owner_root", "column": fk["column"], "foreign_table": ft})
        elif ft != table:
            if ft in manifest or ownership_evidence(ft, catalog, manifest, stack):
                ev.append({"kind": "fk_to_personal_table", "column": fk["column"], "foreign_table": ft})

    subject_cols = {c for c in catalog["columns"].get(table, []) if c in OWNERSHIP_COLUMNS}
    for p in catalog["policies"].get(table, []):
        expr = f"{p.get('using_expr','')} {p.get('check_expr','')}".lower()
        if "auth.uid()" not in expr:
            continue
        stripped = expr
        for pred in AUDIENCE_PREDICATES:
            stripped = stripped.replace(pred.lower(), " audience_predicate( ")
        for col in subject_cols:
            if col in stripped:
                ev.append({"kind": "rls_subject_predicate", "column": col, "policy": p["policy_name"]})
                break
    return ev


def classify(catalog: dict, manifest: dict[str, dict], reference: set[str]) -> tuple[list[dict], list[str]]:
    findings: list[dict] = []
    failures: list[str] = []

    for table in sorted(catalog["tables"]):
        ev = ownership_evidence(table, catalog, manifest)
        in_manifest = table in manifest
        in_reference = table in reference
        cols = catalog["columns"].get(table, [])

        if in_manifest and in_reference:
            failures.append(f"{table}: listed in BOTH the manifest and REFERENCE_TABLES")

        if in_manifest:
            entry = manifest[table]
            classification = "personal"
            source = "canonical_manifest"
            if entry["match"] != "order_ownership" and entry["column"] not in cols:
                failures.append(
                    f"{table}: manifest column '{entry['column']}' does not exist on the table"
                )
            if entry["match"] == "parent":
                pt, pc = entry.get("parentTable"), entry.get("parentOwnerColumn")
                if not pt or pt not in catalog["tables"] or pc not in catalog["columns"].get(pt, []):
                    failures.append(f"{table}: parent relationship {pt}.{pc} is not resolvable")
            detail = {
                "manifest_disposition": entry["disposition"],
                "match_kind": entry["match"],
                "owner_column": entry["column"],
            }
        elif in_reference:
            classification = "non_personal"
            source = "reference_tables"
            detail = {}
            if ev:
                failures.append(
                    f"{table}: declared non-personal but ownership evidence exists "
                    f"({', '.join(sorted({e['kind'] for e in ev}))})"
                )
        else:
            classification = "unclassified"
            source = "not_covered"
            detail = {}
            failures.append(
                f"{table}: covered by neither the canonical manifest nor REFERENCE_TABLES"
                + (" and it carries ownership evidence" if ev else "")
            )

        findings.append({
            "table": table,
            "classification": classification,
            "source": source,
            "independent_ownership_evidence": ev,
            **detail,
        })

    return findings, failures


# --------------------------------------------------------------------------
# negative fixtures
# --------------------------------------------------------------------------

def _cat(tables, columns, fks=None, policies=None) -> dict:
    return {
        "tables": tables,
        "columns": columns,
        "fks": fks or {t: [] for t in tables},
        "policies": policies or {t: [] for t in tables},
    }


def self_test() -> int:
    results = []

    def check(name, cond):
        results.append((name, bool(cond)))

    # 1. parent-owned notes wrongly declared non-personal must FAIL.
    cat = _cat(
        ["support_tickets", "support_ticket_notes"],
        {"support_tickets": ["id", "user_id"], "support_ticket_notes": ["id", "ticket_id", "body"]},
        {"support_tickets": [], "support_ticket_notes": [{"column": "ticket_id", "foreign_table": "support_tickets"}]},
    )
    _, f = classify(cat, {"support_tickets": {"table": "support_tickets", "match": "user_id", "column": "user_id", "disposition": "export_and_delete"}}, {"support_ticket_notes"})
    check("parent-owned note declared non-personal fails", any("support_ticket_notes" in x for x in f))

    # 2. table with user_id missing from the manifest must FAIL.
    cat = _cat(["billing_holds"], {"billing_holds": ["id", "user_id"]})
    _, f = classify(cat, {}, set())
    check("unmanifested user_id table fails", any("billing_holds" in x for x in f))

    # 3. derived table FK'd to a personal parent, declared reference, must FAIL.
    cat = _cat(
        ["community_answers", "community_answer_embeddings"],
        {"community_answers": ["id", "author_id"], "community_answer_embeddings": ["id", "answer_id"]},
        {"community_answers": [], "community_answer_embeddings": [{"column": "answer_id", "foreign_table": "community_answers"}]},
    )
    _, f = classify(cat, {"community_answers": {"table": "community_answers", "match": "author_id", "column": "author_id", "disposition": "export_and_delete"}}, {"community_answer_embeddings"})
    check("derived embedding declared reference fails", any("community_answer_embeddings" in x for x in f))

    # 4. entitlement-only RLS is audience, not ownership: PASSES as non-personal.
    cat = _cat(
        ["content_items"], {"content_items": ["id", "title"]},
        policies={"content_items": [{"policy_name": "members read", "using_expr": "member_access_allowed() AND auth.uid() IS NOT NULL", "check_expr": ""}]},
    )
    _, f = classify(cat, {}, {"content_items"})
    check("entitlement-only RLS stays non-personal", not f)

    # 5. cyclic foreign keys terminate.
    cat = _cat(
        ["a", "b"], {"a": ["id", "b_id"], "b": ["id", "a_id"]},
        {"a": [{"column": "b_id", "foreign_table": "b"}], "b": [{"column": "a_id", "foreign_table": "a"}]},
    )
    _, f = classify(cat, {}, {"a", "b"})
    check("cyclic FK graph terminates", isinstance(f, list))

    # 6. manifest column that does not exist must FAIL.
    cat = _cat(["water_logs"], {"water_logs": ["id", "user_id"]})
    _, f = classify(cat, {"water_logs": {"table": "water_logs", "match": "member_id", "column": "member_id", "disposition": "export_and_delete"}}, set())
    check("manifest column mismatch fails", any("does not exist" in x for x in f))

    ok = all(p for _, p in results)
    for name, passed in results:
        print(f"{'PASS' if passed else 'FAIL'}  {name}")
    print(f"self-test: {'PASS' if ok else 'FAIL'} ({sum(p for _, p in results)}/{len(results)})")
    return 0 if ok else 1


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()

    manifest, reference, dump = load_manifest()
    catalog = load_catalog()
    findings, failures = classify(catalog, manifest, reference)

    summary = {
        "generator": "tools/batch2/prompt3_reconcile.py",
        "manifest_source": "structural module load via tools/batch2/dump_inventory.ts",
        "total_tables": len(catalog["tables"]),
        "personal": sum(1 for f in findings if f["classification"] == "personal"),
        "non_personal": sum(1 for f in findings if f["classification"] == "non_personal"),
        "unclassified": sum(1 for f in findings if f["classification"] == "unclassified"),
        "manifest_tables": len(manifest),
        "reference_tables": sorted(reference),
        "exportable_tables": sorted(dump["exportable"]),
        "deletable_tables": sorted(dump["deletable"]),
        "fail_closed_failures": failures,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"summary": summary, "findings": findings}, indent=2))
    print(json.dumps(summary, indent=2))
    if failures:
        print("FAIL: fail-closed classification found unresolved surfaces")
        return 1
    print("PASS: every public table is accurately and independently classified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
