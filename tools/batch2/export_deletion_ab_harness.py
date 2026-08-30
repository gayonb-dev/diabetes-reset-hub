#!/usr/bin/env python3
"""
Synthetic A/B export/deletion harness.

Creates two isolated members (A = deletion subject, B = untouched control)
using the existing temporary batch2-harness Edge Function, seeds every corrected
Prompt 3 surface via psql, runs the real export and account-deletion state
machine for A, verifies B's records remain, and cleans every synthetic record
by exact ID.

This script runs locally with service-authorized credentials and does not deploy
a production test endpoint. No real email, Stripe, Resend, Dexcom or external-AI
calls are made.
"""

import hashlib
import json
import os
import secrets
import subprocess
import sys
import time
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

import requests

SUPABASE_URL = os.environ["SUPABASE_URL"]
ANON_KEY = os.environ["VITE_SUPABASE_ANON_KEY"] or os.environ["SUPABASE_PUBLISHABLE_KEY"]
HARNESS_SECRET = os.environ["BATCH2_HARNESS_SECRET_V2"] or os.environ["BATCH2_HARNESS_SECRET"]
INTERNAL_SECRET = os.environ["INTERNAL_FUNCTION_SECRET"]


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def psql_json(sql: str) -> list[dict]:
    """Run a SELECT via psql and return JSON result."""
    wrapped = f"SELECT json_agg(t) AS result FROM ({sql}) t;"
    r = subprocess.run(
        ["psql", "-t", "-A", "-c", wrapped],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        print("psql error:", r.stderr)
        raise subprocess.CalledProcessError(r.returncode, r.args, r.stdout, r.stderr)
    out = r.stdout.strip()
    if not out or out == "" or out == "null":
        return []
    return json.loads(out)


def psql_exec(sql: str) -> None:
    """Run a non-SELECT statement via psql."""
    r = subprocess.run(["psql", "-c", sql], capture_output=True, text=True)
    if r.returncode != 0:
        print("psql error:", r.stderr)
        raise subprocess.CalledProcessError(r.returncode, r.args, r.stdout, r.stderr)


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
        self.a_vp: str = ""
        self.b_vp: str = ""
        self.ids: dict[str, list[str]] = {}
        self.results: dict[str, Any] = {}

    def seed(self) -> None:
        print("[harness] cleaning prior synthetic fixtures...")
        harness("cleanup_all_synthetic")
        print("[harness] provisioning A/B members via batch2-harness...")
        out = harness("provision")
        if not out.get("ok"):
            raise RuntimeError(f"provision failed: {out}")
        # A = deletion/export subject (memberC is never-billed; no Stripe calls).
        # B = untouched control (memberB has an active subscription).
        self.a = out["principals"]["memberC"]
        self.b = out["principals"]["memberB"]
        a_id, b_id = self.a["id"], self.b["id"]

        # Resolve visitor_profile ids created by the harness trigger.
        self.a_vp = psql_json(f"SELECT id FROM public.visitor_profiles WHERE user_id = '{a_id}'")[0]["id"]
        self.b_vp = psql_json(f"SELECT id FROM public.visitor_profiles WHERE user_id = '{b_id}'")[0]["id"]

        # Seed public tables directly via psql. Use fixed UUIDs for exact cleanup.
        q_a = self._uuid(); q_b = self._uuid()
        ans_ab = self._uuid(); ans_ba = self._uuid()
        vote_a = self._uuid(); vote_b = self._uuid()
        wp_a = self._uuid(); wp_b = self._uuid()
        conv_a = self._uuid(); conv_b = self._uuid()
        msg_a = self._uuid(); msg_b = self._uuid()
        tk_a = self._uuid(); tk_b = self._uuid()
        note_a = self._uuid(); note_b = self._uuid()

        self.ids = {
            "community_questions": [q_a, q_b],
            "community_answers": [ans_ab, ans_ba],
            "community_votes": [vote_a, vote_b],
            "win_posts": [wp_a, wp_b],
            "conversations": [conv_a, conv_b],
            "messages": [msg_a, msg_b],
            "support_tickets": [tk_a, tk_b],
            "support_ticket_notes": [note_a, note_b],
        }

        now = datetime.now(timezone.utc).isoformat()
        ref_a = f"HARNESS-A-{secrets.token_hex(4)}"
        ref_b = f"HARNESS-B-{secrets.token_hex(4)}"
        stmts = [
            f"INSERT INTO public.community_questions (id, author_id, content, created_at) VALUES ('{q_a}', '{a_id}', 'A question', '{now}'), ('{q_b}', '{b_id}', 'B question', '{now}')",
            f"INSERT INTO public.community_answers (id, question_id, author_id, content, created_at) VALUES ('{ans_ab}', '{q_b}', '{a_id}', 'A answers B', '{now}'), ('{ans_ba}', '{q_a}', '{b_id}', 'B answers A', '{now}')",
            f"INSERT INTO public.community_votes (id, voter_id, target_type, target_id, vote_type, created_at) VALUES ('{vote_a}', '{a_id}', 'answer', '{ans_ba}', 'upvote', '{now}'), ('{vote_b}', '{b_id}', 'answer', '{ans_ab}', 'upvote', '{now}')",
            f"INSERT INTO public.win_posts (id, author_id, milestone_type, milestone_label, created_at) VALUES ('{wp_a}', '{a_id}', 'other', 'A milestone', '{now}'), ('{wp_b}', '{b_id}', 'other', 'B milestone', '{now}')",
            f"INSERT INTO public.conversations (id, visitor_profile_id, summary, created_at) VALUES ('{conv_a}', '{self.a_vp}', 'A convo', '{now}'), ('{conv_b}', '{self.b_vp}', 'B convo', '{now}')",
            f"INSERT INTO public.messages (id, conversation_id, visitor_profile_id, role, content, created_at) VALUES ('{msg_a}', '{conv_a}', '{self.a_vp}', 'user', 'A msg', '{now}'), ('{msg_b}', '{conv_b}', '{self.b_vp}', 'user', 'B msg', '{now}')",
            f"INSERT INTO public.support_tickets (id, user_id, reference, category, message, created_at) VALUES ('{tk_a}', '{a_id}', '{ref_a}', 'Question', 'A ticket message', '{now}'), ('{tk_b}', '{b_id}', '{ref_b}', 'Question', 'B ticket message', '{now}')",
            f"INSERT INTO public.support_ticket_notes (id, ticket_id, author_id, body, created_at) VALUES ('{note_a}', '{tk_a}', '{a_id}', 'A note body', '{now}'), ('{note_b}', '{tk_b}', '{b_id}', 'B note body', '{now}')",
        ]
        for stmt in stmts:
            psql_exec(stmt)

    def _uuid(self) -> str:
        r = subprocess.run(["psql", "-t", "-A", "-c", "SELECT gen_random_uuid()"],
                           capture_output=True, text=True, check=True)
        return r.stdout.strip()

    def _mint_reauth_ticket(self, user_id: str, action: str) -> str:
        token = secrets.token_hex(32)
        psql_exec(
            "INSERT INTO public.reauth_tickets (user_id, action, token_hash, created_at, expires_at) "
            f"VALUES ('{user_id}', '{action}', '{sha256_hex(token)}', now(), now() + interval '10 minutes')"
        )
        return token

    def export_a(self) -> dict:
        print("[harness] exporting member A...")
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
                errors.append("support_ticket_notes: body_included flag should be false")
            if n.get("author_id_included") is not False:
                errors.append("support_ticket_notes: author_id_included flag should be false")
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
            rows = psql_json(f"SELECT * FROM public.{t} WHERE id = ANY(ARRAY[{self._sql_array(self.ids[t])}]::uuid[])")
            a_owned = [r for r in rows if any(str(v) == a_id for v in r.values())]
            b_owned = [r for r in rows if any(str(v) == b_id for v in r.values())]
            if a_owned:
                errors.append(f"{t}: A rows remain after deletion")
            expected_b = 1
            if len(b_owned) != expected_b:
                errors.append(f"{t}: expected {expected_b} B rows, found {len(b_owned)}")

        return errors

    def _sql_array(self, ids: list[str]) -> str:
        return ", ".join(f"'{id}'" for id in ids)

    def cleanup(self) -> dict:
        print("[harness] cleaning up synthetic records...")
        counts: dict[str, dict[str, int]] = {}
        for table, ids in self.ids.items():
            before = psql_json(f"SELECT count(*) AS n FROM public.{table} WHERE id = ANY(ARRAY[{self._sql_array(ids)}]::uuid[])")[0]["n"]
            psql_exec(f"DELETE FROM public.{table} WHERE id = ANY(ARRAY[{self._sql_array(ids)}]::uuid[])")
            after = psql_json(f"SELECT count(*) AS n FROM public.{table} WHERE id = ANY(ARRAY[{self._sql_array(ids)}]::uuid[])")[0]["n"]
            counts[table] = {"before": before, "after": after}

        # Clean any leftover reauth tickets, export artifacts, deletion jobs for A/B.
        for uid in (self.a["id"], self.b["id"]):
            for table in ("reauth_tickets", "export_artifacts", "deletion_jobs"):
                psql_exec(f"DELETE FROM public.{table} WHERE user_id = '{uid}'")

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


def main() -> int:
    h = Harness()
    return h.run()


if __name__ == "__main__":
    sys.exit(main())
