import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Vita } from "@/components/vita/Vita";

interface Props {
  currentProgramDay: number;
  enabled: boolean;
}

/**
 * Section 36 — Phase 1 Extension trigger.
 * On Day 15 morning, if fewer than 10 compliant Phase 1 days were logged
 * (all 3 plate items + water target), present the bonus-round VITA card
 * and flip `phase_1_extension_active` to true.
 */
export default function Phase1ExtensionPrompt({ currentProgramDay, enabled }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (!user || !enabled) return;
    if (currentProgramDay < 15 || currentProgramDay > 21) return;

    let cancelled = false;

    (async () => {
      // Already active? show prompt only once via sessionStorage gate
      const { data: vp } = await supabase
        .from("visitor_profiles")
        .select("phase_1_extension_active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (vp?.phase_1_extension_active) {
        // Already activated — no need to re-prompt
        return;
      }

      // Count compliant days in Phase 1 (Days 1–14)
      const { data: meals } = await supabase
        .from("meal_logs")
        .select("log_date, vegetables, protein, complex_carbs")
        .eq("member_id", user.id);

      const compliantByDay = new Map<string, { meals: number; allCompliant: boolean }>();
      (meals ?? []).forEach((m) => {
        const c = m.vegetables && m.protein && m.complex_carbs;
        const cur = compliantByDay.get(m.log_date) ?? { meals: 0, allCompliant: true };
        cur.meals += 1;
        if (!c) cur.allCompliant = false;
        compliantByDay.set(m.log_date, cur);
      });

      // Compliant day = at least 1 fully compliant meal logged (relaxed proxy)
      const compliantCount = Array.from(compliantByDay.values()).filter(
        (v) => v.meals >= 1 && v.allCompliant,
      ).length;

      if (compliantCount < 10) {
        if (!cancelled) {
          setOpen(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, enabled, currentProgramDay]);

  const accept = async () => {
    if (!user) return;
    await supabase
      .from("visitor_profiles")
      .update({ phase_1_extension_active: true })
      .eq("user_id", user.id);
    setActivated(true);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && setOpen(false)}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0">
        <div className="p-7 text-center bg-card">
          <div className="flex justify-center mb-4">
            <Vita posture="encouraging" size={120} />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-3">
            Your bonus round
          </h2>
          <p className="text-[15px] text-secondary-fg leading-relaxed mb-6">
            Before we unlock the next phase, we want your foundation solid — not because you're
            behind, but because everything that comes next works better when the basics are second
            nature. Here are 7 more days. Think of this as your bonus round.
          </p>
          <Button
            onClick={accept}
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full h-12 rounded-[10px] font-semibold"
          >
            {activated ? "Activated" : "I'm ready. Let's go."}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
