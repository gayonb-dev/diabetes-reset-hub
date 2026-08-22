#!/usr/bin/env python3
"""Batch 1 POST-v2 — deterministic daily_actions remediation generator.

Reads the live active daily_actions, applies the approved neutral rewrite rules
(day-level overrides + exact sub-task/string map), fail-closed re-scans every
proposed value, and emits:

  /tmp/postv2/manifest.json          per-record before/after
  /tmp/postv2/remediate.sql          guarded, ID-addressed forward migration
  /tmp/postv2/rollback.sql           guarded, ID-addressed rollback

Nothing is applied by this script.
"""
from __future__ import annotations

import json
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from banned import scan_text  # noqa: E402

OUT = pathlib.Path("/tmp/postv2")
FIELDS = ("day_name", "action_title", "action_description",
          "learning_objective", "sub_tasks")

# ---------------------------------------------------------------- canon text
MOVE_OPTION = "One comfortable movement option, if it is safe for you"
MOVE_SCHED = "Workout or a comfortable movement option that fits your schedule"
MOVE_PACE = "Workout at a pace that suits you, or a comfortable movement option"
MOVE_BREAK = "Break up sitting with a short movement break when it suits you"
WATER_LOG = "Log the water you drink, if that is useful to you"
MEAL_PLATE = "Try the plate method at one meal"
MEAL_LOG = "Log one meal, if that is useful to you"
PROTEIN = "Include a protein food at one meal if it fits your plan"
LOG_USEFUL = "Log what is useful to you today"
ROUTINE_ONE = "Choose and log one useful routine today"
MOVE_OR_REST = "Choose movement or rest that fits today"

# Exact whole-string sub-task / short-field replacements.
STRING_MAP = {
    "complete all 3 walks": "Choose one comfortable movement option if it is safe for you",
    "complete all 3 walks (indoor counts)":
        "Choose one comfortable indoor or outdoor movement option if it is safe for you",
    "all 3 walks complete": MOVE_OPTION,
    "all 3 walks": MOVE_OPTION,
    "3 walks or workout": "A comfortable movement option or workout",
    "walks or workout": MOVE_OR_REST,
    "walks/workout per schedule": MOVE_SCHED,
    "workout or 3 walks per your schedule": MOVE_SCHED,
    "workout, or 3 walks per your schedule": MOVE_SCHED,
    "workout (+1 set on one exercise) or 3 walks": MOVE_PACE,
    "workout with one added set, or 3 walks": MOVE_PACE,
    "all walks or workout complete": "Movement or workout done, if it suited you",
    "stand or move 2 minutes every waking hour": MOVE_BREAK,
    "move two minutes every waking hour":
        "Break up one period of sitting with a short movement break",
    "keep 2 of your 3 post-meal walks (workout replaces one)":
        "Keep a comfortable movement option if it suits you",
    "water target": WATER_LOG,
    "hit your water target": WATER_LOG,
    "half your water target by 2 pm": WATER_LOG,
    "hit the full water target by evening": WATER_LOG,
    "half your water by 2 pm": WATER_LOG,
    "full target by evening": "Keep water available through the day",
    "water before all meals and snacks": "Keep water available with meals and snacks",
    "all meals logged": MEAL_LOG,
    "all meals plate-method": MEAL_PLATE,
    "3 plate-method meals": MEAL_PLATE,
    "protein at every meal today": PROTEIN,
    "protein at all meals": PROTEIN,
    "protein at every meal": PROTEIN,
    "protein-first at all meals": PROTEIN,
    "log everything": LOG_USEFUL,
    "log everything as usual": LOG_USEFUL,
    "all rings": ROUTINE_ONE,
    "all rings today": ROUTINE_ONE,
    "all rings closed": ROUTINE_ONE,
    "all rings closed today": ROUTINE_ONE,
    "all four rings": ROUTINE_ONE,
    "all four rings closed": ROUTINE_ONE,
    "explain the snack window to one person":
        "Describe your own routine to one person, if you want to",
    "keep both snacks in the window":
        "Choose a snack only if it fits your care plan",
    "prepare for tomorrow's test and measurement":
        "Use your familiar routines; do not change them because of an upcoming test",
    "review your progress report": "Review your Progress report",
}

