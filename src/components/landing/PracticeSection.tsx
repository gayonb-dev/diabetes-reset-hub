import { Activity, BarChart3, MessageSquare, Sun, Utensils } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const ITEMS = [
  {
    icon: Sun,
    title: "One guided daily action",
    body: "Focus on one useful step instead of trying to tackle everything at once.",
  },
  {
    icon: Utensils,
    title: "Meal tools built around the plate method",
    body: "Use practical planning tools, recipes, swaps, and shopping lists without being handed a rigid diet.",
  },
  {
    icon: BarChart3,
    title: "Your own records and trends",
    body: "Record the information you choose and review it over time without the app diagnosing or interpreting your health.",
  },
  {
    icon: Activity,
    title: "Movement options",
    body: "Access guided movement sessions as they unlock, with standard and knee-friendly options.",
  },
  {
    icon: MessageSquare,
    title: "Better-prepared conversations",
    body: "Organize selected entries and questions into a report for your next healthcare visit.",
  },
];

const PracticeSection = () => (
  <section className="bg-background py-12" aria-labelledby="practice-heading">
    <div className="container mx-auto px-4 max-w-4xl">
      <ScrollReveal>
        <h2
          id="practice-heading"
          className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-4"
        >
          Built for the daily work that happens between appointments.
        </h2>
        <div className="text-center text-muted-foreground max-w-2xl mx-auto mb-10 space-y-3">
          <p>DRM does not promise to change your glucose, weight, A1C, or medication.</p>
          <p>
            It gives you a structured place to practice and record the daily actions that may
            already be part of your self-management routine.
          </p>
        </div>
      </ScrollReveal>

      <ul className="grid sm:grid-cols-2 gap-4">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="bg-card border border-border rounded-xl p-5 flex gap-4">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-heading font-semibold text-base text-foreground mb-1">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default PracticeSection;
