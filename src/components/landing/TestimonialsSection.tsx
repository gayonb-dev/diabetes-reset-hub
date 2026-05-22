import { Star, TrendingDown, Battery, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";

const scrollToPricing = () => {
  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
};

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Terry M.",
      initials: "TM",
      title: "Type 2 Diabetes",
      result: "Lost 30 lbs in 6 weeks",
      quote: "I was skeptical at first, but after the 7-Day Reset Sprint, I felt more energy than I had in years. The simple daily actions made all the difference. My doctor was shocked at my next checkup.",
    },
    {
      name: "James W.",
      initials: "JW",
      title: "Type 2 Diabetes",
      result: "A1C dropped 1.8 points",
      quote: "I've been Type 2 for 9 years. Nothing stuck until this. The 10-minute daily actions felt doable even on my worst days, and my numbers spoke for themselves at my 3-month check-up.",
    },
    {
      name: "Rachel S.",
      initials: "RS",
      title: "Prediabetes",
      result: "Lost 18 lbs, A1C dropped",
      quote: "This program taught me how to eat without feeling deprived. My blood sugar numbers improved within the first week! I wish I'd found this sooner.",
    },
    {
      name: "Michael L.",
      initials: "ML",
      title: "Type 2 Diabetes",
      result: "Lost 22 lbs, off 1 medication",
      quote: "After trying countless diets, this was the first program designed specifically for people like me. The Reset changed my life — and I worked with my doctor to come off one of my meds.",
    },
  ];

  const stats = [
    { icon: TrendingDown, value: "10–30 lbs", label: "typical loss in 6 weeks" },
    { icon: Battery, value: "87%", label: "report more energy" },
    { icon: Heart, value: "5 days", label: "to see first results" },
  ];

  return (
    <section className="bg-gradient-to-b from-primary/5 to-background py-10">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-2">
            Real People. Real Results.
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            156+ people have transformed their health with The Diabetes Reset Method
          </p>
        </ScrollReveal>

        {/* Stats Bar */}
        <ScrollReveal>
          <div className="bg-card rounded-2xl shadow-md p-5 mb-8">
            <div className="grid sm:grid-cols-3 gap-4 text-center">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="flex flex-col items-center gap-1">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-heading font-bold text-2xl text-foreground">{stat.value}</span>
                    <span className="text-muted-foreground text-sm">{stat.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal key={index} delay={index * 0.15}>
              <div className="bg-card rounded-2xl border-2 border-primary/20 shadow-lg hover:shadow-xl hover:border-primary/40 transition-all p-6 h-full">
                {/* Stars */}
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-muted-foreground mb-4 text-sm leading-relaxed">"{testimonial.quote}"</p>

                {/* Avatar and Name */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.title}</p>
                  </div>
                </div>

                {/* Result Badge */}
                <div className="bg-primary/15 border border-primary/30 rounded-lg px-3 py-2.5">
                  <p className="text-primary font-bold text-base leading-snug">✅ {testimonial.result}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="text-center space-y-3">
            <Button
              onClick={scrollToPricing}
              className="bg-primary hover:bg-primary-dark text-primary-foreground px-8 py-5 text-lg font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg h-auto"
            >
              Join Them — Start My Reset
            </Button>
            <p className="text-sm text-muted-foreground italic">
              Results vary. Educational coaching — not medical care.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default TestimonialsSection;
