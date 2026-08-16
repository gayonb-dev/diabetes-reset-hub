#!/usr/bin/env python3
"""Batch 1 Part A — classifier regression fixtures.

FALSE_NEGATIVES: every example the QA review found wrongly classified `KEEP`.
Each must classify to a non-KEEP disposition.

FALSE_POSITIVES: approved education-only safety content and the educational
statement of the consensus remission definition. Each must classify to
`KEEP — APPROVED EDUCATION`.

The inventory generator runs these first and refuses to emit artifacts when any
fixture fails.
"""
from __future__ import annotations

import sys

from classify import KEEP_EDU, classify

FALSE_NEGATIVES: list[str] = [
    "Calculate your personal daily water target (half your body weight in ounces)",
    "This single change lowers post-meal glucose spikes — and it works immediately.",
    "It moves glucose into your muscles instead of your bloodstream.",
    "Eat snack 1 exactly two and a half hours after breakfast — it keeps blood sugar from dipping into cravings territory.",
    "This is your first measurable proof.",
    "Muscle contractions pull glucose out of your bloodstream without needing insulin's help.",
    "You're collecting evidence that this works on YOUR body.",
    "No zero days.",
    "Full Compliance Day",
    "fully compliant",
    "No shortcuts. Prove you own this skill.",
    "Thirty separate interventions on your glucose.",
    "Muscle Is Your Glucose Sponge — building the machinery that handles it forever.",
    "Fat loss and glucose repair continue even when weight pauses.",
    "Every day you log is already writing your A1C.",
    "Your body is producing measurably different insulin responses.",
    "Guard the dinner walk like it's medicine — because it is.",
    "Stress hormones raise glucose without a bite of food. It's metabolic.",
    "Schedule your A1C at a lab, pharmacy, or use a home kit this week.",
    "A1C can't be crammed for. It can only be earned.",
    "Your average is transformed.",
    "Get the A1C drawn this week.",
    "A falling A1C means your body responded. That response is repeatable.",
    "Your medication needs may have changed — review them on Day 90.",
    "Palm-sized protein at every meal, no exceptions.",
    "Earlier windows suit type 2 diabetes better, so adjust your fasting start time.",
    "Your second A1C test is 35 days out.",
    "Hold the line — no experiments this close to a test.",
    "The three numbers that matter for blood sugar. Skip the rest.",
    "A word-for-word script for asking about dose reductions as your numbers improve.",
    "Eating vegetables first lowers post-meal glucose by up to 30% on the DRM plate.",
    "Why Strength Training Is Blood Sugar Medicine",
    "The single most effective thing you can do for blood sugar today.",
    "5 moves, 12 minutes. Builds the muscle that uses glucose.",
]

FALSE_POSITIVES: list[str] = [
    "The Diabetes Reset Method does not sell, require or prescribe supplements. "
    "Evidence for most diabetes supplements is limited, products may interact with "
    "medicines, and you should discuss any supplement with your healthcare professional.",
    "Fasting scheduling is not available in this membership. Fasting can cause low or "
    "high blood glucose, dehydration and medication interactions; discuss with your "
    "healthcare team before changing when you eat.",
    "Remission is generally defined as an A1C below 6.5% for at least three months "
    "without glucose-lowering medication. This is education about the consensus "
    "definition; continued observation with your healthcare team remains necessary.",
    "Activity may help glucose management, but individual responses vary and glucose "
    "can rise or fall depending on your treatment. Discuss with your healthcare team.",
]


def run() -> int:
    failures: list[str] = []
    for text in FALSE_NEGATIVES:
        res = classify(text)
        if res["disposition"] == KEEP_EDU:
            failures.append(f"FALSE NEGATIVE not caught: {text[:90]!r}")
    for text in FALSE_POSITIVES:
        res = classify(text)
        if res["disposition"] != KEEP_EDU:
            failures.append(
                f"FALSE POSITIVE (approved education flagged {res['disposition']}): {text[:90]!r}")
    for f in failures:
        print("FIXTURE FAIL:", f, file=sys.stderr)
    print(f"fixtures: {len(FALSE_NEGATIVES)} false-negative, {len(FALSE_POSITIVES)} "
          f"false-positive, failures={len(failures)}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(run())
