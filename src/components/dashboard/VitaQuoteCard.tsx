import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import Vita from "@/components/vita/Vita";
import { cn } from "@/lib/utils";

export type QuoteSpeaker = "VITA" | "FOUNDER";

export interface QuoteItem {
  text: string;
  speaker?: QuoteSpeaker;
}

interface VitaQuoteCardProps {
  /** Either string[] (all VITA) or QuoteItem[] with per-quote speaker. */
  quotes: string[] | QuoteItem[];
  /** Fallback speaker if `quotes` is string[]. */
  speaker?: QuoteSpeaker;
  className?: string;
}

function normalize(
  quotes: string[] | QuoteItem[],
  fallback: QuoteSpeaker,
): QuoteItem[] {
  return quotes.map((q) =>
    typeof q === "string" ? { text: q, speaker: fallback } : { speaker: fallback, ...q },
  );
}

export function VitaQuoteCard({
  quotes,
  speaker = "VITA",
  className,
}: VitaQuoteCardProps) {
  const [idx, setIdx] = useState(0);
  const items = normalize(quotes, speaker);
  if (items.length === 0) return null;
  const current = items[idx % items.length];
  const next = () => setIdx((i) => (i + 1) % items.length);
  const prev = () => setIdx((i) => (i - 1 + items.length) % items.length);

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl px-4 py-3 shadow-warm flex items-center gap-3",
        className,
      )}
    >
      <Vita posture="neutral" size={44} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="label-caps text-accent mb-1">
          {(current.speaker ?? speaker) === "FOUNDER" ? "FROM THE FOUNDER" : "VITA says"}
        </p>
        <p className="text-sm text-foreground leading-relaxed">{current.text}</p>
      </div>
      {items.length > 1 && (
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={prev}
            aria-label="Previous tip"
            className="text-tertiary-fg hover:text-foreground transition-colors"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            aria-label="Next tip"
            className="text-tertiary-fg hover:text-foreground transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default VitaQuoteCard;
