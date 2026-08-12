/**
 * Single typed source of truth for DRM's legal identity.
 *
 * Diabetes Reset Method is a product/brand operated by a sole owner. A UK
 * private limited company will be incorporated later.
 *
 * ── REMINDER (does NOT block builds or publication) ──────────────────────────
 * When incorporation completes, replace these four values here and set
 * `entity_status` to "active":
 *   1. registered_company_name
 *   2. company_number
 *   3. registered_jurisdiction
 *   4. registered_office_address
 * Until then these stay empty strings and the pages render
 * PENDING_UK_REGISTRATION_NOTICE instead of any raw token.
 * ─────────────────────────────────────────────────────────────────────────────
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
  // Pending UK incorporation — see reminder above.
  registered_company_name: "",
  company_number: "",
  registered_jurisdiction: "",
  registered_office_address: "",
  contact_email: "info@diabetesresetmethod.com",
  owner_review_date: "2026-08-12",
  financial_record_retention:
    "6 years for minimized financial, tax, refund and transaction records only",
  governing_law_text:
    "These Terms and any non-contractual obligations arising out of or connected with them are governed by the laws of England and Wales. The courts of England and Wales have non-exclusive jurisdiction. If you are a consumer, you may also bring proceedings in the courts where you live where applicable law permits. Nothing in these Terms limits any mandatory consumer protection or other right that cannot lawfully be excluded.",
  ico_fee_assessment_status:
    "Owner completed the ICO fee self-assessment and reported an exempt result; the ICO result said no exemption notification was required. Reassess after incorporation or a material processing change.",
  ico_fee_assessment_date: "2026-08-12",
};

/** Human-readable date shown as "Last updated" on every legal page. */
export const LAST_UPDATED_DISPLAY = "August 12, 2026";

/** Public wording used while the UK company registration is pending. */
export const PENDING_UK_REGISTRATION_NOTICE =
  "Diabetes Reset Method is awaiting completion of its UK company registration. The registered company name, number, jurisdiction and registered-office address will be added before the service is publicly launched.";

/** Values still to be supplied after incorporation (informational only). */
export const PENDING_UK_REGISTRATION_FIELDS: (keyof LegalIdentity)[] = [
  "registered_company_name",
  "company_number",
  "registered_jurisdiction",
  "registered_office_address",
];

/** How DRM may describe itself before incorporation. */
export const OPERATOR_DESCRIPTION =
  LEGAL.entity_status === "active"
    ? `${LEGAL.registered_company_name} (company number ${LEGAL.company_number}, ${LEGAL.registered_jurisdiction})`
    : "Diabetes Reset Method, a sole-owner product operated from Jamaica while a UK private limited company is being formed";

/** International processing statement shared by the privacy notices. */
export const INTERNATIONAL_PROCESSING_TEXT =
  "DRM's owner and day-to-day support operate from Jamaica, so authorized access to personal information may occur there. After incorporation, DRM's legal operator will be the UK company identified in this notice. DRM also uses service providers that may process information in the United States and other documented locations. DRM applies access controls, data minimization and the contractual or other safeguards required for the applicable processing arrangement.";

/** Privacy appeal statement shared by the privacy notices. */
export const PRIVACY_APPEAL_TEXT =
  "If DRM declines a privacy request, the decision will explain why. You may ask DRM to reconsider by replying “Privacy appeal” to the decision email. DRM will review the appeal and respond in writing. DRM will not charge you more, deny ordinary service or otherwise treat you unfairly merely because you exercise a privacy right. This does not prevent changes needed to carry out your request, such as closing an account you asked DRM to delete.";
