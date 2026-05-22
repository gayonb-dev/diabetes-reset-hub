import { ArrowRight, Shield, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-diabetes-reset.jpg";

const scrollToPricing = () => {
  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
};

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
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-base font-bold tracking-widest uppercase text-primary">
                The Diabetes Reset Method
              </p>
              <span className="inline-flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                $27 today · 14 days full access · cancel anytime
              </span>
            </div>

            <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-foreground leading-tight">
              Lower Your Blood Sugar.
              <br />
              Without the Overwhelm.
            </h1>

            <h2 className="font-body text-xl sm:text-2xl text-muted-foreground leading-relaxed">
              A membership built for Type 2 Diabetes and prediabetes. Start with a 7-Day Reset Sprint,
              then unlock recipes, coach Q&A, and weekly accountability — for less than a copay.
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4 text-primary" />
                <strong>156+</strong> members
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-secondary text-secondary" />
                4.9/5 average rating
              </span>
            </div>

            <div className="space-y-3">
              <Button
                onClick={scrollToPricing}
                className="w-full md:w-auto bg-primary hover:bg-primary-dark text-primary-foreground px-8 py-5 text-lg font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg h-auto"
              >
                Start My Reset — $27 Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-primary" />
                  14-day full access
                </span>
                <span>•</span>
                <span>Cancel in 1 click</span>
                <span>•</span>
                <span>30-day money-back</span>
              </div>
            </div>
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
                alt="A woman with Type 2 Diabetes preparing a balanced plate of vegetables and lean protein next to a glucose monitor"
                className="w-full h-full object-cover"
                width={1024}
                height={1024}
              />
            </div>

            <motion.div
              className="absolute -bottom-4 -right-4 bg-background p-4 rounded-2xl shadow-xl border-4 border-primary"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <p className="text-2xl font-bold text-primary">7 Days</p>
              <p className="text-xs text-muted-foreground">to your first win</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
