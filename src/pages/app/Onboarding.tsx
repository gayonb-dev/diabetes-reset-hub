import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [waConsent, setWaConsent] = useState(false); // unchecked by default (ToS)
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!user) return;
    setSaving(true);

    if (waConsent && phone.trim()) {
      await supabase.from("whatsapp_consent").upsert(
        {
          user_id: user.id,
          phone_number: phone.trim(),
          opted_in_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }

    setSaving(false);
    navigate("/app", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-2 w-12 rounded-full ${n <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <Card className="p-8">
            <h1 className="font-heading font-bold text-2xl mb-3">Welcome 👋</h1>
            <p className="text-muted-foreground mb-6">
              You're in. Here's how your first 14 days work:
            </p>
            <ul className="space-y-3 mb-6 text-sm">
              <li>
                <strong>Days 1–5:</strong> Daily 10-minute Reset action. One per day.
              </li>
              <li>
                <strong>Days 6–7:</strong> Library unlocks. Apply what you learned.
              </li>
              <li>
                <strong>Days 8–14:</strong> Full app access — Q&A, recipes, mini-challenges.
              </li>
              <li>
                <strong>Day 15:</strong> $67/mo membership begins automatically. Cancel anytime.
              </li>
            </ul>
            <Button onClick={() => setStep(2)} className="w-full bg-primary hover:bg-primary-dark text-primary-foreground">
              Continue
            </Button>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-8">
            <h1 className="font-heading font-bold text-2xl mb-3">WhatsApp updates (optional)</h1>
            <p className="text-muted-foreground mb-4 text-sm">
              We send a short weekly Reset Brief on WhatsApp — recipes, tips, and a nudge. If you skip
              this, you'll still get the same content by email.
            </p>
            <Input
              type="tel"
              placeholder="WhatsApp number (with country code, e.g. +1...)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mb-4"
            />
            <div className="flex items-start space-x-2 mb-6">
              <Checkbox
                id="wa-consent"
                checked={waConsent}
                onCheckedChange={(c) => setWaConsent(c === true)}
                className="mt-0.5"
              />
              <label htmlFor="wa-consent" className="text-sm cursor-pointer leading-snug">
                Yes, send me the weekly Reset Brief on WhatsApp. I can reply STOP anytime to opt out.
              </label>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                Skip — email only
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={waConsent && !phone.trim()}
                className="flex-1 bg-primary hover:bg-primary-dark text-primary-foreground"
              >
                Continue
              </Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-8">
            <h1 className="font-heading font-bold text-2xl mb-3">Ready to start Day 1</h1>
            <p className="text-muted-foreground mb-6 text-sm">
              Hydration. One full glass of water before each meal. That's it.
            </p>
            <Button
              onClick={finish}
              disabled={saving}
              className="w-full bg-primary hover:bg-primary-dark text-primary-foreground"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Take me to my dashboard
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Coaching content only, not medical advice.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
