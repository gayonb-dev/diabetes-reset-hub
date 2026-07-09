import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function CoachingWaitlist() {
  const { user, subscription } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState<any>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: user?.email || "",
    phone: "",
    why_now: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("coaching_waitlist")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setJoined(data);
        if (user.email) setForm((f) => ({ ...f, email: user.email! }));
        setLoading(false);
      });
  }, [user]);

  const eligibleDays = subscription?.day_number || 0;
  const eligible = eligibleDays >= 60;

  const submit = async () => {
    if (!user) return;
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Name and email required");
      return;
    }
    setSubmitting(true);
    const { error, data } = await supabase
      .from("coaching_waitlist")
      .insert({
        user_id: user.id,
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        why_now: form.why_now.trim() || null,
        eligible_at: eligible ? new Date().toISOString() : null,
      })
      .select()
      .single();
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      setJoined(data);
      toast.success("You're on the waitlist!");
    }
  };

  if (loading) return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mt-12" />;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading font-bold text-3xl mb-2 flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" />
          1:1 High-Touch Support
        </h1>
        <p className="text-muted-foreground">
          Limited spots. Get personal weekly support sessions, custom meal plans, and a private
          WhatsApp line with Gayon.
        </p>
      </div>

      {joined ? (
        <Card className="p-6 bg-primary/5 border-primary">
          <CheckCircle2 className="h-10 w-10 text-primary mb-3" />
          <h2 className="font-heading font-bold text-xl mb-2">You're on the list</h2>
          <p className="text-sm text-muted-foreground mb-4">
            We'll reach out via WhatsApp or email at <strong>{joined.email}</strong> when a slot opens.
          </p>
          <p className="text-xs text-muted-foreground">
            Status: <span className="font-semibold capitalize">{joined.status}</span>
          </p>
        </Card>
      ) : (
        <Card className="p-6 space-y-4">
          {!eligible && (
            <div className="bg-secondary/40 p-3 rounded-md text-sm">
              <strong>Eligibility note:</strong> 1:1 support prioritises members who've completed at
              least 60 days inside the Reset Method (you're on day {eligibleDays}). You can still join
              the list now — we'll notify you when you become eligible.
            </div>
          )}

          <div>
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label>WhatsApp number (optional)</Label>
            <Input
              type="tel"
              placeholder="+1 876 555 0000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Why now? (optional)</Label>
            <Textarea
              rows={4}
              placeholder="What outcome do you want from 1:1 support?"
              value={form.why_now}
              onChange={(e) => setForm({ ...form, why_now: e.target.value })}
            />
          </div>

          <Button
            onClick={submit}
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary-dark"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Join the Waitlist
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Educational only — not medical advice.
          </p>
        </Card>
      )}
    </div>
  );
}
