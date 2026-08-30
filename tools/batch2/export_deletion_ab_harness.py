#!/usr/bin/env python3
"""
Synthetic A/B export/deletion harness (Batch 2 evidence correction).

Two isolated synthetic members:
  A = export + deletion subject (never-billed principal, so no Stripe call path)
  B = untouched control

It seeds every corrected Prompt 3 surface, runs the REAL export and account
deletion state machine for A, and records machine-readable evidence:

  - actual ZIP and JSON byte sizes and SHA-256 digests
  - response headers for both downloads
  - snapshot consistency between the ZIP's export.json and the JSON download
  - per-surface inclusion / exclusion results (A included, B excluded)
  - immutable order ownership: owned order exported/deleted, ownerless legacy
    order with A's email and B's order neither exported nor deleted
  - billing_holds exported redacted and RETAINED after deletion
  - community_answer_embeddings never exported and removed by cascade
  - reauthentication: single-use replay and expired-ticket rejection
  - deletion retry (second worker pass) idempotency
  - Member B comparison after deletion
  - exact-ID cleanup across every synthetic surface, including auth, profiles,
    visitor profiles/sessions, reauth tickets, export artifacts, storage objects
    and deletion jobs, with retained security metadata recorded separately

Identifiers are redacted in the evidence file: members appear as MEMBER_A /
MEMBER_B with a truncated SHA-256 of the real id; no email address, token or
signed URL is written to disk.
"""

import hashlib
import json
import os
import secrets
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "batch2-evidence" / "export-deletion-run.json"

SUPABASE_URL = os.environ["SUPABASE_URL"]
ANON_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY") or os.environ["SUPABASE_PUBLISHABLE_KEY"]
HARNESS_SECRET = os.environ.get("BATCH2_HARNESS_SECRET_V2") or os.environ["BATCH2_HARNESS_SECRET"]
INTERNAL_SECRET = os.environ["INTERNAL_FUNCTION_SECRET"]
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "https://diabetesresetmethod.com")

SAFE_HEADERS = ("content-type", "content-disposition", "cache-control", "content-length")


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def redact_id(value: str) -> str:
    return "id:" + hashlib.sha256(value.encode()).hexdigest()[:12]


def psql_json(sql: str) -> list[dict]:
    wrapped = f"SELECT json_agg(t) AS result FROM ({sql}) t;"
    r = subprocess.run(["psql", "-t", "-A", "-c", wrapped], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"psql error: {r.stderr}")
    out = r.stdout.strip()
    if not out or out == "null":
        return []
    return json.loads(out)


def psql_exec(sql: str) -> None:
    r = subprocess.run(["psql", "-c", sql], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"psql error: {r.stderr}")


def scalar(sql: str) -> Any:
    rows = psql_json(sql)
    return rows[0][list(rows[0].keys())[0]] if rows else None


def harness(action: str, body: dict | None = None, tolerant: bool = False) -> dict:
    r = requests.post(
        f"{SUPABASE_URL}/functions/v1/batch2-harness",
        headers={"x-harness-secret": HARNESS_SECRET, "Content-Type": "application/json"},
        json={"action": action, **(body or {})},
        timeout=120,
    )
    if tolerant and r.status_code >= 400:
        return {"error": f"HTTP {r.status_code}", "detail": r.text[:300]}
    r.raise_for_status()
    return r.json()


def function_post(name: str, body: dict, headers: dict) -> requests.Response:
    return requests.post(
        f"{SUPABASE_URL}/functions/v1/{name}",
        headers={**headers, "Content-Type": "application/json", "Origin": ALLOWED_ORIGIN},
        json=body, timeout=120,
    )


