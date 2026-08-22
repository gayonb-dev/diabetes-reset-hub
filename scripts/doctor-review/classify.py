#!/usr/bin/env python3
"""Batch 1 Part A — contextual content classifier.

Separated from the generator so the false-negative / false-positive regression
fixtures can exercise the classifier directly.

Classification is contextual: keyword presence alone never decides a
disposition. Approved education-only safety content (supplement safety, fasting
safety, the consensus definition of remission stated as education) is kept.
"""
from __future__ import annotations

import re

SAFE_TAG = "safe_no_change_required"

# --- disposition vocabulary (QA section 7, exhaustive) --------------------
KEEP_EDU = "KEEP — APPROVED EDUCATION"
# POST-v2: the REWRITE dispositions are retired. Remediation is complete, so a
# live record is either approved content (KEEP) or must not be reachable
# (RETIRE). Nothing stays active "pending replacement copy".
RETIRE_UNAPPROVED = "RETIRE — NOT APPROVED"
RETIRE_OBSOLETE = "RETIRE — OBSOLETE FEATURE"
RETIRE_OUTCOME = "RETIRE — OUTCOME/GAMIFICATION"
FIX_INTERACTION = "FIX INTERACTION — NONFUNCTIONAL"
TEMP_FALLBACK = "TEMPORARY FALLBACK APPLIED"
HISTORICAL = "HISTORICAL — UNREACHABLE"
INTERNAL_KEEP = "KEEP — INTERNAL, NOT MEMBER-FACING"

DISPOSITIONS = [
    KEEP_EDU, RETIRE_UNAPPROVED, RETIRE_OBSOLETE,
    RETIRE_OUTCOME, FIX_INTERACTION, TEMP_FALLBACK, HISTORICAL, INTERNAL_KEEP,
]

# --- risk taxonomy ---------------------------------------------------------
RISK_RULES: list[tuple[str, str]] = [
    ("fasting_scheduling", r"(fast(ing)?\s*(window|schedule|timer|hours?|start|number|check-?in)|intermittent fasting|16:8|12:12|eating window|stop eating by|fast until|overnight fast|night faster|fast begins|earlier windows|before breakfast|before the first meal)"),
    ("cheat_meal", r"(cheat meal|cheat day|cheat and fast|treat yourself day)"),
    ("supplements", r"(supplement|berberine|chromium|cinnamon capsule|alpha[- ]lipoic|\bdosage\b|\bdose[sd]?\b|\bmg\b)"),
    ("reversal_cure", r"(revers(e|al|ing)\b|\bcure[ds]?\b|remission)"),
    ("promised_outcomes", r"(lower(s|ing)? (your )?(a1c|blood sugar|post-?meal|glucose)|drop \d+|lose \d+\s*(lb|pound|kg)|guarantee[ds]?|will (reduce|drop|fall)|points? lower|in (just )?\d+ (days?|weeks?)|works? immediately|measurable proof|your average is transformed|already writing|is repeatable|single most effective|most effective thing|crammed for|can only be earned|by up to \d+ ?%)"),
    ("diagnostic_label", r"(\bdiabetic\b|pre[- ]?diabetic|normal zone|diabetic zone)"),
    ("treatment_or_testing_instruction", r"(insulin dose|adjust(ing)? your (medication|insulin)|stop taking|skip your (dose|medication)|check your a1c every|get the a1c (drawn|done|tested)|a1c (test|draw|retest)|second a1c|lab, pharmacy|home (a1c )?kit|medication (needs|review)|dose reduction|no experiments this close to a test|hold the line)"),
    ("medical_clearance", r"(cleared? (you|your) (knees|joints|back)|safe for your (knees|body|condition)|no need to (see|ask) (your )?doctor|medically safe for you|medical clearance|blood[- ]sugar clearance|prove you own this skill)"),
    ("shame_food_language", r"(bad food|guilty|guilt[- ]free|sinful|naughty|willpower failure|no zero days|full compliance|fully compliant|compliant plate|\bcompliance day\b|no shortcuts|no exceptions)"),
    ("uncited_absolute", r"(\balways\b|\bnever\b|everyone|proven to|scientifically proven|studies show|thirty separate interventions|works on your body)"),
    ("obsolete_feature", r"(whatsapp|coaching call|your coach|personal(ised|ized) (health )?ai|book a call|calendly|1[- ]on[- ]1|fasting unlocks|fasting tab)"),
    ("nonfunctional_promise", r"(printable report coming|read more soon|coming soon|click here to download)"),
    ("insulin_sensitivity_claim", r"(insulin sensitivity|glucose uptake|burns? (the )?sugar|glucose sponge|moves glucose into your muscles|pulls? glucose out of your bloodstream|without needing insulin|blood sugar medicine|like it['’]?s medicine|different insulin responses|glucose repair|raise glucose without|muscle that uses glucose|builds? the muscle)"),
    ("individualised_health_formula", r"(half your body weight in ounces|personal daily water target|palm[- ]sized protein at every meal|exactly two and a half hours|three numbers that matter)"),
]

