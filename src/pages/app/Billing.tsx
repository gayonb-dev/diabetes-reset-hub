import { useState } from "react";
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
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Billing() {
  const { subscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

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
        setCancelOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center text-sm text-muted-foreground">
        No subscription found.
      </div>
    );
  }

  const statusLabel = {
    trialing: "Trial",
    active: "Active",
    past_due: "Payment failed",
    cancelled: "Cancelled",
    incomplete: "Incomplete",
    unpaid: "Unpaid",
  }[subscription.status];

  const nextChargeDate =
    subscription.trial_end_date && subscription.status === "trialing"
      ? subscription.trial_end_date
      : subscription.current_period_end;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <h1 className="font-heading font-semibold text-2xl text-foreground">Billing</h1>

      <Card className="p-6 border border-border">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Current plan</p>
        <h2 className="font-heading font-semibold text-lg text-foreground mb-4">
          Diabetes Reset Method Membership
        </h2>

        <dl className="text-sm space-y-2">
          <Row label="Status" value={statusLabel ?? subscription.status} />
          <Row label="Price" value="$67 / month" />
          {nextChargeDate && (
            <Row
              label={subscription.status === "trialing" ? "First charge" : "Next charge"}
              value={new Date(nextChargeDate).toLocaleDateString()}
            />
          )}
        </dl>

        {subscription.cancel_at_period_end && (
          <div className="flex items-start gap-2 text-sm text-foreground bg-muted/60 p-3 rounded-md mt-4">
            <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <span>
              Membership ends on{" "}
              {subscription.current_period_end &&
                new Date(subscription.current_period_end).toLocaleDateString()}
              . No further charges.
            </span>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <Button
            onClick={openPortal}
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update card
          </Button>
          <Button
            onClick={() => setCancelOpen(true)}
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
          >
            Cancel membership
          </Button>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Questions? Email{" "}
        <a href="mailto:support@diabetesresetmethod.com" className="text-primary underline">
          support@diabetesresetmethod.com
        </a>
      </p>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel membership?</DialogTitle>
            <DialogDescription>
              You'll keep access until{" "}
              {subscription.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString()
                : "the end of the current period"}
              . No further charges after that.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Keep membership
            </Button>
            <Button
              onClick={openPortal}
              disabled={loading}
              variant="destructive"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue to cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
