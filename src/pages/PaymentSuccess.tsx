import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * Prompt 4 §11.2, server-verified payment success.
 *
 * Five states, never a claim of payment the server has not confirmed:
 *   checking, "Confirming your membership." (verification in flight)
 *   verified, payment verified and the account is ready
 *   processing, payment verified, provisioning still pending (poll/retry)
 *   unverified, missing, malformed, mismatched, unpaid, expired, wrong-mode,
 *                 wrong-product, wrong-price, wrong-amount, or otherwise
 *                 unverified session
 *   error, payment processor unavailable or timed out
 */
type State = "checking" | "verified" | "processing" | "unverified" | "error";

const SUPPORT_EMAIL = "info@diabetesresetmethod.com";
const MAX_POLLS = 5;

const Shell = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <main className="min-h-dvh bg-background flex items-center justify-center p-4">
    <Helmet>
      <title>Checkout status | Diabetes Reset Method</title>
      <meta name="robots" content="noindex" />
    </Helmet>
    <div className="max-w-xl w-full py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
          {icon}
        </div>
        <h1 className="font-heading font-bold text-3xl sm:text-4xl text-foreground mb-3">{title}</h1>
      </div>
      <div className="space-y-5 text-muted-foreground leading-relaxed text-center">{children}</div>
    </div>
  </main>
);

const PaymentSuccess = () => {
  const [state, setState] = useState<State>("checking");
  const polls = useRef(0);

  const verify = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);

    // Development-only screenshot harness. The whole branch, including the
    // imported module, is removed from production bundles by Vite, so no
    // published URL can render a state the payment processor has not confirmed.
    if (import.meta.env.DEV) {
      const { readDevFixture } = await import("@/lib/devPaymentFixture");
      const fixture = readDevFixture(window.location.search);
      if (fixture) {
        setState(fixture);
        return;
      }
    }

    // Production reads exactly one parameter and trusts only the server.
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setState("unverified");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("verify-checkout-session", {
        body: { sessionId },
      });
      if (error) throw error;
      const next = data?.state as State | undefined;
      if (next === "verified" || next === "unverified" || next === "processing") {
        setState(next);
        return;
      }
      setState("error");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void verify();
  }, [verify]);

  // Poll a few times while Stripe settles, then stop and keep the honest state.
  useEffect(() => {
    if (state !== "processing" || polls.current >= MAX_POLLS) return;
    const t = setTimeout(() => {
      polls.current += 1;
      void verify();
    }, 3000);
    return () => clearTimeout(t);
  }, [state, verify]);

  if (state === "checking" || state === "processing") {
    return (
      <Shell
        icon={<Loader2 className="h-8 w-8 text-primary animate-spin" />}
        title={state === "checking" ? "Confirming your membership." : "Finishing setting up your membership"}
      >
        <p>
          We're confirming your membership with our payment processor. This usually takes a few
          seconds. You do not need to pay again.
        </p>
        {state === "processing" && polls.current >= MAX_POLLS && (
          <p>
            It's taking longer than usual. You can close this page, if the payment went through,
            your membership will be active when you sign in. If you have any doubt, email{" "}
            <a className="text-primary underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            before trying again.
          </p>
        )}
      </Shell>
    );
  }

  if (state === "verified") {
    return (
      <Shell
        icon={<CheckCircle2 className="h-8 w-8 text-primary" />}
        title="Your membership is active"
      >
        <p>
          Your checkout is confirmed. You were charged US$27 for the first 14 days. Unless you
          cancel before renewal, your membership renews at US$67 per month until canceled. You can
          cancel any time in Settings → Billing.
        </p>
        <div className="rounded-xl border border-border bg-card p-5 text-left space-y-3">
          <p className="font-heading font-semibold text-foreground">Next step</p>
          <p className="text-sm">
            Sign in with the email you used at checkout. We'll send a sign-in link to that address, no password to remember.
          </p>
        </div>
        <div className="space-y-3">
          <Button asChild className="w-full min-h-[48px] rounded-xl h-auto text-base font-semibold">
            <Link to="/login">Sign in to your membership</Link>
          </Button>
          <p className="text-sm">
            Refund questions? See the{" "}
            <Link className="text-primary underline underline-offset-4" to="/refunds">
              30-Day Refund Terms
            </Link>
            .
          </p>
        </div>
        <p className="text-xs">
          DRM is a self-guided educational membership. It does not diagnose, treat, or replace care
          from a qualified healthcare professional.
        </p>
      </Shell>
    );
  }

  if (state === "unverified") {
    return (
      <Shell
        icon={<AlertCircle className="h-8 w-8 text-primary" />}
        title="We couldn't verify this checkout"
      >
        <p>
          We can't confirm a payment for this page. That can happen when the page is opened
          without a valid checkout reference, or when the checkout was not completed. If you did
          complete checkout, sign in with the email you used and your membership will be there.
        </p>
        <div className="space-y-3">
          <Button asChild className="w-full min-h-[48px] rounded-xl h-auto text-base font-semibold">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full min-h-[44px] h-auto">
            <Link to="/">Return home</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell icon={<Mail className="h-8 w-8 text-primary" />} title="We couldn't reach our payment processor">
      <p>
        We couldn't reach our payment processor to check this membership. Do not pay again yet.
        Email{" "}
        <a className="text-primary underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>{" "}
        with the date and amount of the charge and we'll check it for you. Never include a full card
        number in an email.
      </p>
      <Button asChild variant="ghost" className="w-full min-h-[44px] h-auto">
        <Link to="/">Return home</Link>
      </Button>
    </Shell>
  );
};

export default PaymentSuccess;