# Day-level overrides (whole-day coherence). Keys are day_number.
DAY_OVERRIDES: dict[int, dict[str, object]] = {
    1: {
        "action_description":
            "Try the plate method at one meal today: about half non-starchy "
            "vegetables, one quarter protein foods and one quarter carbohydrate "
            "foods. Adjust the foods and portions to your preferences and care plan.",
        "learning_objective": "Practise the plate method structure at one meal.",
    },
    2: {
        "day_name": "Day 2: Log Water",
        "action_title": "Log Water",
        "learning_objective": "Practise recording the water you drink.",
    },
    8: {
        "action_description":
            "If it is safe and practical for you, try a comfortable walk after a "
            "meal today. Choose the length and pace that suit you.",
        "learning_objective": "Notice how a comfortable walk after a meal feels for you.",
    },
    11: {
        "day_name": "Day 11: Hydration Routine",
        "action_title": "Hydration Routine",
        "action_description":
            "Keep water available and take regular drinks during the day. If a "
            "healthcare professional has given you a fluid limit or different "
            "advice, follow that advice.",
        "learning_objective": "Find a hydration routine that fits your day.",
    },
    24: {
        "day_name": "Day 24: Sleep Support",
        "action_title": "Day 24 — Sleep Support",
    },
    40: {
        "action_description":
            "You are at Day 40. Nothing new today — use the routines that already "
            "fit you and notice which ones feel manageable.",
    },
    65: {
        "day_name": "Day 65: Water With Meals",
        "action_title": "Day 65 — Water With Meals",
        "action_description":
            "Thirst and hunger can feel similar. Try a glass of water with a meal "
            "or snack today and notice how you feel.",
    },
    67: {
        "day_name": "Day 67: Talk Through Your Routine",
        "action_title": "Day 67 — Talk Through Your Routine",
        "action_description":
            "Snacks are optional. If a snack fits your care plan, choose a time and "
            "food that work with your hunger, medicines, activity and daily "
            "schedule. If you like, describe your own routine to someone.",
    },
    69: {
        "day_name": "Day 69: A Short Stress Pause",
        "action_title": "Day 69 — A Short Stress Pause",
    },
    97: {
        "action_description":
            "No new tactics this week. Use the routines that already fit you and "
            "notice which ones feel manageable.",
    },
    125: {
        "action_description":
            "Nothing new today. Use the routines that already fit you.",
    },
    145: {
        "day_name": "Day 145: Reviewing Your Progress Report",
        "action_title": "Day 145 — Reviewing Your Progress Report",
    },
    153: {
        "action_description":
            "A simple routine can be easy to overlook. Log the water you drink "
            "today if that is useful to you.",
    },
    157: {
        "day_name": "Day 157: Strength at Your Own Pace",
        "action_title": "Day 157 — Strength at Your Own Pace",
        "action_description":
            "If a workout has felt comfortable for a while, you may choose to do a "
            "little more. Changing or keeping your current level is equally fine.",
    },
    166: {
        "day_name": "Day 166: A Movement Break That Fits Your Day",
        "action_title": "Day 166 — A Movement Break That Fits Your Day",
        "action_description":
            "If it is safe and practical for you, choose a comfortable movement "
            "break at a time that fits your day. Record a reading only if it is "
            "part of your plan.",
        "sub_tasks": [
            "Choose a safe movement break at a time that suits you",
            "Record a reading only if it is part of your plan",
            "Use a meal routine that fits you",
        ],
    },
}


def q(v) -> str:
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def jq(v) -> str:
    return "'" + json.dumps(v).replace("'", "''") + "'::jsonb"


