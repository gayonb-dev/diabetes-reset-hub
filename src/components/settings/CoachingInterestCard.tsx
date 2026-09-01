/**
 * Batch 2 Part F, minimal coaching-interest surface.
 *
 * Collects authenticated identity/email, explicit consent and a timestamp only.
 * No health narrative, no free-text field, no urgency, deposit, checkout,
 * availability or launch promise. A member can withdraw at any time, and the
 * record is covered by data export, deletion and retention.
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { HeartHandshake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type Row = { id: string; consented_at: string; status: string };

export function CoachingInterestCard() {
  const { user } = useAuth();
  const [row, setRow] = useState<Row | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("coaching_interest")
        .select("id, consented_at, status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setState("error");
        return;
      }
      setRow(data && data.status === "withdrawn" ? null : (data as Row | null));
      setState("ready");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- identity is the user id only
  }, [user?.id]);

  const register = async () => {
    if (!user?.email || !consent) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("coaching_interest")
      .upsert(
        {
          user_id: user.id,
          email: user.email,
          status: "interested",
          consented_at: new Date().toISOString(),
          withdrawn_at: null,
        },
        { onConflict: "user_id" },
      )
      .select("id, consented_at, status")
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save your interest", description: error.message, variant: "destructive" });
      return;
    }
    setRow(data as Row);
    toast({ title: "Interest recorded" });
  };

  const withdraw = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("coaching_interest")
      .update({ status: "withdrawn", withdrawn_at: new Date().toISOString() })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't remove your interest", description: error.message, variant: "destructive" });
      return;
    }
    setRow(null);
    setConsent(false);
    toast({ title: "Interest removed" });
  };

  return (
    <Card className="p-5 border-border rounded-xl shadow-warm">
      <h2 className="font-heading font-semibold text-base flex items-center gap-2 mb-1">
        <HeartHandshake className="h-4 w-4 text-primary" aria-hidden /> Interested in future coaching?
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Coaching is not part of your membership and is not available today. Leaving your name
        here records your interest only. It is not a booking, a place in a queue, or a payment,
        and we make no promise about if or when coaching will be offered.
      </p>

      {state === "loading" && (
        <p className="text-sm text-muted-foreground" role="status">
          Loading your preference…
        </p>
      )}

      {state === "error" && (
        <p className="text-sm text-destructive" role="status">
          We couldn't load your coaching-interest preference. Try again later.
        </p>
      )}

      {state === "ready" && row && (
        <div className="space-y-3">
          <p className="text-sm text-foreground">
            Your interest was recorded on{" "}
            <span className="tabular-nums">
              {new Date(row.consented_at).toLocaleDateString()}
            </span>
            .
          </p>
          <Button variant="outline" size="sm" className="min-h-11" onClick={withdraw} disabled={saving}>
            Remove my interest
          </Button>
        </div>
      )}

      {state === "ready" && !row && (
        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm text-secondary-fg cursor-pointer">
            <Checkbox
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              aria-label="Record my interest in future coaching"
              className="mt-0.5 h-6 w-6"
            />
            <span>
              Record my interest using my account email ({user?.email}). I understand this
              collects no health information and promises no availability.
            </span>
          </label>
          <Button size="sm" className="min-h-11" onClick={register} disabled={!consent || saving}>
            Register my interest
          </Button>
        </div>
      )}
    </Card>
  );
}

export default CoachingInterestCard;
