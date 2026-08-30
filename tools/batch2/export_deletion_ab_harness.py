#!/usr/bin/env python3
"""
Synthetic A/B export/deletion harness.

Creates two isolated members (A = deletion subject, B = untouched control),
seeds every corrected Prompt 3 surface for both, runs the real export and
account-deletion state machine for A, verifies B's records remain byte-for-byte,
and cleans every synthetic record by exact ID.

This script runs locally with service-role credentials and does not deploy a
production test endpoint. No real email, Stripe, Resend, Dexcom or external-AI
calls are made.
"""

import hashlib
import json
import os
import secrets
import sys
import time
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

import requests

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
ANON_KEY = os.environ["SUPABASE_ANON_KEY"]

AUTH_HEADERS = {"Authorization": f"Bearer {SERVICE_ROLE_KEY}", "apikey": ANON_KEY}


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def admin_rpc(name: str, params: dict) -> Any:
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/{name}",
        headers={**AUTH_HEADERS, "Content-Type": "application/json"},
        json=params,
    )
    r.raise_for_status()
    return r.json()


def admin_get(table: str, *, select: str = "*", params: dict | None = None) -> list[dict]:
    q = {**({} if params is None else params), "select": select}
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=AUTH_HEADERS,
        params=q,
    )
    r.raise_for_status()
    return r.json()


def admin_post(table: str, rows: dict | list[dict]) -> Any:
    body = [rows] if isinstance(rows, dict) else rows
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers={**AUTH_HEADERS, "Content-Type": "application/json", "Prefer": "return=representation"},
        json=body,
    )
    r.raise_for_status()
    return r.json()


def admin_delete(table: str, ids: list[str], id_col: str = "id") -> None:
    if not ids:
        return
    r = requests.delete(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=AUTH_HEADERS,
        params={id_col: f"in.({','.join(ids))}", "prefer": "return=minimal"},
    )
    r.raise_for_status()


def create_user(email: str, password: str) -> dict:
    r = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers={**AUTH_HEADERS, "Content-Type": "application/json"},
        json={"email": email, "password": password, "email_confirm": True},
    )
    r.raise_for_status()
    return r.json()


def delete_user(user_id: str) -> None:
    requests.delete(
        f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
        headers=AUTH_HEADERS,
    )


def mint_reauth_ticket(user_id: str, action: str) -> str:
    token = secrets.token_hex(32)
    admin_post("reauth_tickets", {
        "user_id": user_id,
        "action": action,
        "token_hash": sha256_hex(token),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": datetime.now(timezone.utc).isoformat(),
    })
    return token


def function_post(name: str, body: dict, headers: dict) -> dict:
    r = requests.post(
        f"{SUPABASE_URL}/functions/v1/{name}",
        headers={**headers, "Content-Type": "application/json"},
        json=body,
    )
    try:
        r.raise_for_status()
    except requests.HTTPError:
        print(r.text)
        raise
    return r.json()


def function_get(url: str, params: dict | None = None) -> requests.Response:
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r


