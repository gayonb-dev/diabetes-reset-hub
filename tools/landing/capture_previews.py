"""Capture genuine member-app screenshots in an isolated local environment.

Isolation rules enforced here:
  * Every request to the backend host (Auth, PostgREST, Edge Functions,
    Realtime, Storage) is intercepted and answered from local fixtures.
  * Any request to a non-local, non-intercepted host is aborted and logged.
  * No production identity is created, no auth setting changed, no payment,
    email, AI or member mutation is performed.

Run: python3 tools/landing/capture_previews.py
Outputs: public/previews/*.png plus docs/evidence/landing-preview/network-log.json
"""

import asyncio
import datetime as _dt
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, str(Path(__file__).parent))
from fixtures import TABLES, RPC, SESSION, USER  # noqa: E402

from playwright.async_api import async_playwright  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "previews"
EVIDENCE = ROOT / "docs" / "evidence" / "landing-preview"
OUT.mkdir(parents=True, exist_ok=True)
EVIDENCE.mkdir(parents=True, exist_ok=True)

BASE = "http://localhost:8080"


def read_env(name: str) -> str:
    for line in (ROOT / ".env").read_text().splitlines():
        if line.startswith(name + "="):
            return line.split("=", 1)[1].strip().strip('"')
    raise SystemExit("missing " + name)


SUPABASE_URL = read_env("VITE_SUPABASE_URL").rstrip("/")
SUPABASE_HOST = urlparse(SUPABASE_URL).hostname
PROJECT_REF = SUPABASE_HOST.split(".")[0]

network_log = {"intercepted": [], "blocked": []}

# Some surfaces unlock later in the programme. Workouts genuinely unlock at
# Day 29, so that preview is captured for a synthetic member further along —
# the same real component and route, only a different synthetic start date.
PROGRAM_START_OVERRIDE = {"workouts": 40}
_start_override = None

SHOTS = [
    ("today", "/app", None),
    ("meals", "/app/meals", None),
    # A tab name is not proof of the feature behind it: the shopping list is
    # captured with "By meal" actually selected.
    ("meals-shopping", "/app/meals?tab=shopping", "By meal"),
    ("progress", "/app/progress", None),
    ("workouts", "/app/workouts", None),
    ("learn", "/app/learn", "Guides"),
    ("ask", "/app/ask", None),
    ("report", "/app/progress/report", None),
]



DATE_FIELDS = {"log_date", "measured_on", "reading_date"}


def _matches(row, key, raw):
    """Minimal PostgREST filter evaluation for the operators the app uses."""
    if "." not in raw:
        return True
    op, _, want = raw.partition(".")
    val = row.get(key)
    def num(x):
        try:
            return float(x)
        except (TypeError, ValueError):
            return None
    if isinstance(val, bool):
        val = "true" if val else "false"
    if op == "eq":
        return str(val) == want
    if op == "neq":
        return str(val) != want
    if op == "is":
        return (val is None) if want == "null" else str(val).lower() == want
    if op == "in":
        return str(val) in [v.strip('"') for v in want.strip("()").split(",")]
    a, b = num(val), num(want)
    if a is None or b is None:
        # Fall back to lexical comparison (dates and timestamps sort correctly).
        a, b = str(val), want
    return {
        "gt": a > b, "gte": a >= b, "lt": a < b, "lte": a <= b,
    }.get(op, True)


