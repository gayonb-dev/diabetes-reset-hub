import { ArrowRight, Shield, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-diabetes-reset.jpg";

const scrollToPricing = () => {
  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
};

const HeroSection = () => {
  return (
    <section className="relative bg-gradient-to-b from-secondary/20 to-background pt-8 pb-8 md:pt-12 md:pb-12 overflow-hidden">
      {/* Limited Time Offer Badge */}
      <div className="absolute top-4 right-4 md:top-6 md:right-8 z-10">
        <span className="inline-flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold animate-pulse-glow shadow-lg">
          🔥 Limited Time — $27 (was $47)
        </span>
      </div>

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Text Column */}
          <div className="space-y-4">
            <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-gray-900 leading-tight">
              Reverse Diabetes.
              <br />
              Reclaim Your Life.
            </h1>
            
            <h2 className="font-body text-xl sm:text-2xl text-gray-700 leading-relaxed">
              Join the 5-Day Diabetes Reset Challenge — quick wins that lower blood sugar, jumpstart weight loss, and restore your energy.
            </h2>

            {/* Social Proof Mini-Bar */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4 text-primary" />
                <strong>156+</strong> people transformed
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-secondary text-secondary" />
                4.9/5 rating
              </span>
            </div>

            <div className="space-y-3">
              <Button
                onClick={scrollToPricing}
                className="w-full md:w-auto bg-primary hover:bg-primary-dark text-primary-foreground px-8 py-5 text-lg font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg h-auto"
              >
                Start My 5-Day Reset — Only $27
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-primary" />
                  30-day money-back guarantee
                </span>
                <span>•</span>
                <span>Instant digital access</span>
                <span>•</span>
                <span>No risk</span>
              </div>
            </div>
          </div>

          {/* Image Column */}
          <div className="relative">
            <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-primary/20 to-secondary/20">
              <img
                src="https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg"
                alt="Healthy meal preparation with glucose monitor"
                className="w-full h-full object-cover"
                loading="lazy"
                srcSet="https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg?auto=compress&cs=tinysrgb&w=400 400w, https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg?auto=compress&cs=tinysrgb&w=800 800w, https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg?auto=compress&cs=tinysrgb&w=1200 1200w"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 50vw"
              />
            </div>

            {/* Floating Badge */}
            <div className="absolute -bottom-4 -right-4 bg-background p-4 rounded-2xl shadow-xl border-4 border-primary">
              <p className="text-2xl font-bold text-primary">5 Days</p>
              <p className="text-xs text-gray-600">to reset your health</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
