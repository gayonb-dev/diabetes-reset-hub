#!/usr/bin/env python3
"""Batch 1 POST-v2 — fail-closed source/bundle content scan.

Scans member-facing source surfaces (client source, Edge Function prompts and
copy, seeds) plus, when present, the production bundle, using the shared
banned-pattern set in banned.py.

Usage: python3 scan_src.py [--bundle dist]
Exit code 1 when any banned string is found.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from banned import scan_text  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]

SURFACES = [
    ("client_source", "src", (".ts", ".tsx")),
    ("edge_functions", "supabase/functions", (".ts",)),
]

# Applied migration files are an immutable historical record of past database
# state. They are not a member read path: what members see is the live database,
# which is scanned separately by scan_db.py and must be at zero. Hits here are
# reported as `historical_superseded` and do not fail the gate.
HISTORICAL = [("seeds_historical", "supabase/migrations", (".sql",))]


# Non-member-facing files: scanners, tests and fixtures deliberately contain
# the banned strings so that the gate itself is regression-tested.
EXCLUDE = re.compile(
    r"(scripts/doctor-review/|/__tests__/|\.test\.|appendixContentScan|"
    r"banned\.py|exports/|node_modules/)")

STRING_LITERAL = re.compile(r"""(?:"([^"\n]{6,})"|'([^'\n]{6,})'|`([^`]{6,})`)""")


def scan_file(path: pathlib.Path) -> list[dict]:
    out = []
    try:
        text = path.read_text(errors="ignore")
    except OSError:
        return out
    for i, line in enumerate(text.splitlines(), 1):
        if line.lstrip().startswith(("//", "*", "/*")):
            continue
        for m in STRING_LITERAL.finditer(line):
            s = next(g for g in m.groups() if g is not None)
            cats = scan_text(s)
            if cats:
                out.append({"file": str(path.relative_to(ROOT)), "line": i,
                            "categories": cats, "text": s[:200]})
    return out


def main() -> int:
    bundle = None
    if "--bundle" in sys.argv:
        bundle = ROOT / sys.argv[sys.argv.index("--bundle") + 1]

    hits, surfaces = [], {}
    for name, rel, exts in SURFACES:
        base = ROOT / rel
        files = [p for p in base.rglob("*")
                 if p.suffix in exts and not EXCLUDE.search(str(p))]
        found = [h for p in files for h in scan_file(p)]
        surfaces[name] = {"files": len(files), "hits": len(found)}
        hits += found

    if bundle and bundle.exists():
        files = [p for p in bundle.rglob("*") if p.suffix in (".js", ".css", ".html")]
        found = [h for p in files for h in scan_file(p)]
        surfaces["production_bundle"] = {"files": len(files), "hits": len(found)}
        hits += found

    report = {"surfaces": surfaces, "hit_count": len(hits), "hits": hits}
    print(json.dumps(report, indent=1))
    return 1 if hits else 0


if __name__ == "__main__":
    raise SystemExit(main())
