import LegalPage from "@/components/legal/LegalPage";
import { LEGAL, OPERATOR_DESCRIPTION } from "@/config/legal";

const Terms = () => (
  <LegalPage
    title="Terms of Service"
    metaDescription="The Terms of Service for the Diabetes Reset Method self-guided educational membership, including membership, renewal, and cancellation terms."
    path="/terms"
  >
    <h2>Operator and acceptance</h2>
    <p>
      These Terms govern Diabetes Reset Method, operated by {OPERATOR_DESCRIPTION}.{" "}
      {PENDING_UK_REGISTRATION_NOTICE} Correspondence from
      Jamaica. By purchasing or using DRM, you agree to these Terms and the linked
      Privacy, Consumer Health Data Privacy, AI Use, and Refund notices. If you do not agree, do not
      purchase or use DRM.
    </p>

    <h2>Eligibility</h2>
    <p>
      You must be at least 18 years old and able to enter a binding agreement. The current
      membership is designed for adults with Type 2 diabetes or prediabetes. It is not designed for
      Type 1 diabetes or emergency use.
    </p>

    <h2>Educational service—not medical care</h2>
    <p>
      DRM provides self-guided educational and organizational tools. It does not provide diagnosis,
      treatment, prescriptions, emergency monitoring, or a clinician-patient relationship. Never
      start, stop, or change medicine based on DRM. Contact a qualified professional for medical
      decisions and emergency services for urgent symptoms.
    </p>

    <h2>Membership and renewal</h2>
    <p>
      You are charged US$27 at checkout for the first 14 days. Unless you cancel before renewal, the
      membership automatically renews at US$67 per month until canceled. Stripe processes payment.
      You authorize the disclosed initial and recurring charges when you complete checkout.
    </p>

    <h2>Cancellation</h2>
    <p>
      Cancel in Settings or Billing. Cancellation stops future renewal and access continues through
      the period already paid for. DRM does not require a call, email, retention survey, or
      additional offer to cancel. Account deletion also cancels future billing but follows a
      separate data-deletion process.
    </p>

    <h2>Refunds</h2>
    <p>
      Refunds follow the separate <a href="/refunds">30-Day Refund Terms</a>. Cancellation and
      account deletion do not automatically request a refund.
    </p>

    <h2>Accounts and security</h2>
    <p>
      Give accurate account information, keep access to your sign-in email secure, and notify DRM if
      you suspect unauthorized use. Do not share an account or attempt to access another person's
      data.
    </p>

    <h2>Acceptable use</h2>
    <p>
      Do not misuse DRM, bypass access controls, scrape private data, upload malware, interfere with
      the service, impersonate another person, submit unlawful content, provide another person's
      health information without authority, or use DRM to give unsafe medical instructions.
    </p>

    <h2>Community content</h2>
    <p>
      You remain responsible for content you post. Do not post another person's private or health
      information, medical instructions, harassment, spam, or deceptive claims. DRM may moderate or
      remove content to enforce these rules. Posting does not make DRM your healthcare provider and
      does not make another member's experience typical.
    </p>

    <h2>AI-generated content</h2>
    <p>
      AI-generated content is labeled, educational, and may be inaccurate. Do not rely on it for
      diagnosis, medication, emergency, or treatment decisions. Current health-sensitive AI
      availability is described in the <a href="/ai-use">AI Use Notice</a>.
    </p>

    <h2>Intellectual property</h2>
    <p>
      DRM's software, branding, original lessons, and design are protected by applicable
      intellectual-property law. Your membership is a limited, personal, non-transferable right to
      use the service. You may download your own data and use a personal printable report, but may
      not resell or republish DRM content as your own.
    </p>

    <h2>Availability and changes</h2>
    <p>
      DRM may maintain, improve, or discontinue features. Safety, legal, or provider constraints may
      keep a feature unavailable. Material membership-price changes apply prospectively with legally
      required notice; they do not silently change an already completed charge.
    </p>

    <h2>Suspension and termination</h2>
    <p>
      DRM may restrict access for fraud, abuse, security risk, unlawful activity, or serious
      violation of these Terms. This does not remove rights that cannot lawfully be waived and does
      not create a right to retain data beyond the Privacy Notice.
    </p>

    <h2>Third-party services</h2>
    <p>
      DRM relies on providers such as Stripe, Supabase/Lovable Cloud, and any separately enabled
      integration. Their services may have separate terms. DRM remains responsible for its own
      promises and does not claim that a provider guarantees DRM's medical accuracy or availability.
    </p>

    <h2>Disclaimers and liability</h2>
    <p>
      To the maximum extent permitted by applicable law, DRM is provided without a promise of a
      medical result or uninterrupted availability. Nothing in these Terms excludes a consumer right
      or liability that applicable law does not allow DRM to exclude. Counsel must approve any
      additional warranty, damages, indemnity, or liability limitation before publication.
    </p>

    <h2>Governing law and disputes</h2>
    <p>{LEGAL.governing_law_text}</p>

    <h2>Contact</h2>
    <p>
      {OPERATOR_DESCRIPTION},{" "}
      <a href="mailto:info@diabetesresetmethod.com">info@diabetesresetmethod.com</a>.
    </p>
  </LegalPage>
);

export default Terms;
