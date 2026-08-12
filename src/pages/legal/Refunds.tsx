import LegalPage from "@/components/legal/LegalPage";

const Refunds = () => (
  <LegalPage
    title="30-Day Refund Terms"
    metaDescription="DRM offers a 30-day refund-request window for each membership charge. Eligibility, timing, and how requests are handled."
    path="/refunds"
  >
    <p>
      DRM offers a 30-day refund-request window for each membership charge: the initial $27 charge
      and each $67 monthly renewal charge.
    </p>

    <h2>Eligibility and timing</h2>
    <ul>
      <li>Submit the request within 30 calendar days after the charge date.</li>
      <li>
        Use the email on the DRM account and submit through in-app Support or{" "}
        <a href="mailto:info@diabetesresetmethod.com">info@diabetesresetmethod.com</a>.
      </li>
      <li>Include the charge date and amount. Never email a full card number.</li>
      <li>
        Duplicate or unauthorized charges and rights required by law are handled separately and are
        not reduced by this policy.
      </li>
    </ul>

    <h2>What happens</h2>
    <p>
      DRM verifies the charge and request. If approved, DRM refunds the eligible charge to the
      original payment method, cancels future renewal, and ends membership access when the refund is
      processed. Stripe and your financial institution control when the credit appears. DRM will not
      promise an exact bank-posting date.
    </p>

    <h2>Important distinctions</h2>
    <p>
      Canceling stops future renewal but does not automatically request a refund. Account deletion
      cancels future billing but is not a refund request. A refund request does not require you to
      delete your account first. DRM cannot issue a duplicate refund while the same charge is under
      an active chargeback or payment dispute; support will explain the available path.
    </p>

    <h2>Contact</h2>
    <p>
      Refund requests: <a href="mailto:info@diabetesresetmethod.com">info@diabetesresetmethod.com</a>.
      DRM aims to acknowledge requests within two business days and provide a decision or status
      update within five business days. This timing is a service target, not a promise about when a
      bank posts the credit.
    </p>
  </LegalPage>
);

export default Refunds;
