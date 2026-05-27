// /app/settings — full member settings (units, notifications, account, data, sign out)
// Spec sections 19/21 highlights: unit toggles, WhatsApp opt-in/out, data export & delete,
// destructive sign-out at bottom of page (green, not red), confirmation dialog.

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CreditCard, Shield, Download, Trash2, LogOut, ArrowRight, UtensilsCrossed, RefreshCw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { getUnits, setUnits, WeightUnit, GlucoseUnit } from "@/lib/units";

const CUISINE_OPTIONS = [
  "International (balanced)",
  "Mediterranean",
  "Asian",
  "Latin",
  "African",
  "Caribbean",
  "American",
] as const;
const PROTEIN_OPTIONS = [
  "Chicken",
  "Fish and seafood",
  "Beef",
  "Pork",
  "Eggs",
  "Legumes and beans",
  "Tofu and plant protein",
  "I eat all of these",
] as const;
const COOKING_TIME_OPTIONS = [
  "Under 20 minutes",
  "20 to 45 minutes",
  "Over 45 minutes",
  "I prefer no-cook or minimal prep",
] as const;

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const u = getUnits();
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(u.weight);
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseUnit>(u.glucose);

  const [waPhone, setWaPhone] = useState("");
  const [waOptedIn, setWaOptedIn] = useState(false);
  const [waSaving, setWaSaving] = useState(false);

  const [signOutOpen, setSignOutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Meal Plan Preferences (Section 5 — Section 20 of spec)
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileMetadata, setProfileMetadata] = useState<Record<string, unknown>>({});
  const [cuisines, setCuisines] = useState<string[]>(["International (balanced)"]);
  const [proteins, setProteins] = useState<string[]>(["I eat all of these"]);
  const [foodsToAvoid, setFoodsToAvoid] = useState("");
  const [cookingTime, setCookingTime] = useState<string>("20 to 45 minutes");
  const [initialPrefs, setInitialPrefs] = useState<string>("");
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("whatsapp_consent")
      .select("phone_number, revoked_at")
      .eq("user_id", user.id)
      .order("opted_in_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!user) return;
    supabase
      .from("whatsapp_consent")
      .select("phone_number, revoked_at")
      .eq("user_id", user.id)
      .order("opted_in_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setWaPhone(data.phone_number ?? "");
          setWaOptedIn(!data.revoked_at);
        }
      });

    // Load meal plan preferences from visitor_profiles.metadata
    supabase
      .from("visitor_profiles")
      .select("id, metadata")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const meta = (data.metadata as Record<string, unknown>) ?? {};
        setProfileId(data.id);
        setProfileMetadata(meta);
        const c = (meta.cuisine_preferences as string[]) ?? ["International (balanced)"];
        const p = (meta.protein_preferences as string[]) ?? ["I eat all of these"];
        const avoid = (meta.foods_to_avoid as string) ?? "";
        const ct = (meta.cooking_time as string) ?? "20 to 45 minutes";
        setCuisines(c);
        setProteins(p);
        setFoodsToAvoid(avoid);
        setCookingTime(ct);
        setInitialPrefs(JSON.stringify({ c, p, avoid, ct }));
      });
  }, [user]);

  const prefsDirty =
    initialPrefs !== "" &&
    JSON.stringify({ c: cuisines, p: proteins, avoid: foodsToAvoid, ct: cookingTime }) !== initialPrefs;

  const toggleInArray = (arr: string[], v: string, single?: string) => {
    // If "I eat all of these" is selected, clear others; selecting any other clears it.
    if (single && v === single) return [single];
    const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr.filter((x) => x !== single), v];
    return next.length === 0 ? (single ? [single] : []) : next;
  };

  const regenerateMealPlan = async () => {
    if (!user || !profileId) return;
    setRegenerating(true);
    try {
      const allergies = foodsToAvoid
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const newMeta = {
        ...profileMetadata,
        cuisine_preferences: cuisines,
        protein_preferences: proteins,
        foods_to_avoid: foodsToAvoid,
        allergies,
        cooking_time: cookingTime,
      };
      await supabase
        .from("visitor_profiles")
        .update({ metadata: newMeta } as never)
        .eq("id", profileId);
      setProfileMetadata(newMeta);

      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setDate(today.getDate() + 13);
      const { data: planRow, error } = await supabase
        .from("meal_plans")
        .insert({
          member_id: user.id,
          plan_type: "standard",
          generation_status: "pending",
          generation_trigger: "preferences_update",
          valid_from: today.toISOString().slice(0, 10),
          valid_until: validUntil.toISOString().slice(0, 10),
          preferences_snapshot: {
            cuisine_preferences: cuisines,
            protein_preferences: proteins,
            allergies,
            cooking_time: cookingTime,
          },
          plan_data: {},
        } as never)
        .select("id")
        .single();
      if (error) throw error;

      if (planRow?.id) {
        supabase.functions
          .invoke("generate-meal-plan", { body: { plan_id: planRow.id } })
          .catch(() => {});
      }
      setInitialPrefs(JSON.stringify({ c: cuisines, p: proteins, avoid: foodsToAvoid, ct: cookingTime }));
      toast({
        title: "Regenerating your meal plan",
        description: "We'll have your new plan ready in under a minute.",
      });
    } catch (e) {
      toast({
        title: "Couldn't regenerate",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRegenerating(false);
    }
  };

  const saveUnits = (next: { weight?: WeightUnit; glucose?: GlucoseUnit }) => {
    setUnits(next);
    toast({ title: "Units updated" });
  };

  const saveWhatsapp = async () => {
    if (!user) return;
    setWaSaving(true);
    if (waOptedIn && waPhone.trim()) {
      await supabase.from("whatsapp_consent").upsert(

        {
          user_id: user.id,
          phone_number: waPhone.trim(),
          opted_in_at: new Date().toISOString(),
          revoked_at: null,
        } as never,
        { onConflict: "user_id" },
      );
    } else {
      await supabase
        .from("whatsapp_consent")
        .update({ revoked_at: new Date().toISOString(), revoke_reason: "user_settings_toggle" } as never)
        .eq("user_id", user.id);
    }
    setWaSaving(false);
    toast({ title: "WhatsApp preferences saved" });
  };

  const exportData = async () => {
    if (!user) return;
    const [{ data: logs }, { data: progress }, { data: streak }, { data: badges }] = await Promise.all([
      supabase.from("health_logs").select("*").eq("user_id", user.id),
      supabase.from("member_progress").select("*").eq("user_id", user.id),
      supabase.from("user_streaks").select("*").eq("user_id", user.id),
      supabase.from("user_badges").select("earned_at, badges(slug,name)").eq("user_id", user.id),
    ]);
    const blob = new Blob(
      [JSON.stringify({ user: { id: user.id, email: user.email }, logs, progress, streak, badges }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drm-data-${user.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export downloaded" });
  };

  const deleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    // Fire the deletion edge function for PHI purge; account row stays referenced via auth.
    try {
      await supabase.functions.invoke("request-data-deletion", {
        body: { anonymous_id: user.id },
      });
      toast({
        title: "Deletion requested",
        description: "Your health data is being purged. You'll be signed out.",
      });
      await signOut();
      navigate("/", { replace: true });
    } catch {
      toast({ title: "Couldn't process request", description: "Email support.", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
      </div>

      {/* Units */}
      <Card className="p-5 border-border">
        <h2 className="font-semibold text-base mb-1">Units</h2>
        <p className="text-xs text-muted-foreground mb-4">How we show your numbers.</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Weight</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <Chip active={weightUnit === "lb"} onClick={() => { setWeightUnit("lb"); saveUnits({ weight: "lb" }); }}>lb</Chip>
              <Chip active={weightUnit === "kg"} onClick={() => { setWeightUnit("kg"); saveUnits({ weight: "kg" }); }}>kg</Chip>
            </div>
          </div>
          <div>
            <Label className="text-xs">Blood sugar</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <Chip active={glucoseUnit === "mgdl"} onClick={() => { setGlucoseUnit("mgdl"); saveUnits({ glucose: "mgdl" }); }}>mg/dL</Chip>
              <Chip active={glucoseUnit === "mmoll"} onClick={() => { setGlucoseUnit("mmoll"); saveUnits({ glucose: "mmoll" }); }}>mmol/L</Chip>
            </div>
          </div>
        </div>
      </Card>

      {/* WhatsApp */}
      <Card className="p-5 border-border">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold text-base">WhatsApp updates</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Weekly Reset Brief — recipes, tips, a nudge.
            </p>
          </div>
          <Switch checked={waOptedIn} onCheckedChange={setWaOptedIn} />
        </div>
        {waOptedIn && (
          <div className="space-y-2">
            <Label htmlFor="wa" className="text-xs">Number</Label>
            <Input
              id="wa"
              type="tel"
              placeholder="+1 555 123 4567"
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
            />
          </div>
        )}
        <Button onClick={saveWhatsapp} disabled={waSaving} variant="outline" size="sm" className="mt-3">
          {waSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save preferences
        </Button>
      </Card>

      {/* Meal Plan Preferences — Section 5 (Section 20 of spec) */}
      <Card className="p-5 border-border">
        <h2 className="font-semibold text-base flex items-center gap-2 mb-1">
          <UtensilsCrossed className="h-4 w-4 text-primary" /> Meal Plan Preferences
        </h2>
        <p className="text-xs text-muted-foreground mb-5">
          These shape every plan we generate for you. Changes take effect when you regenerate.
        </p>

        {/* Cuisine */}
        <div className="mb-5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cuisine style</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {CUISINE_OPTIONS.map((c) => {
              const on = cuisines.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCuisines((prev) => toggleInArray(prev, c))}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Proteins */}
        <div className="mb-5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Protein preferences</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {PROTEIN_OPTIONS.map((p) => {
              const on = proteins.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setProteins((prev) => toggleInArray(prev, p, "I eat all of these"))
                  }
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Foods to avoid */}
        <div className="mb-5">
          <Label htmlFor="avoid" className="text-xs uppercase tracking-wide text-muted-foreground">
            Foods to avoid
          </Label>
          <Textarea
            id="avoid"
            placeholder="E.g. shellfish, peanuts, dairy, cilantro…"
            value={foodsToAvoid}
            onChange={(e) => setFoodsToAvoid(e.target.value)}
            className="mt-2 min-h-[64px]"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Comma-separate. We'll skip these in every plan.
          </p>
        </div>

        {/* Cooking time */}
        <div className="mb-5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cooking time</Label>
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            {COOKING_TIME_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setCookingTime(t)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  cookingTime === t
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {prefsDirty && (
          <Button
            onClick={regenerateMealPlan}
            disabled={regenerating}
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            {regenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Regenerate my meal plan with these preferences
          </Button>
        )}
      </Card>

      {/* Billing link */}
      <Card className="p-5 border-border">

        <h2 className="font-semibold text-base flex items-center gap-2 mb-1">
          <CreditCard className="h-4 w-4 text-primary" /> Billing
        </h2>
        <p className="text-xs text-muted-foreground mb-3">Manage subscription, update card, cancel.</p>
        <Link to="/app/billing">
          <Button variant="outline" size="sm">
            Open billing <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
      </Card>

      {/* Privacy & data */}
      <Card className="p-5 border-border">
        <h2 className="font-semibold text-base flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" /> Privacy & data
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Your data stays yours. Export or delete anytime.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export my data
          </Button>
          <Button
            onClick={() => setDeleteOpen(true)}
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/40 hover:bg-destructive/5"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete my data
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Deletion is permanent and purges within 24 hours. See our{" "}
          <Link to="/privacy" className="underline text-primary">privacy policy</Link>.
        </p>
      </Card>

      <Separator />

      {/* Sign out — green per spec (not destructive red) */}
      <div className="flex justify-center pb-8">
        <Button
          onClick={() => setSignOutOpen(true)}
          className="bg-primary hover:bg-primary-hover text-primary-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>

      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out of your account?</DialogTitle>
            <DialogDescription>You'll need your magic link to sign back in.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setSignOutOpen(false)}>Cancel</Button>
            <Button
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
              onClick={async () => {
                await signOut();
                navigate("/", { replace: true });
              }}
            >
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all your data?</DialogTitle>
            <DialogDescription>
              This permanently purges your health logs, conversations, and consent records within 24
              hours. Your account will be signed out. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteAccount} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}
