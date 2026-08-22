#!/usr/bin/env python3
"""Batch 1 POST-v2 — authority-wide banned-content patterns.

Single source of truth for the fail-closed scan, shared by the Python
inventory/scan tooling. Each entry is (category, regex).

Counting is done two ways everywhere: distinct records and individual field
strings. A "field string" is one text column value, or one element of a JSON
`sub_tasks` array.
"""
from __future__ import annotations

import re

# Approved neutral phrasings that must never be flagged (exact-shape allowances).
APPROVED_NEUTRAL = [
    re.compile(r"^\s*\d{1,3}\s*oz logged today\s*$", re.I),
    re.compile(r"^\s*\d{1,3}\s*oz\s*$", re.I),
]

# Safe negations and neutral education that must never be flagged.
SAFE_NEGATION = re.compile(
    r"(does not (promise|diagnose|claim|sell|require|prescribe|interpret|set)"
    r"|is not cure|not a cure|never start, stop, skip or change"
    r"|are not required|is not required|not established by one"
    r"|no app-imposed|without assuming|does not tell the whole story"
    r"|are unavailable|is not available|belongs? with your healthcare"
    r"|only a qualified healthcare professional)",
    re.I,
)


BANNED: list[tuple[str, re.Pattern]] = [
    ("hydration_target", re.compile(
        r"(water target|water goal|hydration target|half your body weight in ounces"
        r"|\b\d{2,3}\s*(oz|ounces)\b|full water goal|hit your water|before 6 ?pm"
        r"|front-?load(ing)? hydration|water intake goal|half your water"
        r"|full target|water by \d+ ?(am|pm))", re.I)),
    ("fasting_scheduling", re.compile(
        r"(before the first meal|before breakfast|eating window|fasting window"
        r"|16:8|12:12|stop eating by|overnight fast)", re.I)),
    ("snack_window", re.compile(r"(snack window|snack 1 exactly|two and a half hours after)", re.I)),
    ("perfection_mandatory", re.compile(
        r"(all (four )?rings|all rings|rings closed|log everything|no zero days"
        r"|full compliance|fully compliant|non-?compliant|\bcompliant\b"
        r"|no exceptions|no shortcuts|hold the line|hit the target"
        r"|\bcleanly\b|must (log|close|complete)|every single day)", re.I)),
    ("universal_meal_requirement", re.compile(
        r"(at every meal|at all meals|every meal|all meals|protein at every"
        r"|palm-?sized protein)", re.I)),
    ("forced_progression", re.compile(
        r"(add (a|one) (extra )?set|added set|extra set|every waking hour"
        r"|all 3 walks|all three walks|\b3 walks\b|three walks|all walks"
        r"|increase (the )?(reps|sets) (each|every))", re.I)),
    ("mandatory_sharing_tracking", re.compile(
        r"(share (your )?(a1c|result|number|glucose|weight) (with|in) the community"
        r"|post (your )?(a1c|result) to|must (share|post|measure|track|weigh))", re.I)),
    ("a1c_test_prep", re.compile(
        r"(test[- ]prep|prepare for tomorrow'?s test|earn your a1c|a1c can'?t be crammed"
        r"|schedule your a1c|get the a1c (drawn|done|tested)|second a1c|a1c countdown"
        r"|days (until|to) your a1c|before your a1c test|anchors everything)", re.I)),
    ("outcome_claim", re.compile(
        r"(guaranteed results?|typical results|will (lower|drop|reduce|fall)"
        r"|lowers? (your )?(a1c|blood sugar|post-?meal glucose)|drops? \d+ points"
        r"|by up to \d+ ?%|works? immediately|measurable proof|is repeatable"
        r"|predict your a1c|blood sugar medicine|glucose repair|insulin[- ]sensitivity boost"
        r"|moves glucose into your muscles|glucose sponge|prevents evening cravings)", re.I)),
    ("reversal_cure", re.compile(
        r"(reverse (your |the )?diabetes|\breversal\b|\bcures?\b)", re.I)),
    ("shame_food", re.compile(
        r"(cheat meal|cheat day|bad food|guilt[- ]free|clean eating|textbook (meal|plate)"
        r"|willpower failure)", re.I)),
    ("supplement_product", re.compile(
        r"(berberine|chromium picolinate|cinnamon capsule|alpha[- ]lipoic"
        r"|recommended stack|take \d+\s*mg)", re.I)),
    ("diagnostic_gamification", re.compile(
        r"(normal zone|diabetic zone|pre-?diabetic zone|you are (pre-?)?diabetic)", re.I)),
    ("founder_monitoring", re.compile(
        r"(gayon (personally )?(reviews|monitors|checks)|personally reviews every"
        r"|founder reviews your)", re.I)),
]


def scan_text(text: str) -> list[str]:
    """Return banned categories present in `text`, honouring safe negations."""
    if not text:
        return []
    if any(p.match(text) for p in APPROVED_NEUTRAL):
        return []
    hits = []

    for name, pat in BANNED:
        for m in pat.finditer(text):
            # A safe negation anywhere in the same sentence clears the hit.
            start = max(0, text.rfind(".", 0, m.start()) + 1)
            end = text.find(".", m.end())
            sentence = text[start: end if end != -1 else len(text)]
            if SAFE_NEGATION.search(sentence):
                continue
            hits.append(name)
            break
    return hits