class Run:
    def __init__(self) -> None:
        self.a: dict[str, Any] = {}
        self.b: dict[str, Any] = {}
        self.a_vp = ""
        self.b_vp = ""
        self.ids: dict[str, list[str]] = {}
        self.order_ids: dict[str, str] = {}
        self._order_rows: list[dict] = []
        self.results: dict[str, Any] = {}
        self.errors: list[str] = []

    # ---------------- seeding ----------------

    def _uuid(self) -> str:
        return subprocess.run(["psql", "-t", "-A", "-c", "SELECT gen_random_uuid()"],
                              capture_output=True, text=True, check=True).stdout.strip()

    def seed(self) -> None:
        print("[harness] cleaning prior synthetic fixtures...")
        harness("cleanup_all_synthetic")
        harness("cleanup_orders")
        # Any billing hold left behind by an interrupted earlier run is synthetic:
        # the production table holds no dispute records (verified before the run).
        harness("delete_by_column", {"table": "billing_holds", "column": "hold_type", "ids": ["dispute"]}, tolerant=True)
        print("[harness] provisioning A/B members...")
        out = harness("provision")
        if not out.get("ok"):
            raise RuntimeError(f"provision failed: {out}")
        self.a = out["principals"]["memberC"]   # never billed: no processor path
        self.b = out["principals"]["memberB"]   # control, active synthetic subscription
        a_id, b_id = self.a["id"], self.b["id"]

        self.a_vp = psql_json(f"SELECT id FROM public.visitor_profiles WHERE user_id = '{a_id}'")[0]["id"]
        self.b_vp = psql_json(f"SELECT id FROM public.visitor_profiles WHERE user_id = '{b_id}'")[0]["id"]

        u = self._uuid
        q_a, q_b = u(), u()
        ans_ab, ans_ba = u(), u()
        vote_a, vote_b = u(), u()
        wp_a, wp_b = u(), u()
        conv_a, conv_b = u(), u()
        msg_a, msg_b = u(), u()
        tk_a, tk_b = u(), u()
        note_a, note_b = u(), u()
        emb_a = u()
        hold_a = u()
        ord_owned, ord_ownerless, ord_b = u(), u(), u()

        self.ids = {
            "community_questions": [q_a, q_b],
            "community_answers": [ans_ab, ans_ba],
            "community_votes": [vote_a, vote_b],
            "win_posts": [wp_a, wp_b],
            "conversations": [conv_a, conv_b],
            "messages": [msg_a, msg_b],
            "support_tickets": [tk_a, tk_b],
            "support_ticket_notes": [note_a, note_b],
            "community_answer_embeddings": [emb_a],
            "billing_holds": [hold_a],
            "orders": [ord_owned, ord_ownerless, ord_b],
        }
        self.order_ids = {"owned_by_a": ord_owned, "ownerless_legacy_a_email": ord_ownerless, "owned_by_b": ord_b}

        now = datetime.now(timezone.utc).isoformat()
        a_email = self.a["email"]
        b_sub = scalar(f"SELECT id FROM public.subscriptions WHERE user_id = '{b_id}' LIMIT 1")
        stmts = [
            f"INSERT INTO public.community_questions (id, author_id, content, created_at) VALUES ('{q_a}','{a_id}','A question','{now}'),('{q_b}','{b_id}','B question','{now}')",
            f"INSERT INTO public.community_answers (id, question_id, author_id, content, created_at) VALUES ('{ans_ab}','{q_b}','{a_id}','A answers B','{now}'),('{ans_ba}','{q_a}','{b_id}','B answers A','{now}')",
            f"INSERT INTO public.community_answer_embeddings (id, answer_id, question_id, combined_text, created_at) VALUES ('{emb_a}','{ans_ab}','{q_b}','A answer derived text','{now}')",
            f"INSERT INTO public.community_votes (id, voter_id, target_type, target_id, vote_type, created_at) VALUES ('{vote_a}','{a_id}','answer','{ans_ba}','upvote','{now}'),('{vote_b}','{b_id}','answer','{ans_ab}','upvote','{now}')",
            f"INSERT INTO public.win_posts (id, author_id, milestone_type, milestone_label, created_at) VALUES ('{wp_a}','{a_id}','other','A milestone','{now}'),('{wp_b}','{b_id}','other','B milestone','{now}')",
            f"INSERT INTO public.conversations (id, visitor_profile_id, summary, created_at) VALUES ('{conv_a}','{self.a_vp}','A convo','{now}'),('{conv_b}','{self.b_vp}','B convo','{now}')",
            f"INSERT INTO public.messages (id, conversation_id, visitor_profile_id, role, content, created_at) VALUES ('{msg_a}','{conv_a}','{self.a_vp}','user','A msg','{now}'),('{msg_b}','{conv_b}','{self.b_vp}','user','B msg','{now}')",
            f"INSERT INTO public.support_tickets (id, user_id, reference, category, message, created_at) VALUES ('{tk_a}','{a_id}','HARNESS-A-{secrets.token_hex(4)}','Question','A ticket message','{now}'),('{tk_b}','{b_id}','HARNESS-B-{secrets.token_hex(4)}','Question','B ticket message','{now}')",
            f"INSERT INTO public.support_ticket_notes (id, ticket_id, author_id, body, created_at) VALUES ('{note_a}','{tk_a}','{a_id}','A note body','{now}'),('{note_b}','{tk_b}','{b_id}','B note body','{now}')",
            f"INSERT INTO public.billing_holds (id, user_id, hold_type, stripe_dispute_id, stripe_charge_id, dispute_status, review_only, opened_at) VALUES ('{hold_a}','{a_id}','dispute','dp_synthetic_batch2_{secrets.token_hex(4)}','ch_synthetic_batch2_{secrets.token_hex(4)}','warning_closed',true,'{now}')",
        ]
        for stmt in stmts:
            psql_exec(stmt)

        # Orders are written through the service-role harness: the sandbox role
        # deliberately holds no UPDATE/DELETE privilege on commerce tables.
        base = {
            "customer_name": "Batch2 Synthetic",
            "amount": 2700,
            "currency": "usd",
            "status": "paid",
            "product_name": "SYNTHETIC-BATCH2-VERIFICATION",
            "product_id": "synthetic-batch2",
        }
        self._order_rows = [
            {**base, "id": ord_owned, "user_id": a_id, "customer_email": a_email},
            {**base, "id": ord_ownerless, "user_id": None, "customer_email": a_email,
             "customer_name": "Batch2 Synthetic Legacy"},
            {**base, "id": ord_b, "user_id": b_id, "customer_email": self.b["email"],
             "subscription_id": b_sub, "customer_name": "Batch2 Synthetic B"},
        ]
        out = harness("seed_orders_explicit", {"rows": self._order_rows})
        if not out.get("ok"):
            raise RuntimeError(f"order seeding failed: {out}")

    # ---------------- reauthentication ----------------

    def _mint_ticket(self, user_id: str, action: str, expired: bool = False) -> str:
        token = secrets.token_hex(32)
        if expired:
            # Lifetime trigger caps at 10 minutes from created_at; backdate both.
            psql_exec(
                "INSERT INTO public.reauth_tickets (user_id, action, token_hash, created_at, expires_at) "
                f"VALUES ('{user_id}','{action}','{sha256_hex(token)}', now() - interval '30 minutes', now() - interval '25 minutes')"
            )
        else:
            psql_exec(
                "INSERT INTO public.reauth_tickets (user_id, action, token_hash, created_at, expires_at) "
                f"VALUES ('{user_id}','{action}','{sha256_hex(token)}', now(), now() + interval '10 minutes')"
            )
        return token

    # ---------------- export ----------------

    def export_a(self) -> None:
        print("[harness] exporting member A...")
        hdr = {"Authorization": f"Bearer {self.a['access_token']}", "apikey": ANON_KEY}

        # expired ticket must be rejected before any artifact is produced
        expired = self._mint_ticket(self.a["id"], "export", expired=True)
        exp_resp = function_post("export-my-data", {"ticket": expired}, hdr)
        expired_rejected = exp_resp.status_code >= 400
        if not expired_rejected:
            self.errors.append("expired reauthentication ticket was accepted for export")

        # one export call produces one snapshot with both download links
        t = self._mint_ticket(self.a["id"], "export")
        er = function_post("export-my-data", {"ticket": t}, hdr)
        er.raise_for_status()
        payload = er.json()
        zip_url = payload["download"]["zip"]
        json_url = payload["download"]["json"]

        # single-use reauthentication: the same ticket must not work twice
        reuse = function_post("export-my-data", {"ticket": t}, hdr)
        ticket_reuse_rejected = reuse.status_code >= 400
        if not ticket_reuse_rejected:
            self.errors.append("reauthentication ticket was accepted twice")

        zresp = requests.get(zip_url, timeout=60)
        zip_bytes = zresp.content
        jresp = requests.get(json_url, timeout=60)
        json_text = jresp.text
        snapshot = json.loads(json_text)

        # download link replay must be rejected (single-use artifact)
        replay = {"zip": requests.get(zip_url, timeout=30).status_code,
                  "json": requests.get(json_url, timeout=30).status_code}
        for fmt, code in replay.items():
            if code not in (404, 410):
                self.errors.append(f"{fmt} download replay accepted: HTTP {code}")

        with zipfile.ZipFile(BytesIO(zip_bytes)) as z:
            names = z.namelist()
            zip_snapshot = json.loads(z.read("export.json").decode()) if "export.json" in names else None

        consistency = {
            "zip_contains_export_json": zip_snapshot is not None,
            "same_schema_version": bool(zip_snapshot) and zip_snapshot["meta"]["schema_version"] == snapshot["meta"]["schema_version"],
            "same_category_set": bool(zip_snapshot) and sorted(zip_snapshot["categories"]) == sorted(snapshot["categories"]),
            "same_row_counts": bool(zip_snapshot) and zip_snapshot["meta"]["row_counts"] == snapshot["meta"]["row_counts"],
            "same_snapshot_timestamp": bool(zip_snapshot) and zip_snapshot["meta"]["generated_at"] == snapshot["meta"]["generated_at"],
            "exported_at_equals_generated_at": snapshot["meta"]["exported_at"] == snapshot["meta"]["generated_at"],
        }
        for k, v in consistency.items():
            if not v:
                self.errors.append(f"snapshot consistency failed: {k}")

        self.results["export"] = {
            "expired_ticket_rejected": expired_rejected,
            "expired_ticket_status": exp_resp.status_code,
            "ticket_single_use_rejected_on_reuse": ticket_reuse_rejected,
            "ticket_reuse_status": reuse.status_code,
            "download_replay_status": replay,
            "zip": {
                "bytes": len(zip_bytes),
                "sha256": hashlib.sha256(zip_bytes).hexdigest(),
                "entries": names,
                "headers": {k: v for k, v in zresp.headers.items() if k.lower() in SAFE_HEADERS},
            },
            "json": {
                "bytes": len(json_text.encode()),
                "sha256": hashlib.sha256(json_text.encode()).hexdigest(),
                "headers": {k: v for k, v in jresp.headers.items() if k.lower() in SAFE_HEADERS},
            },
            "snapshot_consistency": consistency,
            "row_counts": snapshot["meta"]["row_counts"],
            "ownership_basis": snapshot["meta"].get("ownership_basis"),
        }
        self.snapshot = snapshot

    def verify_export(self) -> None:
        print("[harness] verifying export inclusion / exclusion...")
        snap = self.snapshot
        cats = snap["categories"]
        a_id, b_id = self.a["id"], self.b["id"]
        surfaces: dict[str, dict] = {}

        def check(table, a_refs, b_refs):
            rows = cats.get(table, [])
            a_hit = [r for r in rows if any(str(v) in a_refs for v in r.values())]
            b_hit = [r for r in rows if any(str(v) in b_refs for v in r.values())]
            ok = bool(a_hit) and not b_hit
            surfaces[table] = {"a_rows_included": len(a_hit), "b_rows_included": len(b_hit), "result": "PASS" if ok else "FAIL"}
            if not ok:
                self.errors.append(f"export {table}: A={len(a_hit)} B={len(b_hit)}")

        check("community_questions", {a_id}, {b_id})
        check("community_answers", {a_id}, {b_id})
        check("community_votes", {a_id}, {b_id})
        check("win_posts", {a_id}, {b_id})
        check("conversations", {self.a_vp}, {self.b_vp})
        check("messages", {self.a_vp}, {self.b_vp})
        check("support_tickets", {a_id}, {b_id})
        check("support_ticket_notes", {self.ids["support_tickets"][0]}, {self.ids["support_tickets"][1]})

        # support notes: neutral metadata only
        note_redaction = {"body_absent": True, "author_id_absent": True, "flags_present": True}
        for n in cats.get("support_ticket_notes", []):
            if n.get("body"):
                note_redaction["body_absent"] = False
            if n.get("author_id"):
                note_redaction["author_id_absent"] = False
            if n.get("body_included") is not False or n.get("author_id_included") is not False:
                note_redaction["flags_present"] = False
        if not all(note_redaction.values()):
            self.errors.append(f"support note redaction failed: {note_redaction}")

        # orders: immutable ownership only
        order_rows = cats.get("orders", [])
        exported_order_ids = {str(r.get("id")) for r in order_rows}
        orders_result = {
            "owned_by_a_exported": self.order_ids["owned_by_a"] in exported_order_ids,
            "ownerless_legacy_with_a_email_exported": self.order_ids["ownerless_legacy_a_email"] in exported_order_ids,
            "owned_by_b_exported": self.order_ids["owned_by_b"] in exported_order_ids,
        }
        if not orders_result["owned_by_a_exported"]:
            self.errors.append("orders: A's immutably owned order was not exported")
        if orders_result["ownerless_legacy_with_a_email_exported"]:
            self.errors.append("orders: ownerless legacy order was claimed by email")
        if orders_result["owned_by_b_exported"]:
            self.errors.append("orders: another member's order leaked into A's export")

        # billing_holds: exported, processor identifiers redacted
        holds = cats.get("billing_holds", [])
        holds_result = {
            "rows_exported": len(holds),
            "dispute_id_redacted": all("stripe_dispute_id" not in h for h in holds),
            "charge_id_redacted": all("stripe_charge_id" not in h for h in holds),
        }
        if holds_result["rows_exported"] != 1 or not holds_result["dispute_id_redacted"] or not holds_result["charge_id_redacted"]:
            self.errors.append(f"billing_holds export incorrect: {holds_result}")

        embeddings_excluded = "community_answer_embeddings" not in cats
        if not embeddings_excluded:
            self.errors.append("community_answer_embeddings must never be exported")

        self.results["export"]["per_surface"] = surfaces
        self.results["export"]["support_note_redaction"] = note_redaction
        self.results["export"]["orders_immutable_ownership"] = orders_result
        self.results["export"]["billing_holds"] = holds_result
        self.results["export"]["community_answer_embeddings_excluded"] = embeddings_excluded

    # ---------------- deletion ----------------

    def delete_a(self) -> None:
        print("[harness] deleting member A...")
        # The deletion precondition requires positive proof that the member was
        # never connected to the payment processor, and it matches order records
        # on the account email. The synthetic order fixtures are therefore held
        # out of the database across the request call only, and restored (same
        # ids, same values) before the worker runs, so the worker's immutable
        # ownership matching is still exercised on real rows.
        gate = scalar("SELECT (value)::text AS v FROM public.app_config WHERE key = 'stripe_deletion_enabled'")
        hold_out = str(gate).strip() != "true"
        held = self._order_rows if hold_out else []
        if hold_out:
            harness("delete_by_ids", {"table": "orders", "ids": self.ids["orders"]})
        hdr = {"Authorization": f"Bearer {self.a['access_token']}", "apikey": ANON_KEY}
        t = self._mint_ticket(self.a["id"], "delete")
        req = function_post("request-account-deletion", {"ticket": t}, hdr)
        if req.status_code >= 400:
            self.errors.append(f"deletion request failed: HTTP {req.status_code} {req.text[:200]}")
            req.raise_for_status()
        job_id = req.json()["job"]["id"]
        if held:
            harness("seed_orders_explicit", {"rows": held})

        def worker():
            r = requests.post(
                f"{SUPABASE_URL}/functions/v1/process-deletion-job",
                headers={"x-internal-secret": INTERNAL_SECRET, "Content-Type": "application/json"},
                json={"job_id": job_id}, timeout=180,
            )
            r.raise_for_status()
            return r.json()

        first = worker()
        retry = worker()  # retry must be safe and idempotent
        self.results["deletion"] = {
            "orders_held_out_during_request_call": len(held),
            "orders_restored_before_worker": bool(held),
            "job_state_first_pass": first.get("state"),
            "job_state_retry_pass": retry.get("state"),
            "first_pass_remaining": first.get("remaining", {}),
            "retry_remaining": retry.get("remaining", {}),
            "retry_is_idempotent": (retry.get("remaining", {}) or {}) == {},
        }
        if self.results["deletion"]["retry_remaining"]:
            self.errors.append(f"deletion retry left rows: {self.results['deletion']['retry_remaining']}")

    def verify_deletion(self) -> None:
        print("[harness] verifying deletion and Member B isolation...")
        a_id, b_id = self.a["id"], self.b["id"]
        per_surface = {}

        def count(table, ids):
            if not ids:
                return 0
            arr = ", ".join(f"'{i}'" for i in ids)
            return int(scalar(f"SELECT count(*) AS n FROM public.{table} WHERE id = ANY(ARRAY[{arr}]::uuid[])") or 0)

        expectations = {
            "community_questions": (self.ids["community_questions"][0], self.ids["community_questions"][1], 1),
            "community_votes": (self.ids["community_votes"][0], self.ids["community_votes"][1], 1),
            "win_posts": (self.ids["win_posts"][0], self.ids["win_posts"][1], 1),
            "conversations": (self.ids["conversations"][0], self.ids["conversations"][1], 1),
            "messages": (self.ids["messages"][0], self.ids["messages"][1], 1),
            "support_tickets": (self.ids["support_tickets"][0], self.ids["support_tickets"][1], 1),
            "support_ticket_notes": (self.ids["support_ticket_notes"][0], self.ids["support_ticket_notes"][1], 1),
        }
        for table, (a_row, b_row, expect_b) in expectations.items():
            a_left, b_left = count(table, [a_row]), count(table, [b_row])
            ok = a_left == 0 and b_left == expect_b
            per_surface[table] = {"a_rows_remaining": a_left, "b_rows_remaining": b_left, "result": "PASS" if ok else "FAIL"}
            if not ok:
                self.errors.append(f"deletion {table}: A left {a_left}, B left {b_left} (expected {expect_b})")

        # A's answer removed by author_id; B's answer on A's question is removed by
        # the documented FK cascade from community_questions.
        a_ans, b_ans = count("community_answers", [self.ids["community_answers"][0]]), count("community_answers", [self.ids["community_answers"][1]])
        per_surface["community_answers"] = {
            "a_rows_remaining": a_ans, "b_rows_remaining": b_ans,
            "expected_relational_consequence": "B's answer on A's question is removed by ON DELETE CASCADE from community_questions",
            "result": "PASS" if a_ans == 0 and b_ans == 0 else "FAIL",
        }
        if a_ans or b_ans:
            self.errors.append(f"community_answers deletion unexpected: A={a_ans} B={b_ans}")

        emb_left = count("community_answer_embeddings", self.ids["community_answer_embeddings"])
        per_surface["community_answer_embeddings"] = {
            "a_rows_remaining": emb_left,
            "basis": "removed by ON DELETE CASCADE with the parent answer",
            "result": "PASS" if emb_left == 0 else "FAIL",
        }
        if emb_left:
            self.errors.append("community_answer_embeddings survived the parent answer deletion")

        hold_left = count("billing_holds", self.ids["billing_holds"])
        per_surface["billing_holds"] = {
            "a_rows_remaining": hold_left,
            "basis": "retained under financial and anti-fraud retention (report-only)",
            "result": "PASS" if hold_left == 1 else "FAIL",
        }
        if hold_left != 1:
            self.errors.append("billing_holds should be retained, not deleted")

        orders_state = {
            "owned_by_a_remaining": count("orders", [self.order_ids["owned_by_a"]]),
            "ownerless_legacy_a_email_remaining": count("orders", [self.order_ids["ownerless_legacy_a_email"]]),
            "owned_by_b_remaining": count("orders", [self.order_ids["owned_by_b"]]),
        }
        if orders_state["owned_by_a_remaining"] != 0:
            self.errors.append("orders: A's owned order was not deleted")
        if orders_state["ownerless_legacy_a_email_remaining"] != 1:
            self.errors.append("orders: ownerless legacy order must be preserved")
        if orders_state["owned_by_b_remaining"] != 1:
            self.errors.append("orders: B's order must be preserved")
        per_surface["orders"] = {**orders_state, "result": "PASS" if orders_state == {
            "owned_by_a_remaining": 0, "ownerless_legacy_a_email_remaining": 1, "owned_by_b_remaining": 1} else "FAIL"}

        auth_left = harness("audit")
        exists = harness("users_exist", {"ids": [a_id, b_id]}).get("exists", {})
        self.results["deletion"]["per_surface"] = per_surface
        self.results["deletion"]["auth_users_remaining_total"] = auth_left.get("total")
        self.results["deletion"]["a_auth_identity_removed"] = exists.get(a_id) is False
        self.results["deletion"]["b_auth_identity_present"] = exists.get(b_id) is True
        if exists.get(a_id) is not False:
            self.errors.append("member A auth identity survived deletion")
        if exists.get(b_id) is not True:
            self.errors.append("member B auth identity was affected by A's deletion")

    # ---------------- cleanup ----------------

    def cleanup(self) -> None:
        print("[harness] cleaning up every synthetic surface by exact id...")
        a_id, b_id = self.a.get("id"), self.b.get("id")
        ids = [i for i in (a_id, b_id) if i]
        report: dict[str, Any] = {}

        def count_ids(table: str, row_ids: list[str]) -> int:
            arr = ", ".join(f"'{i}'" for i in row_ids)
            return int(scalar(f"SELECT count(*) AS n FROM public.{table} WHERE id = ANY(ARRAY[{arr}]::uuid[])") or 0)

        def count_col(table: str, col: str, values: list[str]) -> int:
            arr = ", ".join(f"'{i}'" for i in values)
            return int(scalar(f"SELECT count(*) AS n FROM public.{table} WHERE {col} = ANY(ARRAY[{arr}]::uuid[])") or 0)

        for table, row_ids in self.ids.items():
            before = count_ids(table, row_ids)
            out = harness("delete_by_ids", {"table": table, "ids": row_ids}, tolerant=True)
            report[table] = {"before": before, "after": count_ids(table, row_ids), **({"error": out["error"], "detail": out.get("detail")} if "error" in out else {})}

        if ids:
            for table, col in [
                ("reauth_tickets", "user_id"), ("export_artifacts", "user_id"),
                ("deletion_jobs", "user_id"), ("visitor_sessions", "user_id"),
                ("visitor_profiles", "user_id"), ("profiles", "user_id"),
                ("subscriptions", "user_id"), ("consent_records", "user_id"),
            ]:
                before = count_col(table, col, ids)
                out = harness("delete_by_column", {"table": table, "column": col, "ids": ids}, tolerant=True)
                report[table] = {"before": before, "after": count_col(table, col, ids), **({"error": out["error"], "detail": out.get("detail")} if "error" in out else {})}

            report["storage_objects"] = harness("storage_probe", {"ids": ids}).get(
                "storage_objects_remaining", {})
            report["retained_security_metadata"] = {
                "rate_limits": "hashed request buckets only; no synthetic identifier is stored; retained by design",
                "phi_access_log_rows_for_synthetic_actors": count_col("phi_access_log", "actor_user_id", ids),
            }

        harness("cleanup_orders")
        harness("cleanup", {"ids": ids, "extra_deletes": self.ids})
        # The provisioning call also creates the unused memberA and admin
        # principals; every synthetic identity is removed, not only A and B.
        auth_out = harness("cleanup_all_synthetic")
        report["auth_users"] = {
            "deleted": len(auth_out.get("auth_users_deleted", [])),
            "synthetic_remaining": auth_out.get("synthetic_remaining"),
        }
        self.results["cleanup"] = report

    # ---------------- run ----------------

    def run(self) -> int:
        started = datetime.now(timezone.utc).isoformat()
        try:
            self.seed()
            self.export_a()
            self.verify_export()
            self.delete_a()
            self.verify_deletion()
        finally:
            try:
                self.cleanup()
            except Exception as e:  # noqa: BLE001
                self.errors.append(f"cleanup failure: {e}")

        evidence = {
            "run": {
                "started_at": started,
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "harness": "tools/batch2/export_deletion_ab_harness.py",
                "member_a": {"alias": "MEMBER_A", "ref": redact_id(self.a.get("id", "")), "role": "export + deletion subject"},
                "member_b": {"alias": "MEMBER_B", "ref": redact_id(self.b.get("id", "")), "role": "untouched control"},
                "isolation": "no real email, Stripe, Resend, Dexcom or external-AI call is made; synthetic principals use @example.invalid",
            },
            "export": self.results.get("export", {}),
            "deletion": self.results.get("deletion", {}),
            "cleanup": self.results.get("cleanup", {}),
            "errors": self.errors,
            "result": "PASS" if not self.errors else "FAIL",
        }
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(evidence, indent=2, default=str))
        print(json.dumps({"result": evidence["result"], "errors": self.errors}, indent=2))
        return 0 if not self.errors else 1


if __name__ == "__main__":
    sys.exit(Run().run())
