import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp, Check, Lock, ExternalLink } from "lucide-react";

type ChecklistItem = {
  slug: string;
  label: string;
  hint?: string;
  searchUrl?: string;
  unlockDay: number;
  unlockLabel: string;
};

const ITEMS: ChecklistItem[] = [
  { slug: "measuring_tape", label: "Measuring tape", hint: "For body measurements on Day 30.", unlockDay: 1, unlockLabel: "Day 1", searchUrl: "https://www.google.com/search?q=cloth+body+measuring+tape" },
  { slug: "water_bottle", label: "Large water bottle", hint: "Sized to your daily target — makes tracking effortless.", unlockDay: 1, unlockLabel: "Day 1", searchUrl: "https://www.google.com/search?q=large+water+bottle+32oz" },
  { slug: "supplement_pack", label: "Nature Made Diabetes Health Pack", unlockDay: 1, unlockLabel: "Day 1", searchUrl: "https://www.google.com/search?q=Nature+Made+Diabetes+Health+Pack" },
  { slug: "apple_cider_vinegar", label: "Apple Cider Vinegar (organic, with the mother)", hint: "Any grocery or health food shop.", unlockDay: 8, unlockLabel: "Day 8", searchUrl: "https://www.google.com/search?q=organic+apple+cider+vinegar+with+mother" },
  { slug: "ceylon_cinnamon", label: "Ceylon Cinnamon (not Cassia)", hint: "Check the label — must say Ceylon.", unlockDay: 8, unlockLabel: "Day 8", searchUrl: "https://www.google.com/search?q=ceylon+cinnamon" },
  { slug: "walking_shoes", label: "Comfortable walking shoes", hint: "You'll use these three times a day.", unlockDay: 15, unlockLabel: "Day 15", searchUrl: "https://www.google.com/search?q=comfortable+walking+shoes" },
  { slug: "water_bottle_weights", label: "Two filled water bottles", hint: "Used as light weights when structured workouts begin.", unlockDay: 15, unlockLabel: "Day 15" },
  { slug: "yoga_mat", label: "Yoga mat (optional)", hint: "For floor exercises.", unlockDay: 15, unlockLabel: "Day 15", searchUrl: "https://www.google.com/search?q=yoga+mat" },
  { slug: "jump_rope", label: "Jump rope (Track A only)", hint: "For cardio when structured workouts begin.", unlockDay: 29, unlockLabel: "Day 29", searchUrl: "https://www.google.com/search?q=jump+rope" },
];

interface Props {
  currentProgramDay: number;
}

export default function GettingStartedChecklist({ currentProgramDay }: Props) {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [state, setState] = useState<Record<string, boolean>>({});
  const [metadata, setMetadata] = useState<Record<string, unknown>>({});
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [userOpen, setUserOpen] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("visitor_profiles")
        .select("id, getting_started_checklist, metadata")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setProfileId(data.id);
      setState((data.getting_started_checklist as Record<string, boolean>) ?? {});
      const meta = (data.metadata as Record<string, unknown>) ?? {};
      setMetadata(meta);
      setCompletedAt((meta.getting_started_completed_at as string) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const unlocked = useMemo(
    () => ITEMS.filter((i) => i.unlockDay <= currentProgramDay),
    [currentProgramDay],
  );
  const locked = useMemo(
    () => ITEMS.filter((i) => i.unlockDay > currentProgramDay),
    [currentProgramDay],
  );
  const acquired = unlocked.filter((i) => state[i.slug]).length;
  const totalUnlocked = unlocked.length;
  const allAcquired = ITEMS.every((i) => state[i.slug]);

  // Persist completed_at once, when the user first finishes all items.
  useEffect(() => {
    if (!profileId || !allAcquired || completedAt) return;
    const now = new Date().toISOString();
    setCompletedAt(now);
    const nextMeta = { ...metadata, getting_started_completed_at: now };
    setMetadata(nextMeta);
    void supabase
      .from("visitor_profiles")
      .update({ metadata: nextMeta as never })
      .eq("id", profileId);
  }, [profileId, allAcquired, completedAt, metadata]);

  // Spec: card only shows Days 1–29.
  if (currentProgramDay > 29) return null;

  // Permanent hide 3 days after completion.
  if (allAcquired && completedAt) {
    const ageMs = Date.now() - new Date(completedAt).getTime();
    if (ageMs > 3 * 86400000) return null;
  }

  const isCompleteCollapsedMode = allAcquired && !!completedAt;
  const open = userOpen ?? false;



  async function toggle(slug: string) {
    const next = { ...state, [slug]: !state[slug] };
    setState(next);
    if (!profileId) return;
    await supabase
      .from("visitor_profiles")
      .update({ getting_started_checklist: next as never })
      .eq("id", profileId);
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-warm overflow-hidden">
      <button
        type="button"
        onClick={() => setUserOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-foreground">Getting Ready</span>
        <span className="flex items-center gap-2">
          {isCompleteCollapsedMode ? (
            <span className="text-[11px] text-accent font-semibold">✓ complete</span>
          ) : (
            <span className="text-[11px] text-tertiary-fg font-medium">
              {acquired} of {totalUnlocked} items acquired
            </span>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-tertiary-fg/60" /> : <ChevronDown className="h-4 w-4 text-tertiary-fg/60" />}
        </span>
      </button>


      {open && (
        <div className="px-4 pb-4 pt-1 space-y-2">
          {unlocked.map((item) => {
            const done = !!state[item.slug];
            return (
              <div
                key={item.slug}
                className="flex items-start gap-3 bg-card/70 rounded-lg p-3"
              >
                <button
                  type="button"
                  onClick={() => toggle(item.slug)}
                  aria-label={`Mark ${item.label} ${done ? "not acquired" : "acquired"}`}
                  className={`shrink-0 mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                    done
                      ? "bg-status-normal border-status-normal text-primary-foreground"
                      : "border-tertiary-fg/40 bg-card"
                  }`}
                >
                  {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? "text-tertiary-fg line-through" : "text-foreground"}`}>
                    {item.label}
                  </p>
                  {item.hint && (
                    <p className="text-xs text-secondary-fg mt-0.5">{item.hint}</p>
                  )}
                  {item.searchUrl && (
                    <a
                      href={item.searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent font-medium mt-1"
                    >
                      Find it <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {locked.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] uppercase tracking-wider text-tertiary-fg mb-1.5">
                Unlocks later
              </p>
              {locked.map((item) => (
                <div
                  key={item.slug}
                  className="flex items-center gap-3 px-3 py-2 opacity-50"
                >
                  <Lock className="h-3.5 w-3.5 text-tertiary-fg shrink-0" />
                  <span className="text-xs text-tertiary-fg flex-1">{item.label}</span>
                  <span className="text-[10px] text-tertiary-fg">{item.unlockLabel}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
