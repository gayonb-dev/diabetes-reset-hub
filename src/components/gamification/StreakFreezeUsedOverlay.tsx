import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Vita } from "@/components/vita/Vita";

interface Props {
  open: boolean;
  protectedStreak: number;
  onDismiss: () => void;
}

/**
 * Section 11 — streak-freeze auto-consume overlay.
 * Shown the next app open after a freeze was used.
 */
export default function StreakFreezeUsedOverlay({ open, protectedStreak, onDismiss }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDismiss()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0">
        <div className="p-7 text-center bg-card">
          <div className="flex justify-center mb-4">
            <Vita posture="encouraging" size={120} />
          </div>
          <p className="font-heading text-2xl font-bold text-foreground mb-3">
            Your streak freeze worked.
          </p>
          <p className="text-[15px] text-secondary-fg leading-relaxed mb-6">
            Your streak freeze protected your {protectedStreak}-day streak yesterday. You're back.
            Let's go.
          </p>
          <Button
            onClick={onDismiss}
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full h-12 rounded-[10px] font-semibold"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
