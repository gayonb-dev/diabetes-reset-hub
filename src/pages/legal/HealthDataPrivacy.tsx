import LegalPage from "@/components/legal/LegalPage";

const HealthDataPrivacy = () => (
  <LegalPage
    title="Consumer Health Data Privacy Policy"
    metaDescription="How Diabetes Reset Method collects, uses, shares, and protects consumer health data, and the choices available to you."
    path="/health-data-privacy"
  >
    <p>
      DRM may collect health information you choose to provide, including Type 2 diabetes or
      prediabetes context; medicines; glucose, A1C, measurement, meal, movement, mood, symptom,
      goal, and question information; health-related chat; connected-device data if enabled; and
      inferences DRM creates solely to provide the requested feature or safety boundary.
    </p>
    <p>
      Sources are you, your use of DRM, and a device provider only when you deliberately connect it.
      DRM does not buy health data or infer a diagnosis for advertising.
    </p>
    <p>
      DRM collects and uses this information to provide the membership or feature you request, show
      your logs and reports, apply safety boundaries, answer support requests, secure the service,
      and fulfill applicable rights. DRM does not sell consumer health data or use it for targeted
      advertising.
    </p>
    <p>
      Categories shared when necessary to provide a requested service may include the health
      information entered into that specific feature and its safety/consent state. Processor
      categories are cloud/database/authentication providers and, only when separately enabled and
      consented, AI or connected-device providers. Specific current providers are Supabase/Lovable
      Cloud; Lovable AI Gateway and Google Gemini only for an enabled and consented AI feature; and
      Dexcom only for an enabled connection you initiate. Stripe does not receive member health logs
      for payment processing. Resend must not receive health content unless a separately approved
      workflow and consent permit it.
    </p>
    <p>
      You may request access, confirmation, correction, deletion, or withdrawal of consent through
      signed-in Settings or <a href="mailto:info@diabetesresetmethod.com">info@diabetesresetmethod.com</a>.
      DRM authenticates requests. Where applicable, you may appeal a refusal by replying{" "}
      <strong>Privacy appeal</strong> to the decision email. DRM will not discriminate against you
      for exercising a right.
    </p>
    <p>
      DRM will disclose and obtain any consent required before collecting or sharing an additional
      category of consumer health data or using it for an additional purpose.
    </p>
  </LegalPage>
);

export default HealthDataPrivacy;
