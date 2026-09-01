import { Link } from "react-router-dom";
import { BadgeCheck, PhoneOff, ShieldCheck, Undo2 } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const POINTS = [
  {
    icon: PhoneOff,
    title: "Cancel in the app",
    body: "No phone call or cancellation email is required.",
  },
  {
    icon: ShieldCheck,
    title: "No cancellation obstacle course",
    body: "No retention survey or additional offer is required before cancellation.",
  },
  {
    icon: BadgeCheck,
    title: "Keep the access you paid for",
    body: "Canceling stops the next renewal. It does not immediately remove access to your paid period.",
  },
  {
    icon: Undo2,
    title: "Separate refund-request path",
    body: "If you want to request a refund, use in-app Support or the contact method stated in the Refund Terms.",
  },
];

const RiskControlSection = () => (
  <section className="bg-background py-12" aria-labelledby="risk-control-heading">
    <div className="container mx-auto px-4 max-w-4xl">
      <ScrollReveal>
        <p className="text-sm font-semibold tracking-widest uppercase text-primary text-center mb-2">
          Keep control of the decision
        </p>
        <h2
          id="risk-control-heading"
          className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-4"
        >
          Use the membership first. Decide before it renews.
        </h2>
        <div className="text-center text-muted-foreground max-w-2xl mx-auto mb-10 space-y-3">
          <p>Your first 14 days cost $27.</p>
          <p>
            If you decide DRM is not for you, cancel from Settings or Billing before the renewal
            date. You will not be charged the $67 monthly renewal, and your access will continue
            through the period you already paid for.
          </p>
          <p>
            Cancellation does not automatically issue a refund. Each $27 or $67 charge has its own
            30-day refund-request window under the{" "}
            <Link to="/refunds" className="underline underline-offset-4">
              Refund Terms
            </Link>
            .
          </p>
        </div>
      </ScrollReveal>

      <ul className="grid sm:grid-cols-2 gap-4">
        {POINTS.map(({ icon: Icon, title, body }) => (
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
        Try the actual membership. Keep control of what happens next.
      </p>
    </div>
  </section>
);

export default RiskControlSection;
