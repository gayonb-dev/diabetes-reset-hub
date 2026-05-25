import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, ClipboardList, Calendar, Trophy, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const IntakeForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailFromParam = searchParams.get("email") || "";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    age: "",
    email: emailFromParam,
    phone: "",
    country: "",
    diabetes_type: "",
    diabetes_duration: "",
    current_medications: "",
    uses_insulin: false,
    willing_to_cook: true,
    availability: "",
    preferred_start_date: "",
    preferred_time: "",
    timezone: "America/Jamaica",
    why_now: "",
    health_goals: "",
    coaching_agreement: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.full_name.trim()) newErrors.full_name = "Full name is required";
    if (!form.age || isNaN(Number(form.age)) || Number(form.age) < 18 || Number(form.age) > 120) newErrors.age = "Valid age (18-120) is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Valid email is required";
    if (!form.country.trim()) newErrors.country = "Country is required";
    if (!form.diabetes_type) newErrors.diabetes_type = "Please select your diabetes type";
    if (!form.why_now.trim()) newErrors.why_now = "Please share why you want to start now";
    if (!form.coaching_agreement) newErrors.coaching_agreement = "You must agree to proceed";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // PHI gate — intake collects PHI (meds, diabetes type, etc.). Require the
    // same explicit acknowledgement the chat does: the coaching_agreement
    // checkbox above acts as the consent record. If they unchecked it,
    // validate() already blocked them.

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("intake_submissions").insert({
        full_name: form.full_name.trim(),
        age: Number(form.age),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        country: form.country.trim(),
        diabetes_type: form.diabetes_type,
        diabetes_duration: form.diabetes_duration.trim() || null,
        current_medications: form.current_medications.trim() || null,
        uses_insulin: form.uses_insulin,
        willing_to_cook: form.willing_to_cook,
        availability: form.availability.trim() || null,
        preferred_start_date: form.preferred_start_date || null,
        preferred_time: form.preferred_time || null,
        timezone: form.timezone,
        why_now: form.why_now.trim(),
        health_goals: form.health_goals.trim() || null,
        coaching_agreement: form.coaching_agreement,
        phi_consent_required: true,
      });

      if (error) throw error;

      // Best-effort: link the chat anonymous_id and log an activity_event.
      const anonId = localStorage.getItem("drm_visitor_id");
      if (anonId) {
        const { data: profile } = await supabase
          .from("visitor_profiles")
          .select("id, user_id")
          .eq("anonymous_id", anonId)
          .maybeSingle();
        if (profile) {
          await supabase.from("activity_events" as never).insert({
            visitor_profile_id: profile.id,
            user_id: profile.user_id,
            event_type: "intake_submit",
            metadata: { email: form.email.trim().toLowerCase() },
          } as never);
        }
      }

      setIsSubmitted(true);
      toast.success("Intake form submitted successfully!");
    } catch (err) {
      console.error("Intake submission error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>
          <h1 className="font-heading font-bold text-3xl text-foreground">Intake Form Complete! ✅</h1>
          <p className="text-muted-foreground text-lg">
            Thank you! Your information has been received. We'll review it and reach out via WhatsApp to confirm your schedule.
          </p>
          <div className="space-y-3">
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 font-bold rounded-xl h-auto text-lg">
              <a href="/book" target="_blank" rel="noopener noreferrer">
                <Calendar className="mr-2 h-5 w-5" />
                Book Your First Session
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full py-3 font-semibold rounded-xl h-auto border-primary/30 hover:bg-primary/5">
              <a href="https://wa.me/18768822547?text=Hi!%20I%20just%20completed%20my%20intake%20form!" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Message Coach on WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full py-3 font-semibold rounded-xl h-auto border-primary/30 hover:bg-primary/5">
              <a href="/progress" target="_blank" rel="noopener noreferrer">
                <Trophy className="mr-2 h-4 w-4" /> Open Progress Tracker
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-lg border-2 ${errors[field] ? "border-destructive" : "border-input focus:border-primary"}`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Client Intake — The Diabetes Reset Method</title>
        <meta name="description" content="Complete your client intake form to start your personalized Diabetes Reset coaching journey." />
        <link rel="canonical" href="https://diabetesresetmethod.com/intake" />
        <meta property="og:url" content="https://diabetesresetmethod.com/intake" />
        <meta property="og:title" content="Client Intake — The Diabetes Reset Method" />
        <meta property="og:description" content="Share your health background so we can personalize your coaching." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex gap-3 mb-8">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-primary/30 hover:bg-primary/5"
          >
            <a href="/book" target="_blank" rel="noopener noreferrer">
              <Calendar className="mr-2 h-4 w-4" /> Book Sessions
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-primary/30 hover:bg-primary/5"
          >
            <a href="/progress" target="_blank" rel="noopener noreferrer">
              <Trophy className="mr-2 h-4 w-4" /> Progress Tracker
            </a>
          </Button>
        </div>

        <div className="text-center mb-10">
          <p className="text-sm font-semibold tracking-widest uppercase text-primary mb-3">The Diabetes Reset Method</p>
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-3">Client Intake Form</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Please complete this form before your Day 1 session so we can personalize your challenge experience.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Info */}
          <section className="space-y-4">
            <h2 className="font-heading font-semibold text-xl text-foreground border-b border-border pb-2">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Full Name *</label>
                <Input value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} className={inputClass("full_name")} placeholder="Your full name" />
                {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Age *</label>
                <Input type="number" value={form.age} onChange={(e) => updateField("age", e.target.value)} className={inputClass("age")} placeholder="Your age" min="18" max="120" />
                {errors.age && <p className="text-xs text-destructive mt-1">{errors.age}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Email Address *</label>
                <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className={inputClass("email")} placeholder="your@email.com" />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Phone Number</label>
                <Input type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className={inputClass("phone")} placeholder="+1 (876) 000-0000" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Country *</label>
              <Input value={form.country} onChange={(e) => updateField("country", e.target.value)} className={inputClass("country")} placeholder="e.g. Jamaica" />
              {errors.country && <p className="text-xs text-destructive mt-1">{errors.country}</p>}
            </div>
          </section>

          {/* Health Background */}
          <section className="space-y-4">
            <h2 className="font-heading font-semibold text-xl text-foreground border-b border-border pb-2">Health Background</h2>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Diabetes Type *</label>
              <Select value={form.diabetes_type} onValueChange={(v) => updateField("diabetes_type", v)}>
                <SelectTrigger className={inputClass("diabetes_type")}>
                  <SelectValue placeholder="Select your diabetes type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="type2">Type 2 Diabetes</SelectItem>
                  <SelectItem value="prediabetes">Pre-Diabetes</SelectItem>
                  <SelectItem value="type1">Type 1 Diabetes</SelectItem>
                  <SelectItem value="gestational">Gestational Diabetes</SelectItem>
                  <SelectItem value="unsure">Not Sure</SelectItem>
                </SelectContent>
              </Select>
              {errors.diabetes_type && <p className="text-xs text-destructive mt-1">{errors.diabetes_type}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">How long have you had diabetes?</label>
              <Input value={form.diabetes_duration} onChange={(e) => updateField("diabetes_duration", e.target.value)} className={inputClass("diabetes_duration")} placeholder="e.g. 3 years, recently diagnosed" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Current Medications</label>
              <Textarea value={form.current_medications} onChange={(e) => updateField("current_medications", e.target.value)} className={inputClass("current_medications")} placeholder="List any medications you're currently taking" rows={3} />
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox id="uses_insulin" checked={form.uses_insulin} onCheckedChange={(v) => updateField("uses_insulin", !!v)} />
              <label htmlFor="uses_insulin" className="text-sm text-foreground">I currently use insulin</label>
            </div>
          </section>

          {/* Lifestyle */}
          <section className="space-y-4">
            <h2 className="font-heading font-semibold text-xl text-foreground border-b border-border pb-2">Lifestyle & Commitment</h2>
            <div className="flex items-center space-x-3">
              <Checkbox id="willing_to_cook" checked={form.willing_to_cook} onCheckedChange={(v) => updateField("willing_to_cook", !!v)} />
              <label htmlFor="willing_to_cook" className="text-sm text-foreground">I am willing to prepare simple meals at home</label>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Availability for Sessions</label>
              <Input value={form.availability} onChange={(e) => updateField("availability", e.target.value)} className={inputClass("availability")} placeholder="e.g. Mornings, evenings after 6pm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Preferred Start Date</label>
                <Input type="date" value={form.preferred_start_date} onChange={(e) => updateField("preferred_start_date", e.target.value)} className={inputClass("preferred_start_date")} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Preferred Session Time</label>
                <Input type="time" value={form.preferred_time} onChange={(e) => updateField("preferred_time", e.target.value)} className={inputClass("preferred_time")} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Your Timezone</label>
              <Select value={form.timezone} onValueChange={(v) => updateField("timezone", v)}>
                <SelectTrigger className={inputClass("timezone")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Jamaica">Jamaica (EST)</SelectItem>
                  <SelectItem value="America/New_York">US Eastern</SelectItem>
                  <SelectItem value="America/Chicago">US Central</SelectItem>
                  <SelectItem value="America/Denver">US Mountain</SelectItem>
                  <SelectItem value="America/Los_Angeles">US Pacific</SelectItem>
                  <SelectItem value="Europe/London">UK (GMT)</SelectItem>
                  <SelectItem value="America/Toronto">Canada Eastern</SelectItem>
                  <SelectItem value="Other">Other (specify in availability)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* Readiness */}
          <section className="space-y-4">
            <h2 className="font-heading font-semibold text-xl text-foreground border-b border-border pb-2">Readiness & Goals</h2>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Why do you want to reverse your diabetes NOW? *</label>
              <Textarea value={form.why_now} onChange={(e) => updateField("why_now", e.target.value)} className={inputClass("why_now")} placeholder="Share what's motivating you to take action today..." rows={4} />
              {errors.why_now && <p className="text-xs text-destructive mt-1">{errors.why_now}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">What does your ideal health look like?</label>
              <Textarea value={form.health_goals} onChange={(e) => updateField("health_goals", e.target.value)} className={inputClass("health_goals")} placeholder="Describe the health outcomes you're hoping to achieve..." rows={3} />
            </div>
          </section>

          {/* Agreement */}
          <section className="bg-muted/50 rounded-xl p-6 space-y-4">
            <h2 className="font-heading font-semibold text-xl text-foreground">Coaching Agreement *</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              I understand that The Diabetes Reset Method provides health and wellness coaching, NOT medical advice. I will continue to work with my healthcare provider and will not stop or change any medications without consulting them first. I take full responsibility for my health decisions.
            </p>
            <div className="flex items-start space-x-3">
              <Checkbox id="coaching_agreement" checked={form.coaching_agreement} onCheckedChange={(v) => updateField("coaching_agreement", !!v)} className="mt-0.5" />
              <label htmlFor="coaching_agreement" className="text-sm text-foreground">
                I agree to the coaching terms above *
              </label>
            </div>
            {errors.coaching_agreement && <p className="text-xs text-destructive">{errors.coaching_agreement}</p>}
          </section>

          <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 font-bold rounded-xl h-auto text-lg">
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...</>
            ) : (
              "Submit Intake Form"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default IntakeForm;
