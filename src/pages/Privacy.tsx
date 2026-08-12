// Public Privacy Notice (Prompt 4 §13.1).
//
// P1/P3: the legacy anonymous-ID deletion endpoint is retired. Deleting an
// anonymous chat requires the active server-issued session, and member data
// deletion runs through the authenticated, reauthenticated account-deletion
// lifecycle in Settings.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import LegalPage from "@/components/legal/LegalPage";
import {
  LEGAL,
  OPERATOR_DESCRIPTION,
  INTERNATIONAL_PROCESSING_TEXT,
  PRIVACY_APPEAL_TEXT,
} from "@/config/legal";
import { deleteThisChat, clearChatSession, hasChatSession } from "@/lib/chatSession";

export default function Privacy() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  async function handleDeleteChat() {
    if (!hasChatSession()) {
      setDone(true);
      return;
    }
    setBusy(true);
    const result = await deleteThisChat();
    setBusy(false);
    if (!result.ok) {
      toast({
        title: "Couldn't delete this chat",
        description:
          result.error === "no_active_session"
            ? "There's no active chat session in this browser."
            : "Please try again or email support.",
        variant: "destructive",
      });
      return;
    }
    clearChatSession();
    setDone(true);
    toast({
      title: "This chat has been deleted.",
      description:
        "The conversation, messages, consent and derived records for this session were removed and the session was revoked.",
    });
  }

  return (
    <LegalPage
      title="Privacy Notice"
      metaDescription="What personal information Diabetes Reset Method collects, why it uses it, which service providers process it, how long it is kept, and your choices."
      path="/privacy"
    >
      <p>
        Diabetes Reset Method (“DRM”) is a self-guided educational membership operated by
        {OPERATOR_DESCRIPTION}. This notice explains what personal information DRM
        collects, why it uses it, which service providers may process it, how long it is kept, and
        the choices available to you. DRM is not claiming that it is covered by HIPAA. Other
        consumer-protection, privacy, security, and health-breach laws may apply.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          Account/contact: name, email, optional profile information, authentication and consent
          records.
        </li>
        <li>
          Health and activity information you choose to enter: Type 2 diabetes/prediabetes context,
          medicines, glucose and A1C entries, measurements, meals, movement, mood, goals, questions,
          and reports.
        </li>
        <li>
          Program information: onboarding choices, Today actions, progress, meal plans, saved tools,
          and preferences.
        </li>
        <li>
          Chat/AI information: messages, generated responses, classification/safety labels, reports,
          and consent state. Health-sensitive AI processing is currently disabled.
        </li>
        <li>Community information: posts, comments, reactions, reports, and moderation state.</li>
        <li>
          Billing/service information: order, subscription, cancellation, refund, and limited
          transaction records. DRM does not receive complete card numbers from Stripe.
        </li>
        <li>
          Device integration information: connection status, tokens, and synchronized data only if a
          supported integration is enabled and you connect it. Dexcom is currently disabled.
        </li>
        <li>Support/communications: support requests and communication preferences.</li>
        <li>
          Technical/security: short-lived session records, security events, and keyed IP hashes used
          for abuse prevention. DRM does not use a browser UUID as authorization.
        </li>
      </ul>

      <h2>Sources</h2>
      <p>
        Information comes from you, your use of DRM, Stripe for payment/subscription state, a device
        provider only when you deliberately connect it, and DRM's service providers when they return
        service/security status. DRM does not infer a diagnosis for advertising or buy health
        information from data brokers.
      </p>

      <h2>Why we use information</h2>
      <p>
        DRM uses information to provide the membership you request, authenticate and protect
        accounts, process billing, display your chosen logs and reports, provide support, record
        consent, fulfill export/deletion requests, prevent fraud and abuse, meet legal obligations,
        and create genuinely de-identified aggregate service information. DRM does not sell personal
        or consumer health data and does not use it for targeted advertising.
      </p>

      <h2>Service providers and disclosures</h2>
      <ul>
        <li>
          Supabase/Lovable Cloud: hosting, database, authentication, storage, and Edge Functions.
        </li>
        <li>
          Stripe: checkout, payment, subscription, cancellation, refund, and limited fraud/payment
          records.
        </li>
        <li>
          Lovable AI Gateway and Google Gemini: only for a specifically enabled, labeled AI feature
          and only after the required health-data consent. Health-sensitive AI processing remains
          disabled until the contract and consent gates pass.
        </li>
        <li>Resend: transactional email only when enabled. Outbound email is currently disabled.</li>
        <li>
          Dexcom: only if the integration is enabled and you connect it. Dexcom is currently
          disabled.
        </li>
        <li>
          Professional advisers, authorities, or counterparties only when reasonably necessary for
          law, safety, fraud, claims, or a business transfer subject to appropriate protections.
        </li>
      </ul>
      <p>
        DRM does not disclose health information to advertising networks or data brokers. If
        providers or practices change, DRM must update this notice and obtain any required consent
        before a new use.
      </p>

      <h2>Cookies and browser storage</h2>
      <p>
        DRM uses necessary authentication/session technology and local preferences needed to provide
        the site. The anonymous public-chat authorization token is kept only in active page memory,
        not localStorage or sessionStorage. DRM does not use advertising cookies at launch. If
        optional analytics or marketing tools are added, this notice and any required choice
        mechanism must be updated first.
      </p>

      <h2>Retention</h2>
      <ul>
        <li>New unlinked anonymous chat data: up to 30 days after last activity.</li>
        <li>
          Member service, health, progress, chat, meal, community, and derived data: no more than
          730 days after the member's last meaningful activity, unless deleted sooner or a shorter
          purpose applies.
        </li>
        <li>Rate-limit events/keyed IP hashes: 24 hours.</li>
        <li>One-time export artifact: no more than five minutes; minimal status afterward.</li>
        <li>
          Pseudonymized deletion receipt: no more than 730 days after completion unless a
          different period is required by law or adopted following an updated owner review.
        </li>
        <li>Local financial records: {LEGAL.financial_record_retention}. This does not extend retention of health logs, meals, progress, chat, AI, community or other member data.</li>
        <li>
          Processor copies: the verified contractual/operational period disclosed for that provider.
        </li>
      </ul>
      <p>
        A meaningful activity is a successful login, member-authored action/log/chat, or
        purchase—not a background job, notification, email open, failed request, or admin view.
        Retention automation remains report-only until separately approved.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        Depending on where you live, you may request access, a copy, correction, deletion,
        withdrawal of consent, or review/appeal of a privacy-request decision. Signed-in members can
        download data, withdraw feature consent, delete chats, and request account deletion in
        Settings. You may also contact{" "}
        <a href="mailto:info@diabetesresetmethod.com">info@diabetesresetmethod.com</a>. DRM verifies
        requests to protect the account and will not discriminate against you for exercising
        applicable privacy rights.
      </p>

      <h2>Account deletion</h2>
      <p>
        Account deletion blocks access, cancels future subscription billing, and starts DRM's
        reconciled deletion process. It is not a refund request. Some minimized transaction or legal
        records and processor records may remain as described in the deletion receipt and{" "}
        <a href="/refunds">Refund Terms</a>.
      </p>

      <h2>Security</h2>
      <p>
        DRM uses access controls, authentication, private storage, encryption provided by its
        platforms, logging minimization, rate limits, and testing intended to protect information.
        No system can promise absolute security. Report a suspected security issue to{" "}
        <a href="mailto:info@diabetesresetmethod.com">info@diabetesresetmethod.com</a> without
        including health information in the first message.
      </p>

      <h2>Children</h2>
      <p>
        DRM is for adults age 18 or older and is not directed to children. Do not create an account
        or submit information for a child.
      </p>

      <h2>International processing</h2>
      <p>
        {INTERNATIONAL_PROCESSING_TEXT}
      </p>

      <h2>Privacy appeals</h2>
      <p>{PRIVACY_APPEAL_TEXT}</p>

      <h2>Health-data incidents</h2>
      <p>
        If an incident requires notice under applicable health-breach or privacy law, DRM will
        follow its incident process and provide required notices. This statement is not a claim of
        HIPAA coverage or certification.
      </p>

      <h2>Changes and contact</h2>
      <p>
        DRM will post a revised date when this notice changes. A material new use of health
        information requires the notice and consent required by law; it will not be hidden in a
        retroactive policy update. Contact: {OPERATOR_DESCRIPTION},{" "}
        <a href="mailto:info@diabetesresetmethod.com">info@diabetesresetmethod.com</a>.
      </p>

      <h2>Delete this chat</h2>
      <p>
        Removes the conversation, messages, consent and derived records for your current chat
        session and signs that session out. Records held by outside providers are tracked separately
        and are not claimed as deleted. Cannot be undone.
      </p>
      {done ? (
        <p className="text-sm font-medium text-primary">
          Deleted. You can close this page or{" "}
          <Link to="/" className="underline">
            go back home
          </Link>
          .
        </p>
      ) : (
        <Button
          onClick={handleDeleteChat}
          disabled={busy}
          variant="destructive"
          className="min-h-[44px]"
        >
          {busy ? "Deleting…" : "Delete this chat"}
        </Button>
      )}

      <h2>Member account and export</h2>
      <p>
        If you have a membership, exporting or deleting your account happens in{" "}
        <Link to="/app/settings">Settings</Link>. Both require a recent sign-in for your protection.
        See <Link to="/data-rights">Your DRM data choices</Link>.
      </p>
    </LegalPage>
  );
}
