import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Lock, ExternalLink, Pill, Apple } from "lucide-react";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

type SupplementCard = {
  key: string;
  title: string;
  audience: string;
  dosage: string;
  details: string[];
  unlockDay: number;
  searchUrl: string;
};

const CARDS: SupplementCard[] = [
  {
    key: "diabetes-pack",
    title: "Nature Made Diabetes Health Pack",
    audience: "Everyone, from Day 1",
    dosage: "One packet daily with your largest meal.",
    details: [
      "Multivitamin with diabetes-relevant nutrients",
      "Alpha Lipoic Acid",
      "Chromium",
      "Vitamin D3",
      "Omega-3 (EPA + DHA)",
      "B-complex (B1, B6, B12)",
      "Magnesium",
    ],
    unlockDay: 1,
    searchUrl:
      "https://www.google.com/search?q=Nature+Made+Diabetes+Health+Pack",
  },
  {
    key: "solgar-joints",
    title: "Solgar Glucosamine Hyaluronic Acid Chondroitin MSM",
    audience: "Knee issues — unlocks Month 2",
    dosage: "3 tablets once daily with food.",
    details: [
      "Glucosamine 1500mg",
      "Chondroitin 1200mg",
      "MSM 1500mg",
      "BioCell Collagen Type II",
      "Hyaluronic Acid 30mg",
    ],
    unlockDay: 31,
    searchUrl:
      "https://www.google.com/search?q=Solgar+Glucosamine+Hyaluronic+Acid+Chondroitin+MSM",
  },
  {
    key: "deal-rala",
    title: "DEAL Supplement R-Alpha Lipoic Acid 600mg + Benfotiamine 300mg",
    audience: "Neuropathy — unlocks Month 2",
    dosage: "3 capsules once daily with food.",
    details: ["R-ALA 600mg", "Benfotiamine 300mg"],
    unlockDay: 31,
    searchUrl:
      "https://www.google.com/search?q=DEAL+R-Alpha+Lipoic+Acid+600mg+Benfotiamine+300mg",
  },
];

export default function Supplements() {
  const { subscription } = useAuth();
  const currentProgramDay = useMemo(() => {
    const start = subscription?.created_at
      ? new Date(subscription.created_at)
      : new Date();
    const diff = Math.floor(
      (startOfDay(new Date()).getTime() - startOfDay(start).getTime()) /
        86400000,
    );
    return Math.max(diff + 1, 1);
  }, [subscription]);

  const foodGradeUnlocked = currentProgramDay >= 15;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading font-semibold text-2xl text-foreground">
          Supplements
        </h1>
        <p className="text-sm text-secondary-fg mt-1">
          The foundation, plus targeted support as you progress.
        </p>
      </div>

      <div className="space-y-4">
        {CARDS.map((c) => {
          const locked = currentProgramDay < c.unlockDay;
          return (
            <Card
              key={c.key}
              className={`p-5 border-[1.5px] ${
                locked ? "bg-bg-subtle border-border opacity-90" : "bg-card border-border"
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="bg-primary-muted text-primary p-2 rounded-lg shrink-0">
                  <Pill className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="label-caps text-accent">{c.audience}</p>
                  <h2 className="font-heading font-semibold text-lg text-foreground mt-0.5">
                    {c.title}
                  </h2>
                </div>
                {locked && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-tertiary-fg whitespace-nowrap">
                    <Lock className="h-3 w-3" /> Month 2
                  </span>
                )}
              </div>

              <p className="text-sm text-foreground mb-3">
                <span className="font-medium">Dosage: </span>
                {c.dosage}
              </p>

              <details className="text-sm group">
                <summary className="cursor-pointer text-primary font-medium select-none">
                  What's in it
                </summary>
                <ul className="mt-2 space-y-1 text-secondary-fg list-disc list-inside">
                  {c.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </details>

              {!locked && (
                <a
                  href={c.searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                >
                  Find it online <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="font-heading font-semibold text-lg text-foreground mb-2 flex items-center gap-2">
          <Apple className="h-5 w-5 text-accent" /> Food-grade additions
        </h2>
        {foodGradeUnlocked ? (
          <div className="space-y-3">
            <Card className="p-4 border border-border">
              <h3 className="font-medium text-foreground mb-1">
                Apple Cider Vinegar
              </h3>
              <p className="text-sm text-secondary-fg">
                1–2 tablespoons in a large glass of water, 15–30 minutes before
                meals. Use organic ACV with the mother.
              </p>
            </Card>
            <Card className="p-4 border border-border">
              <h3 className="font-medium text-foreground mb-1">
                Ceylon Cinnamon
              </h3>
              <p className="text-sm text-secondary-fg">
                ½ to 1 teaspoon daily stirred into oats, yogurt, or a warm
                drink. Must be Ceylon — not Cassia. Check the label.
              </p>
            </Card>
          </div>
        ) : (
          <Card className="p-4 border border-dashed border-border bg-bg-subtle">
            <p className="text-sm text-tertiary-fg flex items-center gap-2">
              <Lock className="h-4 w-4" /> Unlocks on Day 15 (you're on Day{" "}
              {currentProgramDay}).
            </p>
          </Card>
        )}
      </div>

      <div className="bg-primary-muted rounded-lg p-4">
        <p className="text-[12px] text-foreground leading-relaxed">
          These are nutritional supplements, not medications. They are not
          intended to diagnose, treat, cure, or prevent any disease. Never begin
          a new supplement without informing your healthcare provider,
          especially if you are currently on diabetes medication. Berberine and
          high-dose ALA can affect blood sugar levels and may interact with
          your current treatment.
        </p>
      </div>
    </div>
  );
}
