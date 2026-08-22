#!/usr/bin/env python3
"""Batch 1 POST-v2 — authority conformance gate.

Fail-closed checks tied to the approved authority document:

  1. Authority SHA-256 matches the approved digest.
  2. The 24 active VITA quotes are exactly the authority set (set equality),
     and every previously active quote is retired.
  3. Day 14 resolves to the erratum-corrected id.
  4. Active/retired counts match the approved figures.

Exit 1 on any failure.
"""
from __future__ import annotations

import hashlib
import json
import pathlib
import re
import subprocess
import sys
import unicodedata

AUTHORITY_SHA = "a44e1f3cd599e6810dce140ad5b6a9f5046c23dbdd7f3c9772360c134b052788"
AUTHORITY_PATHS = [
    pathlib.Path("/tmp/user-uploads/DRM_Batch1_Clinical_and_Owner_Approval_Appendix.md"),
    pathlib.Path("/mnt/user-uploads/DRM_Batch1_Clinical_and_Owner_Approval_Appendix.md"),
]
DAY_14_ID = "ec4ea88d-6773-43c5-8ef9-6248b02e963d"
EXPECTED = {"daily_actions_active": 180, "daily_actions_inactive": 7,
            "vita_active": 24, "vita_retired": 105}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s)
    s = (s.replace("\u201c", '"').replace("\u201d", '"')
          .replace("\u2018", "'").replace("\u2019", "'")
          .replace("\u2014", "-").replace("\u2013", "-"))
    return re.sub(r"\s+", " ", s).strip().rstrip('"').lstrip('"').strip()


def psql(sql: str):
    out = subprocess.run(["psql", "-At", "-c", sql],
                         capture_output=True, text=True, check=True).stdout
    return out.strip()


def main() -> int:
    fails = []
    path = next((p for p in AUTHORITY_PATHS if p.exists()), None)
    if path is None:
        print("FAIL: authority document not found")
        return 1
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != AUTHORITY_SHA:
        fails.append(f"authority digest mismatch: {digest}")

    text = path.read_text()
    section8 = text.split("## 8. VITA quote library")[1].split("## 9.")[0]
    authority_quotes = {norm(m.group(1)) for m in
                        re.finditer(r"^\d+\.\s+[“\"](.+?)[”\"]\s*$", section8, re.M)}
    if len(authority_quotes) != 24:
        fails.append(f"parsed {len(authority_quotes)} authority quotes, expected 24")

    live = {norm(q) for q in psql(
        "select quote_text from vita_quotes where is_active").splitlines() if q.strip()}
    missing = sorted(authority_quotes - live)
    extra = sorted(live - authority_quotes)
    if missing:
        fails.append(f"{len(missing)} authority quotes not active: {missing[:3]}")
    if extra:
        fails.append(f"{len(extra)} active quotes not in authority: {extra[:3]}")

    counts = {
        "daily_actions_active": int(psql("select count(*) from daily_actions where is_active")),
        "daily_actions_inactive": int(psql("select count(*) from daily_actions where not is_active")),
        "vita_active": int(psql("select count(*) from vita_quotes where is_active")),
        "vita_retired": int(psql("select count(*) from vita_quotes where not is_active")),
    }
    for k, v in EXPECTED.items():
        if counts[k] != v:
            fails.append(f"count {k}={counts[k]}, expected {v}")

    day14 = psql("select id from daily_actions where day_number = 14 and is_active")
    if day14 != DAY_14_ID:
        fails.append(f"Day 14 id is {day14!r}, expected {DAY_14_ID}")

    print(json.dumps({"authority_sha256": digest, "counts": counts,
                      "day_14_id": day14, "vita_set_equality": not (missing or extra),
                      "failures": fails}, indent=1))
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