def load_rows() -> list[dict]:
    sql = ("select json_agg(t) from (select id,day_number,day_name,action_title,"
           "action_description,learning_objective,sub_tasks from daily_actions "
           "where is_active order by day_number) t")
    out = subprocess.run(["psql", "-At", "-c", sql],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out.strip())


def remap(s: str) -> str:
    if not isinstance(s, str):
        return s
    return STRING_MAP.get(s.strip().lower(), s)


def main() -> int:
    rows = load_rows()
    assert len(rows) == 180, f"expected 180 active daily actions, got {len(rows)}"
    OUT.mkdir(parents=True, exist_ok=True)

    manifest, fwd, back, rejected = [], [], [], []
    for r in rows:
        ov = DAY_OVERRIDES.get(r["day_number"], {})
        new = {}
        for f in FIELDS:
            cur = r[f]
            if f in ov:
                val = ov[f]
            elif f == "sub_tasks":
                val = [remap(x) for x in (cur or [])]
            else:
                val = remap(cur) if isinstance(cur, str) else cur
            if val != cur:
                new[f] = val
        if not new:
            continue
        # fail-closed: proposed values must be clean
        for f, val in new.items():
            for s in (val if isinstance(val, list) else [val]):
                if s and scan_text(s):
                    rejected.append((r["day_number"], f, s, scan_text(s)))
        manifest.append({"id": r["id"], "day_number": r["day_number"],
                         "before": {f: r[f] for f in new},
                         "after": new})
        sets, guards, rsets, rguards = [], [], [], []
        for f, val in new.items():
            if f == "sub_tasks":
                sets.append(f"{f} = {jq(val)}")
                guards.append(f"{f} = {jq(r[f] or [])}")
                rsets.append(f"{f} = {jq(r[f] or [])}")
                rguards.append(f"{f} = {jq(val)}")
            else:
                sets.append(f"{f} = {q(val)}")
                guards.append(f"{f} IS NOT DISTINCT FROM {q(r[f])}")
                rsets.append(f"{f} = {q(r[f])}")
                rguards.append(f"{f} IS NOT DISTINCT FROM {q(val)}")
        fwd.append(f"UPDATE public.daily_actions SET {', '.join(sets)}\n"
                   f"  WHERE id = '{r['id']}' AND is_active\n"
                   f"    AND {' AND '.join(guards)};")
        back.append(f"UPDATE public.daily_actions SET {', '.join(rsets)}\n"
                    f"  WHERE id = '{r['id']}'\n"
                    f"    AND {' AND '.join(rguards)};")

    if rejected:
        for x in rejected:
            print("REJECTED", x)
        return 1

    n = len(manifest)
    header = (
        "-- Batch 1 POST-v2 daily_actions remediation (generated by "
        "scripts/doctor-review/remediate_v2.py)\n"
        "BEGIN;\n"
        "SELECT id FROM public.daily_actions WHERE is_active FOR UPDATE;\n"
        "DO $$ BEGIN\n"
        "  IF (SELECT count(*) FROM public.daily_actions WHERE is_active) <> 180 "
        "THEN RAISE EXCEPTION 'active daily_actions count changed'; END IF;\n"
        "END $$;\n\n")
    footer = ("\n\nDO $$ DECLARE n int; BEGIN\n"
              f"  SELECT count(*) INTO n FROM public.daily_actions WHERE is_active;\n"
              "  IF n <> 180 THEN RAISE EXCEPTION 'post-update count drift: %', n; END IF;\n"
              "END $$;\nCOMMIT;\n")
    (OUT / "remediate.sql").write_text(header + "\n\n".join(fwd) + footer)
    (OUT / "rollback.sql").write_text("BEGIN;\n" + "\n\n".join(back) + "\nCOMMIT;\n")
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"records to update: {n}")
    print("fields touched:", json.dumps(
        {f: sum(1 for m in manifest if f in m["after"]) for f in FIELDS}, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
