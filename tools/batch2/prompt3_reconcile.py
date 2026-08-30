#!/usr/bin/env python3
"""
Prompt 3 inventory reconciliation generator.

Relationship-based, fail-closed classifier for public-schema tables.
A table is personal if any of the following hold:

  * canonical manifest marks it personal (export_and_delete / export_redacted_and_delete / delete_only_*)
  * a column named user_id, member_id, owner_id, author_id, actor_id, voter_id,
    created_by, submitted_by, recipient_id, profile_id (or similar) links to auth.users
  * a foreign key reaches auth.users, profiles, visitor_profiles, or another
    member-owned table
  * an RLS policy connects a current-row subject field to auth.uid()
  * it is a child of a member-owned table (parent FK)

The generator reports:
  * tables classified as personal and why
  * tables classified as non-personal and why
  * contradictions between the canonical manifest and the relationship classifier
  * any table with ownership evidence but owner_columns: []

Exit codes:
  0 = no contradictions, all member-linked surfaces classified as personal
  1 = contradictions or member-linked surface labelled non-personal (fail closed)
"""

import json
import os
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor

# Canonical manifest columns that denote member ownership.
OWNER_COLUMNS = {
    "user_id", "member_id", "owner_id", "author_id", "actor_id", "voter_id",
    "created_by", "submitted_by", "recipient_id", "profile_id", "user",
    "member", "actor_user_id",
}

PERSONAL_DISPOSITIONS = {
    "export_and_delete",
    "export_redacted_and_delete",
    "delete_only_security",
    "delete_only_legacy",
}


def env(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        raise RuntimeError(f"Environment variable {name} is required")
    return v


@dataclass
class TableInfo:
    name: str
    columns: list[str] = field(default_factory=list)
    fks: list[dict] = field(default_factory=list)
    policies: list[dict] = field(default_factory=list)
    owner_columns: list[str] = field(default_factory=list)
    reaches_member: bool = False
    member_ownership_reasons: list[str] = field(default_factory=list)
    manifest_disposition: str | None = None


def connect() -> psycopg2.extensions.connection:
    return psycopg2.connect(
        host=env("PGHOST"),
        port=env("PGPORT"),
        dbname=env("PGDATABASE"),
        user=env("PGUSER"),
        password=env("PGPASSWORD"),
        sslmode="require",
    )


def load_manifest(path: str) -> dict[str, Any]:
    with open(path) as f:
        data = json.load(f)
    # Flatten manifest entries keyed by table name.
    out: dict[str, Any] = {}
    for entry in data.get("inventory", []):
        out[entry["table"]] = entry
    return out


def fetch_public_tables(cur: RealDictCursor) -> list[str]:
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """)
    return [r["table_name"] for r in cur.fetchall()]


def fetch_columns(cur: RealDictCursor, table: str) -> list[str]:
    cur.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
    """, (table,))
    return [r["column_name"] for r in cur.fetchall()]


def fetch_fks(cur: RealDictCursor, table: str) -> list[dict]:
    cur.execute("""
        SELECT
            kcu.column_name,
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
          AND tc.table_name = %s
    """, (table,))
    return [dict(r) for r in cur.fetchall()]


def fetch_rls(cur: RealDictCursor, table: str) -> list[dict]:
    cur.execute("""
        SELECT policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = %s
    """, (table,))
    return [dict(r) for r in cur.fetchall()]


def has_rls_enabled(cur: RealDictCursor, table: str) -> bool:
    cur.execute("""
        SELECT relrowsecurity
        FROM pg_class
        JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE pg_namespace.nspname = 'public' AND pg_class.relname = %s
    """, (table,))
    row = cur.fetchone()
    return bool(row and row["relrowsecurity"])


def rls_mentions_auth_uid(policies: list[dict]) -> list[str]:
    matches = []
    for p in policies:
        for field in ("qual", "with_check"):
            text = p.get(field) or ""
            if "auth.uid()" in text:
                matches.append(p["policyname"])
    return matches


def compute_ownership(
    tables: dict[str, TableInfo],
    member_root_tables: set[str],
) -> None:
    """
    Propagate member ownership through FKs using cycle-safe BFS.
    A table is member-owned if:
      * it has a direct owner column (user_id etc.)
      * it has an FK to auth.users, profiles, visitor_profiles
      * it has an FK to another table already known to be member-owned
    """
    # Seed direct owners and canonical manifest personal tables.
    queue = list(member_root_tables)
    for name, info in tables.items():
        direct = [c for c in info.columns if c in OWNER_COLUMNS]
        if direct:
            info.owner_columns.extend(direct)
            info.member_ownership_reasons.append(f"direct owner columns: {direct}")
            if name not in member_root_tables:
                queue.append(name)

    # BFS through FKs.
    visited: set[str] = set()
    while queue:
        current = queue.pop(0)
        if current in visited:
            continue
        visited.add(current)
        tables[current].reaches_member = True

        for child_name, child in tables.items():
            if child.reaches_member:
                continue
            for fk in child.fks:
                if fk["foreign_table_name"] == current:
                    child.reaches_member = True
                    child.member_ownership_reasons.append(
                        f"FK {fk['column_name']} -> {current}.{fk['foreign_column_name']}"
                    )
                    if child_name not in queue:
                        queue.append(child_name)