def rest_response(path: str, query: str, headers: dict):
    table = path.split("/rest/v1/")[1].split("?")[0]
    rows = [dict(r) for r in TABLES.get(table, [])]
    if table == "profiles" and _start_override:
        started = (_dt.date.today() - _dt.timedelta(days=_start_override - 1)).isoformat()
        for r in rows:
            if "program_start_date" in r:
                r["program_start_date"] = started
    params = parse_qs(query, keep_blank_values=True)
    for key, values in params.items():
        if key in ("select", "order", "limit", "offset", "on_conflict", "columns"):
            continue
        raw = values[0]
        if not rows or key not in rows[0]:
            continue
        # "Today" depends on the browser's timezone, so re-stamp day-keyed
        # fixture rows onto the requested date instead of filtering them away.
        if key in DATE_FIELDS and raw.startswith("eq."):
            for r in rows:
                r[key] = raw[3:]
            continue
        rows = [r for r in rows if _matches(r, key, raw)]
    order = params.get("order", [None])[0]
    if order:
        field, _, direction = order.partition(".")
        if rows and field in rows[0]:
            rows.sort(key=lambda r: (r.get(field) is None, r.get(field)), reverse="desc" in direction)
    limit = params.get("limit", [None])[0]
    if limit and limit.isdigit():
        rows = rows[: int(limit)]
    accept = headers.get("accept", "")
    if "vnd.pgrst.object" in accept:
        return json.dumps(rows[0]) if rows else json.dumps(None)
    return json.dumps(rows)


async def handle_backend(route, request):
    url = request.url
    path = urlparse(url).path
    query = urlparse(url).query
    method = request.method
    network_log["intercepted"].append({"method": method, "path": path, "query": query})

    hdrs = {k.lower(): v for k, v in request.headers.items()}
    cors = {
        "access-control-allow-origin": "*",
        "content-type": "application/json",
    }

    if method == "OPTIONS":
        await route.fulfill(status=204, headers=cors, body="")
        return

    # No write ever reaches a real service; writes are acknowledged locally.
    if "/auth/v1/" in path:
        if path.endswith("/user"):
            body = json.dumps(USER)
        elif path.endswith("/token"):
            body = json.dumps(SESSION)
        elif path.endswith("/logout"):
            body = "{}"
        else:
            body = json.dumps(SESSION)
        await route.fulfill(status=200, headers=cors, body=body)
        return

    if "/rest/v1/rpc/" in path:
        if path.endswith("/current_program_day") and _start_override:
            await route.fulfill(status=200, headers=cors, body=json.dumps(_start_override))
            return
        name = path.split("/rpc/")[1]
        await route.fulfill(status=200, headers=cors, body=json.dumps(RPC.get(name, None)))
        return

    if "/rest/v1/" in path:
        if method in ("POST", "PATCH", "DELETE"):
            await route.fulfill(status=200, headers=cors, body="[]")
            return
        await route.fulfill(status=200, headers=cors, body=rest_response(path, query, hdrs))
        return

    if "/functions/v1/" in path:
        # Includes checkout creation: never allowed to reach a real function.
        await route.fulfill(status=200, headers=cors, body=json.dumps({"ok": True, "mocked": True}))
        return

    await route.fulfill(status=200, headers=cors, body="{}")


async def guard(route, request):
    host = urlparse(request.url).hostname or ""
    if host in ("localhost", "127.0.0.1", "fonts.googleapis.com", "fonts.gstatic.com"):
        await route.continue_()
        return
    if host == SUPABASE_HOST:
        await handle_backend(route, request)
        return
    network_log["blocked"].append(request.url)
    await route.abort()


async def main():
    assert PROJECT_REF == "wqennhjdojjqmmqzjhti", "unexpected project ref: " + PROJECT_REF
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        await context.route("**/*", guard)
        page = await context.new_page()
        page.on("console", lambda m: None)

        await page.goto(BASE + "/", wait_until="domcontentloaded")
        await page.evaluate(
            "([k, v]) => window.localStorage.setItem(k, v)",
            ["sb-%s-auth-token" % PROJECT_REF, json.dumps(SESSION)],
        )

        global _start_override
        for name, route_path, _variant in SHOTS:
            _start_override = PROGRAM_START_OVERRIDE.get(name)
            await page.goto(BASE + route_path, wait_until="domcontentloaded")
            await page.wait_for_timeout(2500)
            full = OUT / ("%s.png" % name)
            await page.screenshot(path=str(full))
            print("captured", name, page.url)

        await browser.close()

    (EVIDENCE / "network-log.json").write_text(json.dumps(network_log, indent=2))
    print("blocked hosts:", sorted({urlparse(u).hostname for u in network_log["blocked"]}))


if __name__ == "__main__":
    asyncio.run(main())
