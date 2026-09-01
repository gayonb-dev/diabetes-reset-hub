import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ScrollReveal from "./ScrollReveal";
import PreviewLightbox from "./PreviewLightbox";
import {
  PREVIEWS,
  PREVIEW_DATA_NOTE,
  PREVIEW_DATA_NOTE_2,
  PREVIEW_PERSISTENT_LABEL,
  type PreviewItem,
} from "./previewManifest";
import { useCheckout } from "./CheckoutContext";

/**
 * One coherent product tour: a featured screen with a keyboard-operable list of
 * the other screens beneath it. Each preview is a screenshot of the real member
 * application rendered locally with synthetic example entries, and each carries
 * a visible label saying so.
 */
const ProductTourSection = () => {
  const { openCheckout } = useCheckout();
  const [activeId, setActiveId] = useState(PREVIEWS[0].id);
  const [enlarged, setEnlarged] = useState<PreviewItem | null>(null);
  // Closing the enlargement returns focus to the control that opened it.
  const lastTrigger = useRef<HTMLButtonElement | null>(null);

  const active = PREVIEWS.find((p) => p.id === activeId) ?? PREVIEWS[0];

  return (
    <div id="product-tour" className="scroll-mt-24 mt-14">
      <ScrollReveal>
        <h3 className="font-heading font-bold text-2xl sm:text-3xl text-center text-foreground mb-3">
          Don’t buy blind. See the actual membership first.
        </h3>
        <div className="text-center text-muted-foreground max-w-2xl mx-auto mb-8 space-y-2">
          <p>{PREVIEW_DATA_NOTE}</p>
          <p>{PREVIEW_DATA_NOTE_2}</p>
        </div>
      </ScrollReveal>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        <figure className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Bounded stage: the page length no longer follows each screenshot's
              natural height, and switching previews causes no layout jump. The
              aspect ratio is preserved (cover) and the full screen stays
              available in the enlargement. */}
          <div className="h-[420px] sm:h-[520px] lg:h-[640px] bg-muted overflow-hidden">
            <img
              key={active.id}
              src={active.src}
              alt={active.alt}
              width={active.width}
              height={active.height}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <figcaption className="p-4 border-t border-border">
            <p className="font-heading font-semibold text-foreground">{active.label}</p>
            <p className="text-sm text-muted-foreground mt-1">{active.caption}</p>
            <p className="text-xs text-muted-foreground mt-2">{PREVIEW_PERSISTENT_LABEL}</p>
            <Button
              variant="outline"
              className="mt-3 min-h-[44px] rounded-lg"
              onClick={(e) => {
                lastTrigger.current = e.currentTarget;
                setEnlarged(active);
              }}
            >
              Enlarge this screen
            </Button>
          </figcaption>
        </figure>

        <ul className="grid grid-cols-2 lg:grid-cols-1 gap-3" aria-label="App screens">
          {PREVIEWS.map((item) => {
            const selected = item.id === active.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors min-h-[44px]",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/60",
                  )}
                >
                  <img
                    src={item.thumb}
                    alt=""
                    aria-hidden="true"
                    width={item.width}
                    height={item.height}
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-20 flex-shrink-0 rounded-lg object-cover object-top bg-muted"
                  />
                  <span className="min-w-0">
                    <span className="block font-heading font-semibold text-sm text-foreground">
                      {item.label}
                    </span>
                    <span className="block text-xs text-muted-foreground line-clamp-2">
                      {item.caption}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-10 text-center">
        <Button
          onClick={openCheckout}
          className="min-h-[44px] bg-primary hover:bg-primary-dark text-primary-foreground font-bold px-8 py-4 h-auto rounded-lg"
        >
          Use these tools for 14 days, $27
        </Button>
        <p className="text-sm text-muted-foreground mt-3">
          $27 today. Then $67/month until canceled. Access begins after payment is confirmed.
        </p>
      </div>

      <PreviewLightbox
        item={enlarged}
        onClose={() => {
          setEnlarged(null);
          window.setTimeout(() => lastTrigger.current?.focus(), 0);
        }}
      />
    </div>
  );
};

export default ProductTourSection;
