import { Apple, BookOpen, ClipboardList, FileText, Sun } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

/**
 * "What you can do on Day 1" — each item names the destination that actually
 * holds the action today, so nothing here sends a new member to the wrong tab.
 */
const DAY_ONE = [
  {
    icon: Sun,
    title: "See one clear Today's Action",
    body: "Your Today screen opens on a single action for the day, with the day's logging beneath it.",
  },
  {
    icon: Apple,
    title: "Explore meals and recipes",
    body: "Meals holds meal ideas, recipes and a shopping list you can view grouped by meal.",
  },
  {
    icon: ClipboardList,
    title: "Record health and habit information",
    body: "Health entries such as blood glucose, A1C, weight and measurements live in Progress. Daily habits — water, meals, movement and the mindset reflection — are logged on Today.",
  },
  {
    icon: BookOpen,
    title: "Review educational Guides",
    body: "Learn holds the written guides and articles. They are educational, not medical advice.",
  },
  {
    icon: FileText,
    title: "Prepare a printable report",
    body: "Progress can produce a printable report of the entries you choose to bring to a healthcare visit.",
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
          What you can do on Day 1
        </h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
          Everything below is available as soon as your payment is confirmed. Nothing here
          diagnoses, treats or monitors you.
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
    </div>
  </section>
);

export default DayOneSection;
