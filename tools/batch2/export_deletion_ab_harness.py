#!/usr/bin/env python3
"""
Synthetic A/B export/deletion harness.

Creates two isolated members (A = deletion subject, B = untouched control)
using the existing temporary batch2-harness Edge Function, seeds every corrected
Prompt 3 surface via direct database access, runs the real export and account-
deletion state machine for A, verifies B's records remain, and cleans every
synthetic record by exact ID.

This script runs locally with service-authorized credentials and does not deploy
a production test endpoint. No real email, Stripe, Resend, Dexcom or external-AI
calls are made.
"""

import hashlib
import json
import os
import sys
import time
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

import psycopg2
import requests
from psycopg2.extras import RealDictCursor

SUPABASE_URL = os.environ["SUPABASE_URL"]
ANON_KEY = os.environ["VITE_SUPABASE_ANON_KEY"] or os.environ["SUPABASE_PUBLISHABLE_KEY"]
HARNESS_SECRET = os.environ["BATCH2_HARNESS_SECRET_V2"] or os.environ["BATCH2_HARNESS_SECRET"]
INTERNAL_SECRET = os.environ["INTERNAL_FUNCTION_SECRET"]


def pg_conn() -> psycopg2.extensions.connection:
    return psycopg2.connect(
        host=os.environ["PGHOST"],
        port=os.environ["PGPORT"],
        dbname=os.environ["PGDATABASE"],
        user=os.environ["PGUSER"],
        password=os.environ["PGPASSWORD"],
        sslmode=os.environ.get("PGSSLMODE", "require"),
    )


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def harness(action: str, body: dict | None = None) -> dict:
    payload = {"action": action, **(body or {})}
    r = requests.post(
        f"{SUPABASE_URL}/functions/v1/batch2-harness",
        headers={"x-harness-secret": HARNESS_SECRET, "Content-Type": "application/json"},
        json=payload,
    )
    r.raise_for_status()
    return r.json()


def function_post(name: str, body: dict, headers: dict) -> dict:
    r = requests.post(
        f"{SUPABASE_URL}/functions/v1/{name}",
        headers={**headers, "Content-Type": "application/json"},
        json=body,
    )
    try:
        r.raise_for_status()
    except requests.HTTPError:
        print(f"function {name} failed: {r.status_code} {r.text}")
        raise
    return r.json()


def function_get(url: str) -> requests.Response:
    return requests.get(url, timeout=30)


