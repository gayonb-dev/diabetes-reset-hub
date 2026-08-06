// Deterministic medical safety layer (S4, appendix section 9.3).
// Runs BEFORE any model call. Returns the exact approved handoff message for
// the most relevant path, or null when the question can be answered normally.
//
// Dependency-free TypeScript — shared by every edge function that answers
// member questions.

export type SafetyPath =
  | "emergency"
  | "medication"
  | "interpretation"
  | "fasting"
  | "uncertain";

export const SAFETY_MESSAGES: Record<SafetyPath, string> = {
  emergency:
    "I can't assess symptoms or emergencies. If you think this may be an emergency, contact emergency services now. Otherwise, contact a healthcare professional promptly.",
  medication:
    "I can't tell you to start, stop, skip, or change a medicine, dose, or supplement. Ask a prescriber or pharmacist who can review your medicines and health history. If you may have taken the wrong amount or you feel unwell, contact them promptly; if symptoms are severe, contact emergency services.",
  interpretation:
    "I can explain general educational terms, but I can't interpret this result or symptom for you. Contact a healthcare professional who knows your history. If symptoms are severe or you think this may be an emergency, contact emergency services.",
  fasting:
    "I can't decide whether fasting is safe for you. Ask a prescriber or pharmacist who knows your medicines and health history. Fasting is optional, and DRM's scheduling tools are currently unavailable.",
  uncertain:
    "I'm not confident I can answer this safely. Please ask a qualified healthcare professional. If this may be an emergency, contact emergency services.",
};

// Benign navigation questions must still get a normal program answer.
const NAVIGATION =
  /\b(where|how)\s+(do|can|should)?\s*i?\s*(find|record|log|enter|see|view|track|update)\b|\bwhere is\b|\bhow do i (use|open|navigate)\b/i;

const EMERGENCY =
  /\b(emergency|911|999|ambulance|chest pain|can'?t breathe|unconscious|passing out|passed out|seizure|stroke|slurred speech|vision loss|ketoacidosis|dka|vomiting blood|severe pain|numb(ness)? spreading)\b/i;

const MEDICATION =
  /\b(insulin|metformin|ozempic|semaglutide|glipizide|glyburide|glimepiride|gliclazide|repaglinide|nateglinide|jardiance|januvia|dose|dosage|mg\b|units?\b|prescription|medication|medicine|meds?\b|supplement|interact(ion)?s?)\b/i;

const SHOULD_I_TAKE = /\bshould i (take|stop|skip|start|change|increase|reduce|cut)\b/i;

const INTERPRETATION =
  /\b(is|are|does|why is|what does)\b[^?]*\b(my|this)\b[^?]*\b(reading|result|number|a1c|hba1c|glucose|blood sugar|bg|lab|symptom|tingling|numbness|dizzy|dizziness|blurry|swelling|rash|sore|wound|ulcer)\b/i;

const SYMPTOM =
  /\b(i (feel|felt|have|had|am)|my)\b[^?]*\b(dizzy|shaky|nauseous|tingling|numb|blurry|faint|weak|sore|infected|wound|ulcer|fever)\b/i;

const FASTING =
  /\b(fast(ing)?|intermittent fasting|\bif\b window|16:8|14:10|12:12|eating window|skip breakfast)\b/i;

export interface SafetyDecision {
  blocked: boolean;
  path?: SafetyPath;
  message?: string;
}

/**
 * Classify a member question. Order matters: emergency first, then medication
 * and dose questions, then personal interpretation, then fasting safety.
 */
export function classifyQuestion(raw: string): SafetyDecision {
  const q = (raw ?? "").trim();
  if (!q) return { blocked: true, path: "uncertain", message: SAFETY_MESSAGES.uncertain };

  const navigational = NAVIGATION.test(q);

  if (EMERGENCY.test(q)) return block("emergency");
  if (SHOULD_I_TAKE.test(q) || (MEDICATION.test(q) && !navigational)) return block("medication");
  if (!navigational && (INTERPRETATION.test(q) || SYMPTOM.test(q))) return block("interpretation");
  if (FASTING.test(q) && /\b(safe|should|can i|ok to|start|schedule|window|plan)\b/i.test(q)) {
    return block("fasting");
  }

  return { blocked: false };
}

function block(path: SafetyPath): SafetyDecision {
  return { blocked: true, path, message: SAFETY_MESSAGES[path] };
}
