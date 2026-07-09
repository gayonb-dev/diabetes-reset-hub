import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Vita from "@/components/vita/Vita";

const PRODUCT_SEARCH_URL =
  "https://www.bjs.com/product/nature-made-daily-diabetes-health-pack-60-ct/3000000000005464255";

/**
 * Post-onboarding supplement prompt overlay.
 * Shows once after onboarding — dismissed forever via
 * visitor_profiles.metadata.supplement_prompt_dismissed_at.
 */
export default function SupplementPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [meta, setMeta] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("visitor_profiles")
        .select("id, metadata")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const m = (data.metadata as Record<string, unknown>) || {};
      setProfileId(data.id);
      setMeta(m);
      if (m.onboarded_at && !m.supplement_prompt_dismissed_at) {
        setShow(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function dismiss(openProduct: boolean) {
    setShow(false);
    if (openProduct) window.open(PRODUCT_SEARCH_URL, "_blank", "noopener");
    if (!profileId) return;
    const merged = {
      ...meta,
      supplement_prompt_dismissed_at: new Date().toISOString(),
    } as never;
    await supabase
      .from("visitor_profiles")
      .update({ metadata: merged })
      .eq("id", profileId);
  }

  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={(v) => !v && dismiss(false)}>
      <DialogContent className="sm:max-w-md p-8 text-center bg-card rounded-2xl">
        <div className="flex justify-center mb-4">
          <Vita posture="encouraging" size={64} />
        </div>
        <h2 className="text-[22px] font-semibold mb-3 tracking-tight">
          One daily packet. That's all you need to start.
        </h2>
        <p className="text-sm text-secondary-fg leading-relaxed mb-6">
          The Nature Made Diabetes Health Pack is the foundation. One packet per day with a
          meal covers the essential nutrients most diabetics are deficient in. We'll let you
          know about additional supplements as you progress — only if they apply to you.
        </p>
        <Button
          onClick={() => dismiss(true)}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold mb-2"
        >
          Got it, I'll get mine now
        </Button>
        <Button
          onClick={() => dismiss(false)}
          variant="ghost"
          className="w-full h-12 text-secondary-fg"
        >
          I already have it
        </Button>
      </DialogContent>
    </Dialog>
  );
}
