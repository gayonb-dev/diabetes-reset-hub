import { ArrowLeft, CheckCircle2, Star, Shield, TrendingDown, Heart, Utensils, Dumbbell, Brain, Users, MessageCircle, ArrowRight, Clock, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const RESULTS = [
  { stat: "15–30 pts", label: "Average blood sugar drop in 6 weeks" },
  { stat: "5–12 lbs", label: "Average weight loss during the program" },
  { stat: "90%", label: "Of clients report more energy by Week 2" },
];

const WEEKS = [
  { week: "1–2", title: "Foundation", icon: Utensils, items: ["Deep nutrition reset", "Personalized meal planning", "Blood sugar tracking setup", "Hydration optimization"] },
  { week: "3–4", title: "Momentum", icon: Dumbbell, items: ["Exercise programming", "Stress management tools", "Sleep optimization", "Medication review support"] },
  { week: "5–6", title: "Transformation", icon: Brain, items: ["Mindset & habit anchoring", "Social eating strategies", "Long-term maintenance plan", "Graduation & next steps"] },
];

const INCLUDES = [
  { icon: MessageCircle, title: "Daily WhatsApp Support", desc: "Direct access to your coach every single day" },
  { icon: Users, title: "12 One-on-One Sessions", desc: "Twice-weekly deep dive calls (45–60 min)" },
  { icon: Utensils, title: "Custom Meal Plans", desc: "Personalized to your preferences, culture, and goals" },
  { icon: Dumbbell, title: "Movement Program", desc: "Safe, progressive exercise plan for your fitness level" },
  { icon: Brain, title: "Mindset Coaching", desc: "Break emotional eating patterns and build lasting habits" },
  { icon: Shield, title: "Accountability System", desc: "Daily check-ins, weekly reviews, and progress tracking" },
];

const TESTIMONIALS = [
  {
    name: "Michelle R.",
    result: "Blood sugar from 11.2 to 7.1",
    quote: "After 6 weeks, my doctor was shocked. She asked me what I was doing differently. I told her — everything.",
  },
  {
    name: "David T.",
    result: "Lost 18 lbs in 6 weeks",
    quote: "I've tried every diet. This was the first time someone actually understood my situation and made a plan that worked for MY life.",
  },
  {
    name: "Sandra W.",
    result: "Off 2 medications",
    quote: "My doctor reduced my medications after Week 4. I never thought that was possible. This program changed my life.",
  },
];

const SixWeekReset = () => {
  const navigate = useNavigate();

  const scrollToPrice = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <div className="relative max-w-4xl mx-auto px-4 py-12 md:py-20">
          <button onClick={() => navigate("/")} className="flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </button>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              You completed the 5-Day Challenge — Here's your next step
            </div>

            <h1 className="font-heading font-extrabold text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 leading-tight">
              The 6-Week <span className="text-primary">Diabetes Reset</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              You've seen what 5 days can do. Now imagine 6 weeks of personalized coaching,
              daily support, and a step-by-step plan built around <em>your</em> life.
            </p>

            <Button
              onClick={scrollToPrice}
              className="bg-primary hover:bg-primary/90 text-primary-foreground py-4 px-10 font-bold rounded-xl h-auto text-lg shadow-lg"
            >
              See the Full Program
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="bg-card border-y border-border">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {RESULTS.map((r, i) => (
              <div key={i} className="text-center">
                <p className="font-heading font-extrabold text-3xl md:text-4xl text-primary">{r.stat}</p>
                <p className="text-sm text-muted-foreground mt-1">{r.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bridge from Challenge */}
      <section className="max-w-3xl mx-auto px-4 py-14">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center">
          <h2 className="font-heading font-bold text-2xl text-foreground mb-4">
            You've already proven you can do this.
          </h2>
          <p className="text-muted-foreground text-lg mb-4">
            In 5 days, you started building habits, tracking your water, moving your body,
            and thinking differently about food. The 6-Week Reset takes everything you started
            and turns it into lasting transformation.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> 6 weeks</div>
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> 1-on-1 coaching</div>
            <div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /> Daily support</div>
          </div>
        </div>
      </section>

      {/* Week-by-Week Breakdown */}
      <section className="bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 py-14">
          <h2 className="font-heading font-bold text-3xl text-foreground text-center mb-10">
            Your 6-Week Journey
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WEEKS.map((w, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <w.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-primary mb-1">Weeks {w.week}</p>
                <h3 className="font-heading font-bold text-xl text-foreground mb-3">{w.title}</h3>
                <ul className="space-y-2">
                  {w.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="max-w-4xl mx-auto px-4 py-14">
        <h2 className="font-heading font-bold text-3xl text-foreground text-center mb-10">
          Everything You Get
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {INCLUDES.map((item, i) => (
            <div key={i} className="flex items-start gap-4 p-5 bg-card border border-border rounded-2xl">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 py-14">
          <h2 className="font-heading font-bold text-3xl text-foreground text-center mb-10">
            Real People. Real Results.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic mb-4">"{t.quote}"</p>
                <div>
                  <p className="font-heading font-semibold text-foreground text-sm">{t.name}</p>
                  <p className="text-xs text-primary font-medium">{t.result}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-3xl mx-auto px-4 py-14">
        <div className="bg-card border-2 border-primary rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-primary text-primary-foreground p-6 text-center">
            <p className="text-sm font-medium opacity-90 mb-1">The Full Transformation</p>
            <h2 className="font-heading font-extrabold text-3xl">6-Week Diabetes Reset</h2>
          </div>

          <div className="p-8">
            {/* Value Stack */}
            <div className="space-y-3 mb-8">
              {[
                { item: "12 One-on-One Coaching Sessions", value: "$600" },
                { item: "Custom Meal Plans & Recipes", value: "$200" },
                { item: "Daily WhatsApp Support (42 days)", value: "$300" },
                { item: "Movement & Exercise Program", value: "$150" },
                { item: "Mindset & Habit Coaching", value: "$150" },
                { item: "Progress Tracking & Accountability", value: "$100" },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    {row.item}
                  </span>
                  <span className="text-muted-foreground line-through">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-6 mb-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground text-sm">Total Value</span>
                <span className="text-muted-foreground line-through text-lg">$1,500</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground font-heading font-bold text-lg">Your Price</span>
                <div className="text-right">
                  <span className="font-heading font-extrabold text-4xl text-primary">$497</span>
                  <p className="text-xs text-muted-foreground">or 2 payments of $267</p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/30 border border-secondary rounded-xl p-4 mb-6 text-center">
              <p className="text-sm font-medium text-foreground">
                🎉 Tiny Challenge graduates get <strong className="text-primary">$27 off</strong> — your deposit is applied to the full program!
              </p>
            </div>

            <Button
              asChild
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 font-bold rounded-xl h-auto text-lg shadow-lg"
            >
              <a href="https://wa.me/18768822547?text=Hi!%20I%20completed%20the%205-Day%20Challenge%20and%20I'm%20ready%20to%20join%20the%206-Week%20Reset!" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" />
                Message Me to Enroll
              </a>
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              Limited to 5 clients per month for personalized attention
            </p>
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="max-w-3xl mx-auto px-4 pb-14">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="font-heading font-bold text-xl text-foreground mb-3">
            30-Day Money-Back Guarantee
          </h3>
          <p className="text-muted-foreground max-w-lg mx-auto">
            If after 30 days you don't feel the program is right for you, I'll refund every penny.
            No questions asked. Your health journey should feel right — and I stand behind this program 100%.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary/5 border-t border-primary/20">
        <div className="max-w-3xl mx-auto px-4 py-14 text-center">
          <h2 className="font-heading font-bold text-3xl text-foreground mb-4">
            Your 5 days proved it's possible.<br />
            6 weeks will make it permanent.
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
            Stop managing diabetes. Start reversing it.
          </p>
          <Button
            onClick={scrollToPrice}
            className="bg-primary hover:bg-primary/90 text-primary-foreground py-4 px-10 font-bold rounded-xl h-auto text-lg shadow-lg"
          >
            Join the 6-Week Reset
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default SixWeekReset;