# --- context markers -------------------------------------------------------
SAFETY_EDUCATION_MARKERS = [
    "does not sell", "does not require", "does not prescribe", "we do not sell",
    "evidence is limited", "insufficient evidence", "not a substitute",
    "talk with your", "discuss with your", "speak with your",
    "healthcare professional", "healthcare team", "your doctor decides",
    "may interact", "possible interactions", "is not available in",
    "individual responses vary", "effects vary", "generally defined as",
    "consensus definition", "this is education", "educational only",
]

PROMOTIONAL_MARKERS = [
    "buy", "order now", "shop", "recommended stack", "take ", "start taking",
    "we recommend you take", "add this supplement", "our supplement",
    "you will reverse", "you will achieve remission", "earn remission",
    "unlock remission", "reverse your diabetes",
]

CLINICAL_TAGS = {
    "treatment_or_testing_instruction", "medical_clearance",
    "insulin_sensitivity_claim", "supplements", "individualised_health_formula",
    "diagnostic_label", "reversal_cure",
}
OWNER_TAGS = {"promised_outcomes", "shame_food_language", "uncited_absolute"}
OBSOLETE_TAGS = {"fasting_scheduling", "cheat_meal", "obsolete_feature"}


def tags_for(text: str) -> list[str]:
    if not text:
        return [SAFE_TAG]
    low = text.lower()
    found = [name for name, pat in RISK_RULES if re.search(pat, low)]
    return found or [SAFE_TAG]


# POST-v2: authority-approved boundary, refusal, disabled-feature and
# non-health technical wording. These strings trip the coarse risk regexes
# (they contain "never", "supplement", "mg", "A1C") while being exactly the
# safe wording the authority requires. They are KEEP, never RETIRE.
APPROVED_BOUNDARY_PATTERNS = [
    # medicine / supplement boundaries (refusals, never prescriptions)
    r"never (start|stop|skip|change)",
    r"can'?t tell you to (start|stop|skip|change)",
    r"(ask|talk to|see) (a|your) (prescriber|pharmacist|doctor|healthcare)",
    r"belongs? with your (qualified )?(prescriber|pharmacist|healthcare)",
    r"questions to ask first",
    r"you do not need supplements",
    r"not enough reliable evidence",
    r"can cause side effects",
    r"interact with (diabetes )?medicines",
    r"bring a list or photos",
    r"are fasting or supplements required",
    r"nccih",
    # disabled features stated as unavailable
    r"(are|is) not available right now",
    r"not using a fasting schedule",
    r"meal times are yours to choose",
    # neutral, non-prescriptive A1C wording
    r"if a1c testing is (already )?part of your care plan",
    r"if an a1c test is already part of your care plan",
    # units, schema descriptions and image alt text (no health claim)
    r"mg/dl|mmol/l",
    r"blood glucose in mg",
    r"^an adult ",
    # non-health technical copy (billing, export, chat routing)
    r"payment card data",
    r"no proven entitlement",
    r"buying moment",
    r"never paste, invent",
    r"as never\b",
    r"what am i hoping this supplement",
    r"every supplement and medicine you use",
    r"is always optional",
    r"does not promise or diagnose",
    r"due in \d+ days",
    r"check-?in is in seven days",
    # approved remission / A1C / portion education (authority sections 4 and 9)
    r"does not promise (or diagnose )?remission",
    r"remission is not cure",
    r"identical for everyone",
    r"not safe or appropriate for everyone",
    r"do not guarantee the same effect",
    r"healthcare professional (decides|can assess)",
    r"if a1c testing is part of your usual care",
    r"never recommends a dose change",
    r"bring a list or photos",
    # neutral, source-linked remission education (titles and summaries)
    r"(what|understanding|about|definition of|research|reported about) [^.]*remission",
    r"remission: definition",
    r"remission (research|means)",
]

