import { useState } from "react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";
import PreviewLightbox from "./PreviewLightbox";
import { PREVIEWS, type PreviewItem } from "./previewManifest";
import { useCheckout } from "./CheckoutContext";

/**
 * Accessible product tour: a plain list of real screenshots, each openable in
 * an enlargement dialog. Placed before the longer explanatory sections so a
 * visitor sees the actual product early.
 */
const ProductTourSection = () => {
  const { openCheckout } = useCheckout();
  const [active, setActive] = useState<PreviewItem | null>(null);

  return (
    <section
      id="product-tour"
      className="scroll-mt-24 bg-muted/30 py-14"
      aria-labelledby="product-tour-heading"
    >
      <div className="container mx-auto px-4 max-w-5xl">
        <ScrollReveal>
          <h2
            id="product-tour-heading"
            className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-3"
          >
            A look inside the member app
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
            These are screenshots of the actual member application, shown with example
            entries. Select any screen to enlarge it.
          </p>
        </ScrollReveal>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PREVIEWS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setActive(item)}
                className="group w-full text-left bg-card border border-border rounded-xl overflow-hidden hover:border-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
              >
                <img
                  src={item.thumb}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-56 object-cover object-top bg-muted"
                />
                <span className="block p-4">
                  <span className="block font-heading font-semibold text-foreground">
                    {item.label}
                  </span>
                  <span className="block text-sm text-muted-foreground mt-1">{item.caption}</span>
                  <span className="block text-xs font-semibold text-primary mt-2 min-h-[24px]">
                    Enlarge screen
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <Button
            onClick={openCheckout}
            className="min-h-[44px] bg-primary hover:bg-primary-dark text-primary-foreground font-bold px-8 py-4 h-auto rounded-lg"
          >
            Start 14 days for $27
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            $27 for the first 14 days, then $67 per month until canceled. Access begins after
            your payment is confirmed.
          </p>
        </div>
      </div>

      <PreviewLightbox item={active} onClose={() => setActive(null)} />
    </section>
  );
};

export default ProductTourSection;