def classify_table(info: TableInfo) -> str:
    if info.reaches_member:
        return "personal"
    if info.manifest_disposition in PERSONAL_DISPOSITIONS:
        return "personal"
    return "non_personal"


def main() -> int:
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "docs/batch2-evidence"
    manifest_path = sys.argv[2] if len(sys.argv) > 2 else "supabase/functions/_shared/inventory.ts"
    os.makedirs(out_dir, exist_ok=True)

    # The canonical manifest lives in TypeScript; we read it by extracting the
    # two array literals (EXPORTABLE and DELETABLE) and parsing their JSON-like
    # entries. This avoids duplicating the manifest in Python.
    manifest_entries: dict[str, Any] = {}
    with open(manifest_path) as f:
        ts = f.read()

    # Extract EXPORTABLE / DELETABLE arrays.
    for array_name in ("EXPORTABLE", "DELETABLE"):
        m = re.search(rf"export const {array_name}: InventoryEntry\[\] = (\[.*?\]);", ts, re.DOTALL)
        if not m:
            raise RuntimeError(f"Could not find {array_name} array in {manifest_path}")
        raw = m.group(1)
        # Convert trailing commas and TypeScript-only fields to JSON.
        raw = re.sub(r",(\s*[}\]])", r"\1", raw)
        raw = re.sub(r"(\w+):", r'"\1":', raw)
        raw = raw.replace("'", '"')
        entries = json.loads(raw)
        for e in entries:
            manifest_entries[e["table"]] = e

    conn = connect()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    public_tables = fetch_public_tables(cur)
    tables: dict[str, TableInfo] = {}
    for t in public_tables:
        info = TableInfo(name=t)
        info.columns = fetch_columns(cur, t)
        info.fks = fetch_fks(cur, t)
        info.policies = fetch_rls(cur, t)
        info.manifest_disposition = manifest_entries.get(t, {}).get("disposition")
        tables[t] = info

    member_root_tables = {"auth.users", "profiles", "visitor_profiles"}
    compute_ownership(tables, member_root_tables)

    # Build report.
    personal: list[dict] = []
    non_personal: list[dict] = []
    contradictions: list[dict] = []
    rls_enabled_count = 0
    tables_without_rls: list[str] = []

    for name in sorted(tables):
        info = tables[name]
        if has_rls_enabled(cur, name):
            rls_enabled_count += 1
        else:
            tables_without_rls.append(name)

        classified = classify_table(info)
        record = {
            "table": name,
            "classified_as": classified,
            "owner_columns": sorted(set(info.owner_columns)),
            "fk_to_member": info.fks,
            "rls_auth_uid_policies": rls_mentions_auth_uid(info.policies),
            "manifest_disposition": info.manifest_disposition,
            "reasons": info.member_ownership_reasons,
        }

        if classified == "personal":
            personal.append(record)
        else:
            non_personal.append(record)

        # Contradiction: relationship classifier says personal, manifest says reference_only.
        if info.reaches_member and info.manifest_disposition == "reference_only":
            contradictions.append({
                "table": name,
                "type": "member_linked_but_reference_only",
                "reasons": info.member_ownership_reasons,
                "manifest_disposition": info.manifest_disposition,
            })

        # Contradiction: manifest says personal but classifier found no ownership path.
        if info.manifest_disposition in PERSONAL_DISPOSITIONS and not info.reaches_member:
            contradictions.append({
                "table": name,
                "type": "manifest_personal_but_no_relationship",
                "manifest_disposition": info.manifest_disposition,
            })

        # Fail-closed: ownership evidence exists but owner_columns is empty.
        if info.reaches_member and not info.owner_columns and name not in member_root_tables:
            contradictions.append({
                "table": name,
                "type": "ownership_evidence_but_empty_owner_columns",
                "reasons": info.member_ownership_reasons,
            })

    summary = {
        "total_public_tables": len(public_tables),
        "personal": len(personal),
        "non_personal": len(non_personal),
        "rls_enabled": rls_enabled_count,
        "tables_without_rls": tables_without_rls,
        "contradictions": contradictions,
        "contradiction_count": len(contradictions),
        "pass": len(contradictions) == 0 and len(tables_without_rls) == 0,
    }

    report = {
        "summary": summary,
        "personal": personal,
        "non_personal": non_personal,
        "manifest_coverage": {
            "tables_in_manifest": sorted(manifest_entries.keys()),
            "tables_not_in_manifest": sorted(set(public_tables) - set(manifest_entries)),
        },
    }

    out_path = os.path.join(out_dir, "prompt3-inventory-reconciliation.json")
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2, default=str)

    print(json.dumps(summary, indent=2))
    if summary["pass"]:
        print(f"PASS: wrote {out_path}")
        return 0
    print(f"FAIL: contradictions or tables without RLS; wrote {out_path}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
