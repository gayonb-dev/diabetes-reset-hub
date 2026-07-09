import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Vita } from "@/components/vita/Vita";
import { levelFromDay } from "@/lib/levels";

interface LevelUpOverlayProps {
  level: number | null;
  onDismiss: () => void;
}

/**
 * Full-screen level-up celebration per Section 11.
 * Dark green overlay, VITA Celebrating, amber/white confetti,
 * level badge, personalized level message.
 */
export default function LevelUpOverlay({ level, onDismiss }: LevelUpOverlayProps) {
  const info = level ? levelFromDay(level === 1 ? 0 : 9999).level === level
    ? levelFromDay(level === 1 ? 0 : 9999)
    : { level, name: nameForLevel(level), message: messageForLevel(level) }
    : null;

  useEffect(() => {
    if (level) {
      // a11y
      const root = document.getElementById("level-up-live");
      if (root) root.textContent = `Level up! Level ${level}.`;
    }
  }, [level]);

  if (!level || !info) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onDismiss()}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden border-0 [&>button]:text-primary-foreground"
        style={{
          background:
            "linear-gradient(160deg, hsl(var(--primary)) 0%, hsl(var(--primary-dark)) 100%)",
        }}
      >
        <span id="level-up-live" className="sr-only" aria-live="polite" />
        <Confetti />
        <div className="relative px-6 py-10 text-center text-white">
          <div className="flex justify-center mb-4">
            <div className="animate-[spin_1.2s_ease-out]">
              <Vita posture="celebrating" size={120} />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/70 mb-1">
            Level up
          </p>
          <h2 className="font-heading text-3xl font-bold mb-1">Level {level}</h2>
          <p className="text-xl text-accent font-semibold mb-3">{info.name}</p>
          <p className="text-white/85 text-[15px] mb-7 leading-relaxed max-w-xs mx-auto">
            {info.message}
          </p>
          <Button
            onClick={onDismiss}
            className="bg-white text-primary hover:bg-white/90 font-semibold w-full h-11 rounded-[10px]"
          >
            Keep going
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function nameForLevel(l: number) {
  const map: Record<number, string> = {
    1: "The Beginner",
    2: "The Builder",
    3: "The Momentum Maker",
    4: "The Shifter",
    5: "The Reverser",
    6: "The Reclaimer",
    7: "The Sustainer",
    8: "The Champion",
    9: "The Guide",
    10: "The Transformer",
  };
  return map[l] ?? "Lifetime Member";
}
function messageForLevel(l: number) {
  const map: Record<number, string> = {
    1: "You started. Most people don't.",
    2: "Foundation set.",
    3: "Your body is responding.",
    4: "Numbers are changing.",
    5: "You are in it now.",
    6: "You did this.",
    7: "Maintaining what you built.",
    8: "One full year.",
    9: "Others follow your path.",
    10: "This is who you are now.",
  };
  return map[l] ?? "Another milestone in your reset.";
}

function Confetti() {
  // Lightweight CSS confetti — amber/white squares falling.
  const pieces = Array.from({ length: 28 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 6) * 0.15;
        const size = 6 + ((i * 3) % 6);
        const color = i % 2 === 0 ? "hsl(var(--accent))" : "hsl(var(--primary-foreground))";
        return (
          <span
            key={i}
            className="absolute top-0 block opacity-90"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              background: color,
              transform: `rotate(${i * 23}deg)`,
              animation: `fall 1.6s ${delay}s ease-out forwards`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes fall {
          0%{transform:translateY(-20px) rotate(0);opacity:0}
          15%{opacity:1}
          100%{transform:translateY(420px) rotate(540deg);opacity:0}
        }
      `}</style>
    </div>
  );
}
