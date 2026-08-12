import { ArrowRight, Compass, ListChecks, Stethoscope, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-diabetes-reset.jpg";

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
};

const TRUST_ROW = [
  { icon: Compass, label: "Self-guided membership" },
  { icon: ListChecks, label: "Clear daily actions" },
  { icon: Stethoscope, label: "Keep your healthcare professional in charge" },
  { icon: XCircle, label: "Cancel in the app" },
];

const HeroSection = () => {
  return (
    <section className="relative bg-gradient-to-b from-secondary/20 to-background pt-8 pb-8 md:pt-12 md:pb-12 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <p className="text-sm font-bold tracking-widest uppercase text-primary">
              A self-guided Type 2 diabetes membership
            </p>

            <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-foreground leading-tight">
              A simpler daily system for managing Type 2 diabetes
            </h1>

            <p className="font-body text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Use guided daily actions, practical meal tools, progress tracking, and printable
              reports to build habits between healthcare visits.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => scrollTo("pricing")}
                className="w-full sm:w-auto min-h-[44px] bg-primary hover:bg-primary-dark text-primary-foreground px-8 py-5 text-lg font-bold rounded-xl h-auto shadow-lg"
              >
                Start 14 days for $27
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                onClick={() => scrollTo("inside-the-membership")}
                className="w-full sm:w-auto min-h-[44px] px-8 py-5 text-lg font-semibold rounded-xl h-auto border-primary/40"
              >
                See inside the membership
              </Button>
            </div>

            <p className="text-sm text-foreground font-medium">
              $27 today for the first 14 days. Then $67/month until canceled. Cancel in the app.
            </p>
            <p className="text-sm text-muted-foreground">
              Educational support—not diagnosis, treatment, or emergency care.
            </p>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-primary/20 to-secondary/20">
              <img
                src={heroImage}
                alt="An adult preparing a plate of vegetables and lean protein in a home kitchen"
                className="w-full h-full object-cover"
                width={1024}
                height={1024}
              />
            </div>
          </motion.div>
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
