import { ArrowRight, Compass, ListChecks, Stethoscope, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { goToSection } from "@/lib/landingNav";
import { PREVIEWS } from "./previewManifest";
import { useCheckout } from "./CheckoutContext";

const TRUST_ROW = [
  { icon: Compass, label: "One clear action each day" },
  { icon: ListChecks, label: "Practical tools in one place" },
  { icon: Stethoscope, label: "Your healthcare professional stays in charge" },
  { icon: XCircle, label: "Cancel directly in the app" },
];

const HeroSection = () => {
  const { openCheckout } = useCheckout();
  // The genuine Today screen, shown immediately in the hero.
  const today = PREVIEWS.find((p) => p.id === "today") ?? PREVIEWS[0];

  return (
    <section className="relative bg-gradient-to-b from-secondary/20 to-background pt-8 pb-10 md:pt-10 md:pb-12 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <motion.div
            className="space-y-4 order-1"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <p className="text-sm font-bold tracking-widest uppercase text-primary">
              Self-guided support for adults with Type 2 diabetes or prediabetes
            </p>

            <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-foreground leading-tight">
              Stop wondering what to focus on for your diabetes today.
            </h1>

            <div className="font-body text-lg sm:text-xl text-muted-foreground leading-relaxed space-y-3">
              <p>
                You have already heard the advice: think about your meals, move more, track your
                numbers, prepare for appointments.
              </p>
              <p>The hard part is turning all of that into a day you can actually follow.</p>
              <p>
                Diabetes Reset Method gives you one clear daily action, plus practical meal,
                movement, tracking, educational, and reporting tools, all in one membership.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={openCheckout}
                className="w-full sm:w-auto min-h-[44px] bg-primary hover:bg-primary-dark text-primary-foreground px-8 py-5 text-lg font-bold rounded-xl h-auto shadow-lg"
              >
                Start my first 14 days, $27
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                onClick={() => goToSection("inside-the-membership")}
                className="w-full sm:w-auto min-h-[44px] px-8 py-5 text-lg font-semibold rounded-xl h-auto border-primary/40"
              >
                See exactly what’s inside
              </Button>
            </div>

            <p className="text-sm text-foreground font-medium">
              $27 charged today for your first 14 days. Then $67/month until canceled. Cancel in the
              app.
            </p>
            <p className="text-sm text-muted-foreground">
              Each charge has a 30-day refund-request window.{" "}
              <Link to="/refunds" className="underline underline-offset-4">
                Refund Terms
              </Link>{" "}
              apply.
            </p>
            <p className="text-sm text-muted-foreground">
              Self-guided education, not diagnosis, treatment, prescriptions, or emergency care.
            </p>
          </motion.div>

          {/* The hero's only visual is the genuine Today screen: an honest crop
              of the real screenshot, top-anchored so the daily action and the
              logging shortcuts are visible. The complete screen stays available
              through the product tour and its enlargement. */}
          <motion.figure
            className="order-2 rounded-2xl border border-border bg-card overflow-hidden shadow-lg"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <div className="h-[320px] sm:h-[400px] lg:h-[460px] bg-muted overflow-hidden">
              <img
                src={today.thumb}
                alt={today.alt}
                width={today.width}
                height={today.height}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <figcaption className="p-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Actual DRM app screen · Illustrative example entries
              </span>
              <button
                type="button"
                onClick={() => goToSection("product-tour")}
                className="min-h-[44px] text-sm font-semibold text-primary underline"
              >
                See more real app screens
              </button>
            </figcaption>
          </motion.figure>
        </div>

        {/* Honest trust row */}
        <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TRUST_ROW.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <Icon className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
              <span className="text-sm text-foreground">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default HeroSection;
