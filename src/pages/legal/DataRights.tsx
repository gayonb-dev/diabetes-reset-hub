import LegalPage from "@/components/legal/LegalPage";
import { PRIVACY_APPEAL_TEXT } from "@/config/legal";

const DataRights = () => (
  <LegalPage
    title="Your DRM data choices"
    metaDescription="How to download your DRM data, withdraw feature consent, delete a chat, or request permanent account deletion."
    path="/data-rights"
  >
    <p>
      Signed-in members can open Settings → Privacy &amp; Data to download a readable export,
      request machine-readable JSON, withdraw feature consent, delete a chat, or request permanent
      account deletion. Recent sign-in verification protects these actions.
    </p>
    <p>
      Account deletion blocks access, cancels future subscription billing, and runs a reconciled
      deletion process. It is not a refund request. Refunds follow the{" "}
      <a href="/refunds">Refund Terms</a>.
    </p>
    <p>
      If you cannot sign in or are asking about an anonymous current-tab chat, contact{" "}
      <a href="mailto:info@diabetesresetmethod.com">info@diabetesresetmethod.com</a>. DRM will use a
      secure method to authenticate applicable requests. Do not send health information or
      identification documents in the first email.
    </p>
    <p>
      Depending on where you live, you may also request access, correction, deletion, consent
      withdrawal, or appeal of a refusal.
    </p>
    <p>{PRIVACY_APPEAL_TEXT}</p>
  </LegalPage>
);

export default DataRights;