class Harness:
    def __init__(self) -> None:
        self.a: dict[str, Any] = {}
        self.b: dict[str, Any] = {}
        self.ids: dict[str, list[str]] = {}
        self.results: dict[str, Any] = {}
        self.conn = pg_conn()
        self.cur = self.conn.cursor(cursor_factory=RealDictCursor)

    def seed(self) -> None:
        print("[harness] provisioning A/B members via batch2-harness...")
        out = harness("provision")
        if not out.get("ok"):
            raise RuntimeError(f"provision failed: {out}")
        self.a = out["principals"]["memberA"]
        self.b = out["principals"]["memberB"]
        a_id, b_id = self.a["id"], self.b["id"]

        # Seed public tables directly. Use fixed UUIDs so cleanup is exact.
        records: list[tuple[str, str, dict]] = [
            ("community_questions", "id", {"id": self._uuid(), "author_id": a_id, "title": "A question", "body": "body A"}),
            ("community_questions", "id", {"id": self._uuid(), "author_id": b_id, "title": "B question", "body": "body B"}),
        ]
        q_a, q_b = records[0][2]["id"], records[1][2]["id"]
        records += [
            ("community_answers", "id", {"id": self._uuid(), "question_id": q_b, "author_id": a_id, "body": "A answers B"}),
            ("community_answers", "id", {"id": self._uuid(), "question_id": q_a, "author_id": b_id, "body": "B answers A"}),
        ]
        ans_ab, ans_ba = records[2][2]["id"], records[3][2]["id"]
        records += [
            ("community_votes", "id", {"id": self._uuid(), "answer_id": ans_ba, "voter_id": a_id, "value": 1}),
            ("community_votes", "id", {"id": self._uuid(), "answer_id": ans_ab, "voter_id": b_id, "value": 1}),
            ("win_posts", "id", {"id": self._uuid(), "author_id": a_id, "body": "A win"}),
            ("win_posts", "id", {"id": self._uuid(), "author_id": b_id, "body": "B win"}),
            ("conversations", "id", {"id": self._uuid(), "user_id": a_id, "title": "A convo"}),
            ("conversations", "id", {"id": self._uuid(), "user_id": b_id, "title": "B convo"}),
        ]
        conv_a, conv_b = records[8][2]["id"], records[9][2]["id"]
        records += [
            ("messages", "id", {"id": self._uuid(), "conversation_id": conv_a, "sender_id": a_id, "body": "A msg"}),
            ("messages", "id", {"id": self._uuid(), "conversation_id": conv_b, "sender_id": b_id, "body": "B msg"}),
            ("support_tickets", "id", {"id": self._uuid(), "user_id": a_id, "subject": "A ticket", "status": "open"}),
            ("support_tickets", "id", {"id": self._uuid(), "user_id": b_id, "subject": "B ticket", "status": "open"}),
        ]
        tk_a, tk_b = records[10][2]["id"], records[11][2]["id"]
        records += [
            ("support_ticket_notes", "id", {"id": self._uuid(), "ticket_id": tk_a, "author_id": a_id, "body": "A note body"}),
            ("support_ticket_notes", "id", {"id": self._uuid(), "ticket_id": tk_b, "author_id": b_id, "body": "B note body"}),
        ]

        self.ids = {}
        for table, id_col, row in records:
            self._insert(table, row)
            self.ids.setdefault(table, []).append(row["id"])

        self.conn.commit()

    def _uuid(self) -> str:
        self.cur.execute("SELECT gen_random_uuid() AS id")
        return self.cur.fetchone()["id"]

    def _insert(self, table: str, row: dict) -> None:
        cols = ", ".join(row.keys())
        vals = ", ".join([f"%({k})s" for k in row.keys()])
        self.cur.execute(f"INSERT INTO public.{table} ({cols}) VALUES ({vals})", row)

    def _mint_reauth_ticket(self, user_id: str, action: str) -> str:
        token = secrets.token_hex(32)
        self.cur.execute(
            "INSERT INTO public.reauth_tickets (user_id, action, token_hash, created_at, expires_at) "
            "VALUES (%(user_id)s, %(action)s, %(hash)s, now(), now() + interval '10 minutes')",
            {"user_id": user_id, "action": action, "hash": sha256_hex(token)},
        )
        self.conn.commit()
        return token

    def export_a(self) -> dict:
        print("[harness] exporting member A...")
        # Two separate single-use tickets because each export consumes one.
        ticket_zip = self._mint_reauth_ticket(self.a["id"], "export")
        ticket_json = self._mint_reauth_ticket(self.a["id"], "export")

        member_headers = {
            "Authorization": f"Bearer {self.a['access_token']}",
            "apikey": ANON_KEY,
        }

        zip_resp = function_post("export-my-data", {"ticket": ticket_zip}, member_headers)
        zip_url = zip_resp["download"]["zip"]
        zip_bytes = function_get(zip_url).content

        json_resp = function_post("export-my-data", {"ticket": ticket_json}, member_headers)
        json_url = json_resp["download"]["json"]
        json_text = function_get(json_url).text
        snapshot = json.loads(json_text)

        # Single-use replay rejection.
        for url in (zip_url, json_url):
            r = requests.get(url)
            assert r.status_code in (410, 404), f"link replay accepted: {r.status_code}"

        self.results["export"] = {
            "zip_size": len(zip_bytes),
            "json_size": len(json_text),
            "snapshot": snapshot,
            "zip_files": self._zip_files(zip_bytes),
        }
        return self.results["export"]

    def _zip_files(self, data: bytes) -> list[str]:
        with zipfile.ZipFile(BytesIO(data)) as z:
            return z.namelist()

    def verify_export(self) -> list[str]:
        print("[harness] verifying export contents...")
        snap = self.results["export"]["snapshot"]
        errors: list[str] = []
        a_id = self.a["id"]
        b_id = self.b["id"]

        personal_tables = [
            "community_questions", "community_answers", "community_votes",
            "win_posts", "conversations", "messages", "support_tickets", "support_ticket_notes",
        ]
        for t in personal_tables:
            rows = snap["categories"].get(t, [])
            a_rows = [r for r in rows if any(str(v) == a_id for v in r.values())]
            b_rows = [r for r in rows if any(str(v) == b_id for v in r.values())]
            if not a_rows:
                errors.append(f"{t}: missing A rows")
            if b_rows:
                errors.append(f"{t}: B rows leaked into A export")

        notes = snap["categories"].get("support_ticket_notes", [])
        for n in notes:
            if n.get("body_included") is not False:
                errors.append("support_ticket_notes: body_included flag missing/false")
            if n.get("author_id_included") is not False:
                errors.append("support_ticket_notes: author_id_included flag missing/false")
            if n.get("body") not in (None, ""):
                errors.append("support_ticket_notes: raw body leaked")
            if n.get("author_id") not in (None, ""):
                errors.append("support_ticket_notes: author_id leaked")

        return errors

    def delete_a(self) -> dict:
        print("[harness] deleting member A...")
        ticket = self._mint_reauth_ticket(self.a["id"], "delete")
        member_headers = {
            "Authorization": f"Bearer {self.a['access_token']}",
            "apikey": ANON_KEY,
        }

        job = function_post("request-account-deletion", {"ticket": ticket}, member_headers)
        job_id = job["job"]["id"]

        worker = requests.post(
            f"{SUPABASE_URL}/functions/v1/process-deletion-job",
            headers={"x-internal-secret": INTERNAL_SECRET, "Content-Type": "application/json"},
            json={"job_id": job_id},
        )
        worker.raise_for_status()
        self.results["deletion"] = worker.json()
        return self.results["deletion"]

    def verify_deletion(self) -> list[str]:
        print("[harness] verifying deletion isolation...")
        errors: list[str] = []
        a_id = self.a["id"]
        b_id = self.b["id"]

        personal_tables = [
            "community_questions", "community_answers", "community_votes",
            "win_posts", "conversations", "messages", "support_tickets", "support_ticket_notes",
        ]
        for t in personal_tables:
            self.cur.execute(
                f"SELECT * FROM public.{t} WHERE id = ANY(%s)",
                (self.ids[t],),
            )
            remaining = self.cur.fetchall()
            a_owned = [r for r in remaining if any(str(v) == a_id for v in r.values())]
            b_owned = [r for r in remaining if any(str(v) == b_id for v in r.values())]
            if a_owned:
                errors.append(f"{t}: A rows remain after deletion")
            expected_b = 1 if t != "support_ticket_notes" else 1
            if len(b_owned) != expected_b:
                errors.append(f"{t}: expected {expected_b} B rows, found {len(b_owned)}")

        return errors

    def cleanup(self) -> dict:
        print("[harness] cleaning up synthetic records...")
        counts: dict[str, dict[str, int]] = {}
        for table, ids in self.ids.items():
            self.cur.execute(f"SELECT count(*) AS n FROM public.{table} WHERE id = ANY(%s)", (ids,))
            before = self.cur.fetchone()["n"]
            self.cur.execute(f"DELETE FROM public.{table} WHERE id = ANY(%s)", (ids,))
            self.cur.execute(f"SELECT count(*) AS n FROM public.{table} WHERE id = ANY(%s)", (ids,))
            after = self.cur.fetchone()["n"]
            counts[table] = {"before": before, "after": after}

        # Clean any leftover reauth tickets, export artifacts, deletion jobs for A/B.
        for uid in (self.a["id"], self.b["id"]):
            for table in ("reauth_tickets", "export_artifacts", "deletion_jobs"):
                self.cur.execute(f"DELETE FROM public.{table} WHERE user_id = %s", (uid,))

        self.conn.commit()

        # Auth cleanup via harness.
        harness("cleanup", {"ids": [self.a["id"], self.b["id"]]})

        self.results["cleanup"] = counts
        return counts

    def run(self) -> int:
        try:
            self.seed()
            self.export_a()
            export_errors = self.verify_export()
            self.delete_a()
            deletion_errors = self.verify_deletion()

            all_errors = export_errors + deletion_errors
            outcome = {
                "ok": len(all_errors) == 0,
                "errors": all_errors,
                "export_row_counts": self.results["export"]["snapshot"]["meta"]["row_counts"],
                "deletion_reconciliation": self.results["deletion"].get("reconciliation", {}),
            }
            print(json.dumps(outcome, indent=2, default=str))
            if all_errors:
                print("[harness] FAIL")
                return 1
            print("[harness] PASS")
            return 0
        finally:
            self.cleanup()
            self.cur.close()
            self.conn.close()


def main() -> int:
    h = Harness()
    return h.run()


if __name__ == "__main__":
    sys.exit(main())
