import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Billing() {
  const { user, subscription, refreshSubscription } = useAuth();
  const [loading, setLoading] = useState(false);

  const openPortal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {});
      if (error || !data?.url) {
        toast({
          title: "Couldn't open billing portal",
          description: "Please email support@diabetesresetmethod.com",
          variant: "destructive",
        });
      } else {
        window.open(data.url, "_blank");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <p>No subscription found.</p>
      </div>
    );
  }

  const statusLabel = {
    trialing: "Trial active",
    active: "Active",
    past_due: "Payment failed",
    cancelled: "Cancelled",
    incomplete: "Incomplete",
    unpaid: "Unpaid",
  }[subscription.status];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-heading font-bold text-3xl mb-2">Billing</h1>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          Current plan
        </p>
        <h2 className="font-heading font-bold text-2xl mb-3">Diabetes Reset Method Membership</h2>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-semibold">{statusLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price</span>
            <span className="font-semibold">$67/month (after trial)</span>
          </div>
          {subscription.trial_end_date && subscription.status === "trialing" && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trial ends</span>
              <span className="font-semibold">
                {new Date(subscription.trial_end_date).toLocaleDateString()}
              </span>
            </div>
          )}
          {subscription.current_period_end && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next charge</span>
              <span className="font-semibold">
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </span>
            </div>
          )}
          {subscription.cancel_at_period_end && (
            <div className="flex items-center gap-2 text-sm text-secondary-foreground bg-secondary/40 p-3 rounded-lg mt-3">
              <AlertCircle className="h-4 w-4" />
              Your membership will end on{" "}
              {subscription.current_period_end &&
                new Date(subscription.current_period_end).toLocaleDateString()}
              . No further charges.
            </div>
          )}
        </div>

        <Button
          onClick={openPortal}
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-dark text-primary-foreground"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
          Manage Subscription
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Cancel, update card, or change plan in the secure billing portal.
        </p>
      </Card>

      <Card className="p-5 bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Questions? Email{" "}
          <a href="mailto:support@diabetesresetmethod.com" className="text-primary underline">
            support@diabetesresetmethod.com
          </a>{" "}
          and we'll respond within 1 business day.
        </p>
      </Card>
    </div>
  );
}
