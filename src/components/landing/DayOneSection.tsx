import { Apple, BookOpen, ClipboardList, FileText, Sun } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

/**
 * "This is what your $27 gives you from Day 1" — each item names the destination
 * that actually holds the action today, so nothing here sends a new member to
 * the wrong tab.
 */
const DAY_ONE = [
  {
    icon: Sun,
    title: "See today’s action",
    body: "Open the app and know where to begin without facing another long checklist.",
  },
  {
    icon: Apple,
    title: "Build a practical meal plan",
    body: "Use meal ideas, recipes, swaps, and shopping tools to organize the meals you choose.",
  },
  {
    icon: ClipboardList,
    title: "Record what matters to you",
    body: "Keep your selected readings, meals, water, movement, weight, measurements, and habits in one place.",
  },
  {
    icon: BookOpen,
    title: "Find educational support",
    body: "Explore written guides and ask educational questions when you want more context.",
  },
  {
    icon: FileText,
    title: "Prepare for healthcare visits",
    body: "Create a printable summary of selected entries and questions to bring to a conversation with your healthcare professional.",
  },
];

const DayOneSection = () => (
  <section
    id="day-one"
    className="scroll-mt-24 bg-background py-12"
    aria-labelledby="day-one-heading"
  >
    <div className="container mx-auto px-4 max-w-4xl">
      <ScrollReveal>
        <h2
          id="day-one-heading"
          className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-3"
        >
          This is what your $27 gives you from Day 1.
        </h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
          You do not have to wait weeks for the membership to become useful. Open DRM and begin with
          the tools available immediately.
        </p>
      </ScrollReveal>

      <ul className="grid sm:grid-cols-2 gap-4">
        {DAY_ONE.map(({ icon: Icon, title, body }) => (
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

      <p className="text-center text-muted-foreground mt-8">
        Open the app. See the next step. Start there.
      </p>
    </div>
  </section>
);

export default DayOneSection;
