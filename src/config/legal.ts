/**
 * Single typed source of truth for DRM's legal identity.
 *
 * Diabetes Reset Method is a product/brand. It is NOT yet an incorporated
 * company: a UK private limited company will be incorporated later, and the
 * registration fields below stay as `[[...]]` placeholders until then.
 *
 * The production-release gate (scripts/release-gate.mjs) fails while
 * `entity_status !== "active"` or any placeholder remains. Preview builds are
 * allowed to render the placeholders together with the draft banner.
 */

export type EntityStatus = "pending_uk_incorporation" | "active";

export interface LegalIdentity {
  entity_status: EntityStatus;
  registered_company_name: string;
  company_number: string;
  registered_jurisdiction: string;
  registered_office_address: string;
  contact_email: string;
  owner_review_date: string;
  financial_record_retention: string;
  governing_law_text: string;
  ico_fee_assessment_status: string;
  ico_fee_assessment_date: string;
}

export const LEGAL: LegalIdentity = {
  entity_status: "pending_uk_incorporation",
  registered_company_name: "[[UK_REGISTERED_COMPANY_NAME]]",
  company_number: "[[UK_COMPANY_NUMBER]]",
  registered_jurisdiction: "[[UK_REGISTERED_JURISDICTION]]",
  registered_office_address: "[[UK_REGISTERED_OFFICE_ADDRESS]]",
  contact_email: "info@diabetesresetmethod.com",
  owner_review_date: "[[OWNER_REVIEW_DATE]]",
  financial_record_retention:
    "6 years for minimized financial, tax, refund and transaction records only",
  governing_law_text: "[[GOVERNING_LAW_TEXT]]",
  ico_fee_assessment_status:
    "Owner completed the ICO fee self-assessment and reported an exempt result; the ICO result said no exemption notification was required. Reassess after incorporation or a material processing change.",
  ico_fee_assessment_date: "[[ICO_SELF_ASSESSMENT_DATE]]",
};

/** How DRM may describe itself before incorporation. */
export const OPERATOR_DESCRIPTION =
  LEGAL.entity_status === "active"
    ? `${LEGAL.registered_company_name} (company number ${LEGAL.company_number}, ${LEGAL.registered_jurisdiction})`
    : "Diabetes Reset Method, an unincorporated sole-owner product operated from Jamaica while a UK private limited company is being formed";

/** Fields that must be real before a production release is permitted. */
export const REQUIRED_FOR_RELEASE: (keyof LegalIdentity)[] = [
  "registered_company_name",
  "company_number",
  "registered_jurisdiction",
  "registered_office_address",
  "owner_review_date",
  "governing_law_text",
  "ico_fee_assessment_status",
  "ico_fee_assessment_date",
];

export function unresolvedLegalFields(identity: LegalIdentity = LEGAL): string[] {
  const missing: string[] = [];
  if (identity.entity_status !== "active") missing.push("entity_status");
  for (const key of REQUIRED_FOR_RELEASE) {
    const value = identity[key];
    if (typeof value !== "string" || value.trim() === "" || /\[\[.+\]\]/.test(value)) {
      missing.push(key);
    }
  }
  return missing;
}
