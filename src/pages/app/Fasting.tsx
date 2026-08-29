import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { FASTING_SCHEDULING_ENABLED } from "@/lib/featureFlags";

/**
 * Education-only fasting page.
 *
 * Fasting scheduling is gated behind FASTING_SCHEDULING_ENABLED (currently false,
 * with no clinical approval recorded). While the flag is false, this route renders
 * approved educational copy only — no timers, windows, screening questionnaire,
 * logging controls, or writes of fasting-specific health data.
 *
 * All copy below is the approved S2 content-appendix wording.
 */
export default function Fasting() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <span className="inline-block text-[11px] font-medium text-accent border border-accent/40 rounded px-2 py-0.5">
          Optional
        </span>
        <h1 className="font-heading font-semibold text-2xl text-foreground mt-2">
          Fasting and diabetes
        </h1>
        <p className="text-sm text-secondary-fg mt-2 leading-relaxed">
          Fasting is not required to use DRM. You can build useful routines with meals,
          movement, tracking, and visit preparation without fasting.
        </p>
      </div>

      <Card className="p-5 border border-border rounded-xl shadow-warm">
        <h2 className="font-heading font-semibold text-base text-foreground">
          Fasting schedules are not available right now
        </h2>
        <p className="text-sm text-secondary-fg mt-2 leading-relaxed">
          There is no fasting questionnaire, eligibility screening, timer or scheduler in
          this app, and scheduling is unavailable. This page is education only. We are
          keeping the fasting timer and scheduling tools off while the safety screening and
          instructions are reviewed. The app cannot decide whether fasting is safe for you.
        </p>
      </Card>

      <Card className="p-5 border border-border rounded-xl">
        <h2 className="font-heading font-semibold text-base text-foreground">
          Why a personal safety plan matters
        </h2>
        <p className="text-sm text-secondary-fg mt-2 leading-relaxed">
          Fasting can raise the risk of low blood sugar, high blood sugar, or dehydration
          for some people with diabetes. Your risk depends on your medicines, diabetes
          type, health history, and the kind of fast you are considering. If you want to
          fast, ask a prescriber or pharmacist who knows your medicines and health history.
          Never skip or change medicine because of this app.
        </p>
      </Card>

      <Card className="p-5 border border-border rounded-xl">
        <h2 className="font-heading font-semibold text-base text-foreground">
          If your glucose is low
        </h2>
        <p className="text-sm text-secondary-fg mt-2 leading-relaxed">
          End the fast and follow your healthcare professional's low-blood-sugar plan. Use
          the glucose safety message shown with your reading. Never change medication based
          on this app alone.
        </p>
      </Card>

      <Card className="p-5 border border-border rounded-xl">
        <h2 className="font-heading font-semibold text-base text-foreground">
          Tools you can use now
        </h2>
        <ul className="mt-2 space-y-1.5 text-sm text-secondary-fg list-disc pl-5">
          <li>Build meals with the plate method</li>
          <li>Choose meal times that fit your day</li>
          <li>Use the movement options that are appropriate for you</li>
          <li>Track patterns and prepare questions for a healthcare visit</li>
        </ul>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="min-h-11 rounded-lg bg-primary text-primary-foreground">
          <Link to="/app/meals">Explore meal tools</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-11 rounded-lg">
          <Link to="/app/learn">Back to Learn</Link>
        </Button>
      </div>

      <p className="text-xs text-tertiary-fg leading-relaxed">
        General education based on the{" "}
        <a
          href="https://diabetesjournals.org/care/article/49/Supplement_1/S89/163932/5-Facilitating-Positive-Health-Behaviors-and-Well"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          ADA Standards
          <ExternalLink className="h-3 w-3" />
        </a>{" "}
        of Care in Diabetes—2026 and{" "}
        <a
          href="https://www.niddk.nih.gov/health-information/professionals/diabetes-discoveries-practice/fasting-safely-with-diabetes"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          NIDDK fasting guidance
          <ExternalLink className="h-3 w-3" />
        </a>
        . This page is educational and is not medical clearance.
      </p>

      {FASTING_SCHEDULING_ENABLED && (
        <p className="text-xs text-tertiary-fg">
          Fasting scheduling requires a clinician-approved eligibility model before any
          tool is reintroduced.
        </p>
      )}
    </div>
  );
}
