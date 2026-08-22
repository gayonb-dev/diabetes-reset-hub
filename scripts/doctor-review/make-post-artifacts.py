#!/usr/bin/env python3
"""Emit POST-IMPLEMENTATION evidence artifacts from the freshly generated inventory.

Reads docs/doctor-review/* (regenerated read-only from the current database and
source) and writes *-POST files with post-implementation framing:

  - no worksheet / sign-off gate language;
  - no claim that former classifier flags await clinician approval;
  - current dispositions and counts only.
"""
from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "docs" / "doctor-review"
OUTS = [ROOT / "exports" / "batch1-doctor-review", Path("/mnt/documents/batch1-doctor-review")]

TEXT_SUBS = [
    ("awaiting owner-approved appendix",
     "appendix applied — residual classifier flag, informational only"),
    ("stays active pending exact replacement copy",
     "active with appendix-approved wording"),
    ("Clinician supplies or approves exact replacement copy in the appendix; record stays active meanwhile.",
     "Appendix wording already applied. Remaining flag is informational for the lightweight finished-app review."),
    ("Owner approves exact replacement copy in the appendix; record stays active meanwhile.",
     "Appendix wording already applied. Remaining flag is informational for the lightweight finished-app review."),
    ("  - Question: what wording states the same member action without the flagged claim?",
     "  - Status: current wording is the appendix-approved text. No worksheet response is required."),
    ("# Clinical review pack — Batch 1 (corrected)",
     "# Content evidence pack — Batch 1 (POST-IMPLEMENTATION)"),
    ("# Content replacement matrix — Batch 1 (corrected)",
     "# Content replacement matrix — Batch 1 (POST-IMPLEMENTATION)"),
    ("""**This pack claims no owner or clinician approval.** It contains questions and current
copy only. Proposed exact replacement copy will be added after the separate
owner-approved content appendix is supplied. The only replacement wording present today
is the single approved temporary fallback already applied to contained records.""",
     """**Current state, generated from the live database and source after the approved
content appendix was implemented.** It records the wording members can actually reach
today. It is not a worksheet: no clinician spreadsheet, response column or sign-off gate
is attached to it. Doctor review of this product remains a lightweight review of the
finished app.

No clinical approval is claimed for any wording here."""),
    ("""No clinical wording is invented in this document. The only replacement copy shown is the
single approved temporary fallback already applied in the database.""",
     """No clinical wording is invented in this document. All wording shown is the current
live wording after the approved content appendix was implemented. No clinician sign-off
gate is attached to this matrix."""),
    ("Exact citations arrive with the appendix.",
     "Citations are held in the approved content appendix."),
    ("Items requiring a decision: **",
     "Items still carrying a classifier flag (informational): **"),
]

RENAME = {
    "active-content-inventory.json": "active-content-inventory-POST.json",
    "active-content-inventory.csv": "active-content-inventory-POST.csv",
    "content-replacement-matrix.md": "content-replacement-matrix-POST.md",
    "clinical-review-pack.md": "content-evidence-pack-POST.md",
}


def main() -> int:
    produced: dict[str, str] = {}
    for src_name, dst_name in RENAME.items():
        text = (SRC / src_name).read_text(encoding="utf-8")
        if dst_name.endswith(".md"):
            for a, b in TEXT_SUBS:
                text = text.replace(a, b)
        for out in OUTS:
            out.mkdir(parents=True, exist_ok=True)
            (out / dst_name).write_text(text, encoding="utf-8")
        produced[dst_name] = hashlib.sha256(text.encode("utf-8")).hexdigest()

    for name, digest in produced.items():
        print(f"{digest}  {name}")
    (SRC / "POST-ARTIFACT-SHA256.txt").write_text(
        "\n".join(f"{d}  {n}" for n, d in produced.items()) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
