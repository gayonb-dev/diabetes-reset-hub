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
import { Loader2, CreditCard, Shield, Download, Trash2, LogOut, ArrowRight, UtensilsCrossed, RefreshCw, User, Bell, Clock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import VitaErrorCard from "@/components/vita/VitaErrorCard";
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

  // Profile — community display name (defaults to first_name, editable independently)
  const [firstName, setFirstName] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [initialDisplayName, setInitialDisplayName] = useState<string>("");

  // Notification preferences (profiles.notification_prefs jsonb)
  type NotifPrefs = Record<string, boolean>;
  const DEFAULT_NOTIF_PREFS: NotifPrefs = {
    vita_morning: true,
    daily_action: true,
    streak_at_risk: true,
    level_up: true,
    water: true,
    workout: true,
    a1c: true,
    measurement: true,
    cheat_meal: true,
    birthday: true,
    community_mission: true,
  };
  const NOTIF_LABELS: Record<string, { title: string; desc: string }> = {
    vita_morning: { title: "VITA morning greeting", desc: "Daily nudge from VITA to start your day." },
    daily_action: { title: "Daily action reminders", desc: "Today-screen habit nudges." },
    streak_at_risk: { title: "Streak at risk", desc: "Heads-up when your streak could break tonight." },
    level_up: { title: "Level up & badges", desc: "When you earn XP, levels, or new badges." },
    water: { title: "Water reminders", desc: "Hydration nudges through the day." },
    workout: { title: "Workout reminders", desc: "Reminders on your scheduled training days." },
    a1c: { title: "A1C reminders", desc: "Periodic prompts to log a new A1C." },
    measurement: { title: "Measurement reminders", desc: "Weekly nudge to update measurements." },
    cheat_meal: { title: "Cheat meal coaching", desc: "Tips after logging an off-plan meal." },
    birthday: { title: "Birthday greeting", desc: "A short note from VITA on your day." },
    community_mission: { title: "Community missions", desc: "Weekly community challenges and Q&A picks." },
  };
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);

  // Meal Plan Preferences (Section 5 — Section 20 of spec)
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileMetadata, setProfileMetadata] = useState<Record<string, unknown>>({});
  const [cuisines, setCuisines] = useState<string[]>(["International (balanced)"]);
  const [proteins, setProteins] = useState<string[]>(["I eat all of these"]);
  const [foodsToAvoid, setFoodsToAvoid] = useState("");
  const [cookingTime, setCookingTime] = useState<string>("20 to 45 minutes");
  const [initialPrefs, setInitialPrefs] = useState<string>("");
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [regenCount, setRegenCount] = useState<number>(0);
  const REGEN_MONTHLY_CAP = 2;

  // Timezone (IANA)
  const [timezone, setTimezone] = useState<string>("");
  const [initialTimezone, setInitialTimezone] = useState<string>("");
  const [tzSaving, setTzSaving] = useState(false);
  const tzOptions = (() => {
    try {
      const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
      if (typeof fn === "function") return fn("timeZone");
    } catch {
      /* ignore */
    }
    return [
      "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
      "America/Jamaica", "America/Toronto", "America/Mexico_City", "America/Sao_Paulo",
      "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid",
      "Africa/Lagos", "Africa/Johannesburg", "Asia/Dubai", "Asia/Kolkata",
      "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland",
    ];
  })();



  useEffect(() => {
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

    // Load profile (display name, first name, notification prefs, meal prefs) — single source of truth.
    supabase
      .from("profiles")
      .select("first_name, community_display_name, notification_prefs, meal_preferences, regenerations_this_month, regen_month")
      .eq("user_id", user.id)

      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const fn = data.first_name ?? "";
        const dn = data.community_display_name ?? fn ?? "";
        setFirstName(fn);
        setDisplayName(dn);
        setInitialDisplayName(dn);

        const np = (data.notification_prefs as NotifPrefs) ?? {};
        setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...np });

        const meta = (data.meal_preferences as Record<string, unknown>) ?? {};
        setProfileId(user.id);
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

        // Regen cap accounting — reset if we've crossed into a new month.
        const nowMonthStart = new Date();
        nowMonthStart.setUTCDate(1);
        nowMonthStart.setUTCHours(0, 0, 0, 0);
        const nowMonthISO = nowMonthStart.toISOString().slice(0, 10);
        const storedMonth = (data as unknown as { regen_month?: string | null }).regen_month ?? null;
        const storedCount = (data as unknown as { regenerations_this_month?: number }).regenerations_this_month ?? 0;
        if (storedMonth !== nowMonthISO) {
          setRegenCount(0);
        } else {
          setRegenCount(storedCount);
        }
      });

  }, [user]);

  const displayNameDirty = displayName.trim() !== initialDisplayName.trim() && displayName.trim().length > 0;

  const saveDisplayName = async () => {
    if (!user) return;
    const name = displayName.trim();
    if (!name) return;
    setDisplayNameSaving(true);
    try {
      // Primary write: profiles.community_display_name (spec).
      await supabase.from("profiles").update({ community_display_name: name } as never).eq("user_id", user.id);
      // Mirror to visitor_profiles for the community feed readers (Ask, Profile).
      await supabase
        .from("visitor_profiles")
        .update({ community_display_name: name } as never)
        .eq("user_id", user.id);
      setInitialDisplayName(name);
      toast({ title: "Display name updated", description: "This is how you'll appear in the community." });
    } catch (e) {
      toast({
        title: "Couldn't save display name",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDisplayNameSaving(false);
    }
  };

  const toggleNotif = async (key: string, value: boolean) => {
    if (!user) return;
    const next = { ...notifPrefs, [key]: value };
    setNotifPrefs(next);
    const { error } = await supabase
      .from("profiles")
      .update({ notification_prefs: next as never })
      .eq("user_id", user.id);
    if (error) {
      // revert on failure
      setNotifPrefs(notifPrefs);
      toast({ title: "Couldn't update notification", description: error.message, variant: "destructive" });
    }
  };

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

    // Enforce 2/month cap. Reset counter if we've crossed into a new month.
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const monthISO = monthStart.toISOString().slice(0, 10);
    if (regenCount >= REGEN_MONTHLY_CAP) {
      toast({
        title: "Monthly limit reached",
        description: `You get ${REGEN_MONTHLY_CAP} fresh meal plans per month. Your counter resets next month.`,
        variant: "destructive",
      });
      return;
    }

    setRegenerating(true);
    setRegenError(null);

    // 4-min safety net: surface VitaErrorCard if generation hasn't kicked off by then.
    const timeoutId = window.setTimeout(() => {
      setRegenError(
        "VITA is taking longer than usual to rebuild your plan. Try again, or open the Meals tab — partial weeks may already be ready.",
      );
    }, 4 * 60 * 1000);


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
        .from("profiles")
        .update({ meal_preferences: newMeta as never })
        .eq("user_id", user.id);
      setProfileMetadata(newMeta);

      const snapshot = {
        cuisine_preferences: cuisines,
        protein_preferences: proteins,
        allergies,
        cooking_time: cookingTime,
      };
      const dayStr = (offset: number) => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return d.toISOString().slice(0, 10);
      };

      // Create four one-week plan rows in parallel.
      const insertResults = await Promise.all([0, 7, 14, 21].map((offset) =>
        supabase
          .from("meal_plans")
          .insert({
            member_id: user.id,
            plan_type: "standard",
            generation_status: "pending",
            generation_trigger: "preference_change",
            valid_from: dayStr(offset),
            valid_until: dayStr(offset + 6),
            preferences_snapshot: snapshot,
            plan_data: {},
          } as never)
          .select("id")
          .single(),
      ));
      const insertError = insertResults.find((result) => result.error)?.error;
      if (insertError) throw insertError;

      const generationResults = await Promise.all(insertResults.map((result, index) =>
        result.data?.id
          ? supabase.functions.invoke("generate-meal-plan", { body: { plan_id: result.data.id, plan_index: index + 1 } })
          : Promise.resolve({ error: null }),
      ));
      const generationError = generationResults.find((result) => result.error)?.error;
      if (generationError) throw generationError;

      setInitialPrefs(JSON.stringify({ c: cuisines, p: proteins, avoid: foodsToAvoid, ct: cookingTime }));
      setRegenError(null);

      // Increment monthly regeneration counter.
      const nextCount = regenCount + 1;
      setRegenCount(nextCount);
      await supabase
        .from("profiles")
        .update({
          regenerations_this_month: nextCount,
          regen_month: monthISO,
        } as never)
        .eq("user_id", user.id);

      toast({
        title: "Meal plan regenerated",
        description: `Your Meals tab is ready with the new 4-week plan. ${REGEN_MONTHLY_CAP - nextCount} regeneration${REGEN_MONTHLY_CAP - nextCount === 1 ? "" : "s"} remaining this month.`,
      });
    } catch (e) {
      console.error("regenerateMealPlan failed", e);
      setRegenError(e instanceof Error ? e.message : "Couldn't reach VITA. Try again in a moment.");
    } finally {
      clearTimeout(timeoutId);
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

      {/* Profile */}
      <Card className="p-5 border-border">
        <h2 className="font-semibold text-base flex items-center gap-2 mb-1">
          <User className="h-4 w-4 text-primary" /> Profile
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Your account name stays private. Choose how you appear to other members.
        </p>
        <div className="space-y-2">
          <Label htmlFor="display-name" className="text-xs">Community display name</Label>
          <Input
            id="display-name"
            type="text"
            placeholder={firstName || "How you'll appear in community"}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
          />
          <p className="text-[11px] text-muted-foreground">
            Shown on questions, answers, and wins. Defaults to your first name. Does not change your account name.
          </p>
        </div>
        <Button
          onClick={saveDisplayName}
          disabled={displayNameSaving || !displayNameDirty}
          variant="outline"
          size="sm"
          className="mt-3"
        >
          {displayNameSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save display name
        </Button>
      </Card>

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

      {/* Notifications */}
      <Card className="p-5 border-border">
        <h2 className="font-semibold text-base flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4 text-primary" /> Notifications
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Turn off anything you don't want. Urgent account messages always come through.
        </p>
        <div className="space-y-3">
          {Object.entries(NOTIF_LABELS).map(([key, meta]) => (
            <div key={key} className="flex items-start justify-between gap-3 py-1">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{meta.title}</p>
                <p className="text-xs text-muted-foreground">{meta.desc}</p>
              </div>
              <Switch
                checked={notifPrefs[key] ?? true}
                onCheckedChange={(v) => toggleNotif(key, Boolean(v))}
              />
            </div>
          ))}
        </div>
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
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-2">
          Regenerations remaining this month:{" "}
          <span className="font-semibold text-foreground">
            {Math.max(REGEN_MONTHLY_CAP - regenCount, 0)} / {REGEN_MONTHLY_CAP}
          </span>
          {" "}· You get {REGEN_MONTHLY_CAP} fresh meal plans per month.
        </p>
        <Button
          onClick={regenerateMealPlan}
          disabled={regenerating || regenCount >= REGEN_MONTHLY_CAP}
          className="bg-primary hover:bg-primary-hover text-primary-foreground min-h-11"
        >
          {regenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {regenCount >= REGEN_MONTHLY_CAP
            ? "Monthly limit reached"
            : prefsDirty
              ? "Regenerate my meal plan with these preferences"
              : "Regenerate my meal plan"}
        </Button>


        {regenerating && !regenError && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-primary-muted/60 border border-primary/15 p-3">
            <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              <span className="font-medium text-primary">Heads up — this can take 2–3 minutes.</span>{" "}
              VITA is building all 4 weeks in parallel. You can leave this page; the Meals tab will
              update as each week finishes.
            </p>
          </div>
        )}

        {regenError && (
          <div className="mt-4">
            <VitaErrorCard
              title="Couldn't rebuild your plan"
              message={regenError}
              onRetry={regenerateMealPlan}
              retrying={regenerating}
            />
          </div>
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
