import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, AlertCircle, CreditCard, ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EmptyState from "@/components/ui/empty-state";

interface Invoice {
  id: string;
  date: number;
  amount: number;
  currency: string;
  status: string | null;
  hosted_invoice_url: string | null;
}
interface PaymentMethod {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  trialing: { label: "● Trial", color: "text-status-warning" },
  active: { label: "● Active", color: "text-status-normal" },
  past_due: { label: "● Payment failed", color: "text-destructive" },
  cancelled: { label: "● Cancelled", color: "text-destructive" },
  canceled: { label: "● Cancelled", color: "text-destructive" },
  incomplete: { label: "● Incomplete", color: "text-status-warning" },
  unpaid: { label: "● Unpaid", color: "text-destructive" },
};

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  paid: { label: "Paid", color: "text-status-normal" },
  open: { label: "Open", color: "text-status-warning" },
  void: { label: "Voided", color: "text-muted-foreground" },
  uncollectible: { label: "Failed", color: "text-destructive" },
  draft: { label: "Draft", color: "text-muted-foreground" },
};

export default function Billing() {
  const { subscription, refreshSubscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [invLoading, setInvLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("list-invoices", {});
      if (!error && data) {
        setInvoices(data.invoices || []);
        setPaymentMethod(data.payment_method || null);
      }
      setInvLoading(false);
    })();
  }, []);

  const openPortal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {});
      if (error || !data?.url) {
        toast({
          title: "Couldn't open billing portal",
          description: "Email support@diabetesresetmethod.com and we'll handle it.",
          variant: "destructive",
        });
      } else {
        window.open(data.url, "_blank");
      }
    } finally {
      setLoading(false);
    }
  };

  const invokeCancel = async (cancel: boolean) => {
    const setter = cancel ? setCancelling : setReactivating;
    setter(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { cancel },
      });
      if (error) {
        let detail = (error as Error).message;
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const body = await ctx.text();
            if (body) detail = body.slice(0, 400);
          } catch {
            /* ignore */
          }
        }
        throw new Error(detail);
      }
      await refreshSubscription();
      if (cancel) {
        const when = data?.current_period_end
          ? new Date(data.current_period_end).toLocaleDateString()
          : "the end of your current period";
        toast({
          title: "Subscription cancelled",
          description: `You keep full access until ${when}. Reactivate anytime before then with one tap.`,
        });
        setCancelOpen(false);
      } else {
        toast({
          title: "Subscription reactivated",
          description: "Welcome back — your membership will renew as normal.",
        });
      }
    } catch (e) {
      toast({
        title: cancel ? "Couldn't cancel" : "Couldn't reactivate",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setter(false);
    }
  };

  if (!subscription) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center text-sm text-muted-foreground">
        No subscription found.
      </div>
    );
  }

  const status = STATUS_LABEL[subscription.status] ?? { label: subscription.status, color: "text-foreground" };
  const nextChargeDate =
    subscription.trial_end_date && subscription.status === "trialing"
      ? subscription.trial_end_date
      : subscription.current_period_end;
  const trialDay = subscription.trial_end_date && subscription.status === "trialing"
    ? Math.max(1, 7 - Math.ceil((new Date(subscription.trial_end_date).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="font-heading font-semibold text-2xl text-primary">Your Subscription</h1>

      {/* Status card */}
      <Card className="p-6 border border-border">
        <p className={`text-sm font-medium ${status.color} mb-2`}>{status.label}</p>
        <h2 className="font-semibold text-lg text-foreground">Diabetes Reset Method</h2>
        <p className="text-[15px] text-secondary-fg mb-4">$67 / month</p>

        {trialDay && subscription.trial_end_date && (
          <p className="text-sm text-accent mb-3">
            Day {trialDay} of 7-day trial. Trial ends {new Date(subscription.trial_end_date).toLocaleDateString()}.
          </p>
        )}

        <dl className="text-sm space-y-2">
          {nextChargeDate && !subscription.cancel_at_period_end && (
            <div className="flex justify-between">
              <dt className="text-secondary-fg">{subscription.status === "trialing" ? "First charge" : "Next charge"}</dt>
              <dd className="font-medium text-foreground">
                {new Date(nextChargeDate).toLocaleDateString()} · $67
              </dd>
            </div>
          )}
        </dl>

        {subscription.cancel_at_period_end && (
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2 text-sm text-foreground bg-muted/60 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span>
                Your subscription is cancelled. You keep full access until{" "}
                <span className="font-medium">
                  {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString()
                    : "the end of the current period"}
                </span>
                . Reactivate anytime before then with one tap.
              </span>
            </div>
            <Button
              onClick={() => invokeCancel(false)}
              disabled={reactivating}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {reactivating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Reactivate my subscription
            </Button>
          </div>
        )}
      </Card>

      {/* Payment method card */}
      <Card className="p-6 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-primary" />
          <div className="flex-1">
            {paymentMethod ? (
              <>
                <p className="font-medium capitalize">
                  {paymentMethod.brand} ending {paymentMethod.last4}
                </p>
                <p className="text-xs text-secondary-fg">
                  Expires {String(paymentMethod.exp_month).padStart(2, "0")}/{String(paymentMethod.exp_year).slice(-2)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {invLoading ? "Loading payment method…" : "No payment method on file."}
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={openPortal}
          disabled={loading}
          variant="outline"
          className="w-full h-12 border-primary text-primary hover:bg-primary-muted"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update payment method →
        </Button>
      </Card>

      {/* Billing history */}
      <Card className="p-6 border border-border">
        <p className="text-sm font-medium text-foreground mb-3">Billing history</p>
        {invLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : invoices.length === 0 ? (
          <EmptyState
            title="No charges yet"
            description="Your invoices and receipts will appear here after your first billing cycle."
            posture="neutral"
            vitaSize={56}
          />
        ) : (
          <div className="divide-y divide-border">
            {invoices.map((inv) => {
              const st = INVOICE_STATUS[inv.status ?? ""] ?? { label: inv.status ?? "—", color: "text-muted-foreground" };
              return (
                <div key={inv.id} className="py-2.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground w-28">
                    {new Date(inv.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  <span className="font-medium tabular-nums flex-1 text-right pr-3">
                    ${(inv.amount / 100).toFixed(2)}
                  </span>
                  <span className={`text-xs font-medium ${st.color} w-16 text-right`}>{st.label}</span>
                  {inv.hosted_invoice_url && (
                    <a
                      href={inv.hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-primary"
                      aria-label="View invoice"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {!subscription.cancel_at_period_end && (
        <div className="text-center pt-4">
          <button
            onClick={() => setCancelOpen(true)}
            className="text-sm text-destructive hover:underline"
          >
            Cancel subscription
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Questions? Email{" "}
        <a href="mailto:support@diabetesresetmethod.com" className="text-primary underline">
          support@diabetesresetmethod.com
        </a>
      </p>

      <Dialog open={cancelOpen} onOpenChange={(v) => !cancelling && setCancelOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to cancel?</DialogTitle>
            <DialogDescription>
              Your access continues until{" "}
              {subscription.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString()
                : "the end of the current period"}
              . If you change your mind, you can reactivate at any time with one tap.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              onClick={() => setCancelOpen(false)}
              disabled={cancelling}
              className="bg-primary hover:bg-primary/90"
            >
              Keep my subscription
            </Button>
            <Button
              onClick={() => invokeCancel(true)}
              disabled={cancelling}
              variant="ghost"
              className="text-destructive hover:text-destructive/80"
            >
              {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
