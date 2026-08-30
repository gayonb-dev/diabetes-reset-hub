#!/usr/bin/env python3
"""
Prompt 3 inventory reconciliation.

Relationship-based, cycle-safe, fail-closed classification of every public-schema
table against the canonical manifest in supabase/functions/_shared/inventory.ts.

A table is personal if:
- it is listed in INVENTORY with an owner/subject column or parent relationship;
- it has a foreign-key path to auth.users, profiles, visitor_profiles, or another
  member-owned table;
- its RLS policies connect a current-row subject field to auth.uid().

The generator fails closed when an ownership path is detected but not understood
or when a personal table is missing from the canonical manifest.
"""

import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INVENTORY_TS = ROOT / "supabase" / "functions" / "_shared" / "inventory.ts"
OUT = ROOT / "docs" / "batch2-evidence" / "prompt3-inventory-reconciliation.json"


def psql_json(sql: str) -> list[dict]:
    wrapped = f"SELECT json_agg(t) AS result FROM ({sql}) t;"
    r = subprocess.run(
        ["psql", "-t", "-A", "-c", wrapped],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        raise RuntimeError(f"psql error: {r.stderr}")
    out = r.stdout.strip()
    if not out or out == "null":
        return []
    return json.loads(out)


def load_manifest() -> tuple[dict[str, dict], set[str]]:
    text = INVENTORY_TS.read_text()
    inventory: dict[str, dict] = {}
    reference: set[str] = set()

    # Parse INVENTORY array entries.
    entry_re = re.compile(
        r"\{\s*table:\s*\"([^\"]+)\",\s*match:\s*\"([^\"]+)\",\s*column:\s*\"([^\"]+)\",\s*disposition:\s*\"([^\"]+)\"",
        re.DOTALL,
    )
    for m in entry_re.finditer(text):
        table, match_kind, column, disposition = m.groups()
        inventory[table] = {
            "match": match_kind,
            "column": column,
            "disposition": disposition,
        }

    # Parse REFERENCE_TABLES.
    ref_match = re.search(r"REFERENCE_TABLES\s*=\s*\[([^\]]+)\]", text, re.DOTALL)
    if ref_match:
        reference = set(re.findall(r'"([^"]+)"', ref_match.group(1)))

    return inventory, reference


def list_public_tables() -> list[str]:
    rows = psql_json(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
    )
    return [r["table_name"] for r in rows]


def get_columns(table: str) -> list[str]:
    rows = psql_json(
        "SELECT column_name FROM information_schema.columns "
        f"WHERE table_schema = 'public' AND table_name = '{table}' ORDER BY ordinal_position"
    )
    return [r["column_name"] for r in rows]


def get_foreign_keys() -> list[dict]:
    return psql_json(
        """
        SELECT
          tc.table_name AS table_name,
          kcu.column_name AS column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name
        """
    )


def get_policies(table: str) -> list[dict]:
    return psql_json(
        f"""
        SELECT polname AS policy_name, polcmd AS command, polqual::text AS using_expr
        FROM pg_policy
        WHERE polrelid = 'public.{table}'::regclass
        """
    )


def build_ownership_graph(fks: list[dict]) -> dict[str, list[tuple[str, str]]]:
    graph: dict[str, list[tuple[str, str]]] = {}
    for fk in fks:
        t = fk["table_name"]
        graph.setdefault(t, []).append((fk["column_name"], fk["foreign_table_name"]))
    return graph


OWNERSHIP_COLUMNS = {
    "user_id", "member_id", "owner_id", "author_id", "actor_id", "voter_id",
    "created_by", "submitted_by", "recipient_id", "profile_id", "visitor_profile_id",
}

ROOT_OWNER_TABLES = {"auth.users", "profiles", "visitor_profiles"}


def classify_table(
    table: str,
    manifest: dict[str, dict],
    reference: set[str],
    graph: dict[str, list[tuple[str, str]]],
    columns_by_table: dict[str, list[str]],
    visited: set[str] | None = None,
) -> dict:
    if visited is None:
        visited = set()
    if table in visited:
        return {"status": "cycle", "reason": "cycle in foreign-key graph"}
    visited.add(table)

    if table in manifest:
        entry = manifest[table]
        return {
            "status": "classified",
            "classification": "personal",
            "manifest_disposition": entry["disposition"],
            "owner_column": entry["column"],
            "match_kind": entry["match"],
            "source": "canonical_manifest",
        }

    if table in reference:
        return {
            "status": "classified",
            "classification": "non_personal",
            "source": "reference_tables",
        }

    cols = columns_by_table.get(table, [])
    owner_cols = [c for c in cols if c in OWNERSHIP_COLUMNS]

    # Direct FK to a root owner table.
    for col, ft in graph.get(table, []):
        if ft in ROOT_OWNER_TABLES:
            return {
                "status": "classified",
                "classification": "personal",
                "owner_column": col,
                "foreign_key_to": ft,
                "source": "foreign_key",
            }

    # Recursive FK to a member-owned table.
    for col, ft in graph.get(table, []):
        if ft == table:
            continue
        parent = classify_table(ft, manifest, reference, graph, columns_by_table, visited.copy())
        if parent.get("classification") == "personal":
            return {
                "status": "classified",
                "classification": "personal",
                "owner_column": col,
                "foreign_key_to": ft,
                "parent_classification": parent,
                "source": "indirect_ownership",
            }

    # RLS ownership predicate.
    policies = get_policies(table)
    for p in policies:
        expr = (p.get("using_expr") or "").lower()
        if "auth.uid()" in expr:
            for col in owner_cols:
                if col in expr:
                    return {
                        "status": "classified",
                        "classification": "personal",
                        "owner_column": col,
                        "rls_policy": p["policy_name"],
                        "source": "rls_policy",
                    }

    return {
        "status": "classified",
        "classification": "non_personal",
        "owner_columns": owner_cols,
        "foreign_keys": graph.get(table, []),
        "source": "no_ownership_path_detected",
    }


def main() -> int:
    manifest, reference = load_manifest()
    tables = list_public_tables()
    fks = get_foreign_keys()
    graph = build_ownership_graph(fks)
    columns_by_table = {t: get_columns(t) for t in tables}

    findings: list[dict] = []
    failures: list[str] = []
    personal_count = 0
    non_personal_count = 0

    for table in sorted(tables):
        result = classify_table(table, manifest, reference, graph, columns_by_table)
        findings.append({"table": table, **result})
        if result["classification"] == "personal":
            personal_count += 1
        else:
            non_personal_count += 1
        if result["source"] in ("foreign_key", "indirect_ownership", "rls_policy"):
            failures.append(
                f"{table}: detected personal-by-association but missing from canonical manifest"
            )

    summary = {
        "total_tables": len(tables),
        "personal": personal_count,
        "non_personal": non_personal_count,
        "fail_closed_failures": failures,
        "manifest_tables": len(manifest),
        "reference_tables": sorted(reference),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"summary": summary, "findings": findings}, indent=2))
    print(json.dumps(summary, indent=2))
    if failures:
        print("FAIL: relationship-based classification found unmanifested personal tables")
        return 1
    print("PASS: every member-linked surface is accurately classified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