# Promotional markers that disqualify boundary copy. Deliberately narrower
# than PROMOTIONAL_MARKERS: a bare "take " appears in approved wording such as
# "questions you can take to a prescriber".
BOUNDARY_PROMO_MARKERS = [
    "buy", "order now", "shop", "recommended stack", "start taking",
    "we recommend you take", "add this supplement", "our supplement",
    "you will reverse", "you will achieve remission", "earn remission",
    "unlock remission", "reverse your diabetes",
]

# Scheduling/administrative strings that trip outcome regexes purely because
# they contain a number and a time unit. Checked before NEVER_APPROVED_TAGS.
SCHEDULING_OVERRIDES = [r"due in \d+ days", r"check-?in is in seven days"]

NEVER_APPROVED_TAGS = {"promised_outcomes", "insulin_sensitivity_claim",
                       "shame_food_language", "individualised_health_formula"}


def is_approved_boundary(text: str, tags: list[str]) -> bool:
    low = (text or "").lower()
    if any(re.search(p, low) for p in SCHEDULING_OVERRIDES):
        return True
    if set(tags) & NEVER_APPROVED_TAGS:
        return False
    if any(p in low for p in BOUNDARY_PROMO_MARKERS):
        return False
    return any(re.search(p, low) for p in APPROVED_BOUNDARY_PATTERNS)


def is_approved_education(text: str) -> bool:
    """Approved safety education: states limits/uncertainty, promotes nothing."""
    low = (text or "").lower()
    if any(p in low for p in PROMOTIONAL_MARKERS):
        return False
    return any(m in low for m in SAFETY_EDUCATION_MARKERS)



def classify(text: str, *, reachable: bool = True, contained: bool = False,
             gamification: bool = False, interaction_broken: bool = False,
             internal: bool = False) -> dict:
    """Return tags + contextual disposition + active/unreachable state."""
    tags = tags_for(text)
    approved_edu = is_approved_education(text)

    if internal:
        disposition = INTERNAL_KEEP
    elif contained:
        disposition = TEMP_FALLBACK
    elif not reachable:
        disposition = HISTORICAL
    elif interaction_broken:
        disposition = FIX_INTERACTION
    elif tags == [SAFE_TAG]:
        disposition = KEEP_EDU
    elif is_approved_boundary(text, tags):
        disposition = KEEP_EDU
    elif approved_edu and not (set(tags) & {"treatment_or_testing_instruction", "medical_clearance"}):
        disposition = KEEP_EDU

    elif set(tags) & OBSOLETE_TAGS:
        disposition = RETIRE_OBSOLETE
    elif gamification:
        disposition = RETIRE_OUTCOME
    elif set(tags) & CLINICAL_TAGS:
        disposition = RETIRE_UNAPPROVED
    elif set(tags) & OWNER_TAGS:
        disposition = RETIRE_UNAPPROVED
    else:
        disposition = RETIRE_UNAPPROVED

    stays_active = disposition in (KEEP_EDU, FIX_INTERACTION, INTERNAL_KEEP)
    if disposition == TEMP_FALLBACK:
        state = "active with approved temporary fallback copy"
    elif disposition == INTERNAL_KEEP:
        state = "stays active; internal configuration, never rendered to members"
    elif disposition == HISTORICAL:
        state = "retained as history, unreachable by members"
    elif disposition in (RETIRE_OBSOLETE, RETIRE_OUTCOME, RETIRE_UNAPPROVED):
        state = "becomes inactive / unreachable"
    elif stays_active:
        state = "stays active"
    else:
        state = "becomes inactive / unreachable"

    return {
        "risk_tags": tags,
        "disposition": disposition,
        "record_state": state,
        "approved_education": approved_edu,
    }
