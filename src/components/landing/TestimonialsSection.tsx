import { Star, TrendingDown, Battery, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TestimonialsSectionProps {
  onOpenPayment: () => void;
}

const TestimonialsSection = ({ onOpenPayment }: TestimonialsSectionProps) => {
  const testimonials = [
    {
      name: "Terry M.",
      initials: "TM",
      title: "Type 2 Diabetes Reversal",
      result: "30 lbs lost",
      quote: "I was skeptical at first, but after the 5-Day Reset, I felt more energy than I had in years. The simple daily actions made all the difference.",
    },
    {
      name: "Rachel S.",
      initials: "RS",
      title: "Prediabetes Prevention",
      result: "18 lbs lost",
      quote: "This program taught me how to eat without feeling deprived. My blood sugar numbers improved within the first week!",
    },
    {
      name: "Michael L.",
      initials: "ML",
      title: "Metabolic Health Improvement",
      result: "22 lbs lost",
      quote: "After trying countless diets, this was the first program designed specifically for people like me. The results speak for themselves.",
    },
  ];

  const stats = [
    { icon: TrendingDown, text: "10–30 lbs typical loss in 6 weeks" },
    { icon: Battery, text: "Better energy & mood" },
    { icon: Heart, text: "Fewer cravings & crashes" },
  ];

  return (
    <section className="bg-gradient-to-b from-primary/5 to-background py-20">
      <div className="container mx-auto px-4">
        <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-gray-900 mb-4">
          Real People. Real Results.
        </h2>
        <p className="text-center text-gray-600 mb-12">
          Join 156+ people who've transformed their health in just 5 days
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl border-2 border-primary/20 shadow-lg hover:shadow-xl transition-shadow p-8"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-secondary text-secondary" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-700 mb-6 min-h-20">"{testimonial.quote}"</p>

              {/* Avatar and Name */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-primary-foreground font-bold">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.title}</p>
                </div>
              </div>

              {/* Result Badge */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-primary font-bold">{testimonial.result}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Box */}
        <div className="bg-card rounded-2xl shadow-md p-6 mb-12">
          <div className="grid sm:grid-cols-3 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-primary" />
                  <span className="text-gray-700">{stat.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center space-y-4">
          <Button
            onClick={onOpenPayment}
            className="bg-primary hover:bg-primary-dark text-primary-foreground px-8 py-5 text-lg font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg h-auto"
          >
            Start My 5-Day Reset — $27
          </Button>
          <p className="text-sm text-gray-600 italic">
            Results vary. We provide education, not medical care.
          </p>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