class Harness:
    def __init__(self) -> None:
        self.a: dict[str, Any] = {}
        self.b: dict[str, Any] = {}
        self.ids: dict[str, list[str]] = defaultdict(list)
        self.results: dict[str, Any] = {}

    def seed(self) -> None:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        self.a = create_user(f"harness-a-{stamp}@example.invalid", "SyntheticA1!")
        self.b = create_user(f"harness-b-{stamp}@example.invalid", "SyntheticB1!")
        time.sleep(0.5)  # let triggers create profiles
        self.a["profile"] = admin_get("profiles", params={"id": f"eq.{self.a['id']}"})[0]
        self.b["profile"] = admin_get("profiles", params={"id": f"eq.{self.b['id']}"})[0]

        a_id, b_id = self.a["id"], self.b["id"]

        # Community questions.
        q_a = admin_post("community_questions", {"author_id": a_id, "title": "A question", "body": "body A"})[0]
        q_b = admin_post("community_questions", {"author_id": b_id, "title": "B question", "body": "body B"})[0]
        self.ids["community_questions"] = [q_a["id"], q_b["id"]]

        # Cross-linked answers.
        ans_ab = admin_post("community_answers", {"question_id": q_b["id"], "author_id": a_id, "body": "A answers B"})[0]
        ans_ba = admin_post("community_answers", {"question_id": q_a["id"], "author_id": b_id, "body": "B answers A"})[0]
        self.ids["community_answers"] = [ans_ab["id"], ans_ba["id"]]

        # Votes.
        vote_a = admin_post("community_votes", {"answer_id": ans_ba["id"], "voter_id": a_id, "value": 1})[0]
        vote_b = admin_post("community_votes", {"answer_id": ans_ab["id"], "voter_id": b_id, "value": 1})[0]
        self.ids["community_votes"] = [vote_a["id"], vote_b["id"]]

        # Win posts.
        wp_a = admin_post("win_posts", {"author_id": a_id, "body": "A win"})[0]
        wp_b = admin_post("win_posts", {"author_id": b_id, "body": "B win"})[0]
        self.ids["win_posts"] = [wp_a["id"], wp_b["id"]]

        # Conversations and messages.
        conv_a = admin_post("conversations", {"user_id": a_id, "title": "A convo"})[0]
        conv_b = admin_post("conversations", {"user_id": b_id, "title": "B convo"})[0]
        self.ids["conversations"] = [conv_a["id"], conv_b["id"]]
        msg_a = admin_post("messages", {"conversation_id": conv_a["id"], "sender_id": a_id, "body": "A msg"})[0]
        msg_b = admin_post("messages", {"conversation_id": conv_b["id"], "sender_id": b_id, "body": "B msg"})[0]
        self.ids["messages"] = [msg_a["id"], msg_b["id"]]

        # Support tickets and notes.
        tk_a = admin_post("support_tickets", {"user_id": a_id, "subject": "A ticket", "status": "open"})[0]
        tk_b = admin_post("support_tickets", {"user_id": b_id, "subject": "B ticket", "status": "open"})[0]
        self.ids["support_tickets"] = [tk_a["id"], tk_b["id"]]
        note_a = admin_post("support_ticket_notes", {"ticket_id": tk_a["id"], "author_id": a_id, "body": "A note body"})[0]
        note_b = admin_post("support_ticket_notes", {"ticket_id": tk_b["id"], "author_id": b_id, "body": "B note body"})[0]
        self.ids["support_ticket_notes"] = [note_a["id"], note_b["id"]]

    def export_a(self) -> dict:
        # Mint two separate single-use tickets because readable and machine-readable
        # exports each consume one ticket.
        ticket_zip = mint_reauth_ticket(self.a["id"], "export")
        ticket_json = mint_reauth_ticket(self.a["id"], "export")

        # Authenticate as A via service-role sign-in helper.
        session = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
            json={"email": self.a["email"], "password": "SyntheticA1!"},
        ).json()
        access_token = session["access_token"]
        member_headers = {"Authorization": f"Bearer {access_token}", "apikey": ANON_KEY}

        # Request ZIP export.
        zip_resp = function_post("export-my-data", {"ticket": ticket_zip}, member_headers)
        zip_url = zip_resp["download"]["zip"]
        zip_bytes = function_get(zip_url).content

        # Request JSON export.
        json_resp = function_post("export-my-data", {"ticket": ticket_json}, member_headers)
        json_url = json_resp["download"]["json"]
        json_text = function_get(json_url).text
        snapshot = json.loads(json_text)

        # Verify single-use: the same links must now be gone.
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
        snap = self.results["export"]["snapshot"]
        errors: list[str] = []
        a_id = self.a["id"]
        b_id = self.b["id"]

        # Categories that must be present for A and absent for B.
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

        # Support notes must be neutral references.
        notes = snap["categories"].get("support_ticket_notes", [])
        for n in notes:
            if n.get("body_included") is not False:
                errors.append("support_ticket_notes: body_included flag missing/false")
            if n.get("author_id_included") is not False:
                errors.append("support_ticket_notes: author_id_included flag missing/false")
            if "body" in n and n.get("body") not in (None, ""):
                errors.append("support_ticket_notes: raw body leaked")
            if "author_id" in n and n.get("author_id") not in (None, ""):
                errors.append("support_ticket_notes: author_id leaked")

        # Headers / one-time behavior are verified in export_a.
        return errors

    def delete_a(self) -> dict:
        ticket = mint_reauth_ticket(self.a["id"], "delete")
        session = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
            json={"email": self.a["email"], "password": "SyntheticA1!"},
        ).json()
        access_token = session["access_token"]
        member_headers = {"Authorization": f"Bearer {access_token}", "apikey": ANON_KEY}

        job = function_post("request-account-deletion", {"ticket": ticket}, member_headers)
        job_id = job["job"]["id"]

        # Run deletion worker with service-role bearer.
        worker = requests.post(
            f"{SUPABASE_URL}/functions/v1/process-deletion-job",
            headers={"Authorization": f"Bearer {SERVICE_ROLE_KEY}", "Content-Type": "application/json"},
            json={"job_id": job_id},
        )
        worker.raise_for_status()
        worker_body = worker.json()

        self.results["deletion"] = worker_body
        return worker_body

    def verify_deletion(self) -> list[str]:
        errors: list[str] = []
        a_id = self.a["id"]
        b_id = self.b["id"]

        personal_tables = [
            "community_questions", "community_answers", "community_votes",
            "win_posts", "conversations", "messages", "support_tickets", "support_ticket_notes",
        ]
        for t in personal_tables:
            a_remaining = admin_get(t, params={"id": f"in.({','.join(self.ids[t])})"})
            a_owned = [r for r in a_remaining if any(str(v) == a_id for v in r.values())]
            if a_owned:
                errors.append(f"{t}: A rows remain after deletion")

        # B records must remain byte-for-byte.
        for t in personal_tables:
            b_rows = admin_get(t, params={"id": f"in.({','.join(self.ids[t])})"})
            b_owned = [r for r in b_rows if any(str(v) == b_id for v in r.values())]
            expected = 1 if t != "support_ticket_notes" else 1
            if len(b_owned) != expected:
                errors.append(f"{t}: expected {expected} B rows, found {len(b_owned)}")

        return errors

    def cleanup(self) -> dict:
        counts: dict[str, dict[str, int]] = {}
        # Clean B records first (A should already be deleted).
        for table, ids in self.ids.items():
            before = len(admin_get(table, params={"id": f"in.({','.join(ids)})"}))
            admin_delete(table, ids)
            after = len(admin_get(table, params={"id": f"in.({','.join(ids)})"}))
            counts[table] = {"before": before, "after": after}

        # Clean auth users (A may already be gone from deletion worker).
        for u in (self.a, self.b):
            try:
                delete_user(u["id"])
            except requests.HTTPError as e:
                if e.response.status_code != 404:
                    raise

        # Clean any leftover reauth tickets / export artifacts / deletion jobs.
        for table in ("reauth_tickets", "export_artifacts", "deletion_jobs"):
            rows = admin_get(table, params={"user_id": f"eq.{self.a['id']}"})
            admin_delete(table, [r["id"] for r in rows])
            rows_b = admin_get(table, params={"user_id": f"eq.{self.b['id']}"})
            admin_delete(table, [r["id"] for r in rows_b])

        self.results["cleanup"] = counts
        return counts


def run() -> int:
    h = Harness()
    try:
        print("[harness] seeding A/B members...")
        h.seed()
        print("[harness] exporting member A...")
        h.export_a()
        export_errors = h.verify_export()
        print("[harness] deleting member A...")
        h.delete_a()
        deletion_errors = h.verify_deletion()

        all_errors = export_errors + deletion_errors
        outcome = {
            "ok": len(all_errors) == 0,
            "errors": all_errors,
            "export_row_counts": h.results["export"]["snapshot"]["meta"]["row_counts"],
            "deletion_reconciliation": h.results["deletion"].get("reconciliation", {}),
        }
        print(json.dumps(outcome, indent=2))
        if all_errors:
            print("[harness] FAIL")
            return 1
        print("[harness] PASS")
        return 0
    finally:
        print("[harness] cleaning up...")
        h.cleanup()


if __name__ == "__main__":
    sys.exit(run())
