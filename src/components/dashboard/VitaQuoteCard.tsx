import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Vita from "@/components/vita/Vita";
import { cn } from "@/lib/utils";

interface VitaQuoteCardProps {
  quotes: string[];
  speaker?: "VITA" | "GAYON";
  className?: string;
}

export function VitaQuoteCard({ quotes, speaker = "VITA", className }: VitaQuoteCardProps) {
  const [idx, setIdx] = useState(0);
  if (quotes.length === 0) return null;
  const next = () => setIdx((i) => (i + 1) % quotes.length);
  const prev = () => setIdx((i) => (i - 1 + quotes.length) % quotes.length);

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl px-4 py-3 shadow-warm flex items-center gap-3",
        className,
      )}
    >
      <Vita posture="neutral" size={44} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="label-caps text-accent mb-1">{speaker} says</p>
        <p className="text-sm text-foreground leading-relaxed">{quotes[idx]}</p>
      </div>
      {quotes.length > 1 && (
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={prev}
            aria-label="Previous tip"
            className="text-tertiary-fg hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            aria-label="Next tip"
            className="text-tertiary-fg hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default VitaQuoteCard;
