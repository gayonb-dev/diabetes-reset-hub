import { useRef } from "react";
import { Apple, ClipboardList, FileText, MessageSquare, Sun } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

/**
 * Prompt 4 §5 — product proof.
 *
 * These are product descriptions of real, shipped screens. No fabricated
 * dashboards, no member data, no health-outcome claims, no quotes.
 */
const CARDS = [
  {
    icon: Sun,
    title: "Today",
    body: "See one clear daily action and return when you are ready for the next step.",
  },
  {
    icon: Apple,
    title: "Meals",
    body: "Build practical meal structure around your preferences and save useful ideas.",
  },
  {
    icon: ClipboardList,
    title: "Progress",
    body: "Record the information you choose and view trends without the app diagnosing them.",
  },
  {
    icon: MessageSquare,
    title: "Ask",
    body: "Find labeled educational answers, clear safety boundaries, and guidance on when to contact a professional.",
  },
  {
    icon: FileText,
    title: "Printable report",
    body: "Organize selected entries and questions into a report you can bring to a healthcare visit.",
  },
];

const InsideMembershipSection = () => {
  const trackRef = useRef<HTMLUListElement>(null);

  return (
    <section
      id="inside-the-membership"
      className="bg-gradient-to-b from-background to-primary/5 py-12"
      aria-labelledby="inside-heading"
    >
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <h2
            id="inside-heading"
            className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-3"
          >
            Inside your membership
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
            See the tools members can use from the first 14 days onward. These are product
            views—not promised health results.
          </p>
        </ScrollReveal>

        {/* Mobile: keyboard-operable horizontal carousel. Desktop: balanced grid. */}
        <ul
          ref={trackRef}
          className="flex md:grid md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0"
          tabIndex={0}
          aria-label="Membership tools, scrollable list"
        >
          {CARDS.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="snap-start shrink-0 w-[80%] sm:w-[45%] md:w-auto bg-card border border-border rounded-xl p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-foreground mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
            </li>
          ))}
        </ul>

        <div className="flex md:hidden justify-center gap-3 mt-2">
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] rounded-lg border border-border px-4 text-sm"
            onClick={() => trackRef.current?.scrollBy({ left: -280, behavior: "smooth" })}
          >
            Previous
          </button>
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] rounded-lg border border-border px-4 text-sm"
            onClick={() => trackRef.current?.scrollBy({ left: 280, behavior: "smooth" })}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
};

export default InsideMembershipSection;
