import { useState } from "react";
import BloodSugarTab from "@/components/progress/BloodSugarTab";
import A1CTab from "@/components/progress/A1CTab";
import WeightTab from "@/components/progress/WeightTab";
import HabitsTab from "@/components/progress/HabitsTab";
import MeasurementsTab from "@/components/progress/MeasurementsTab";

const TABS = [
  { k: "bs", label: "Blood Sugar" },
  { k: "weight", label: "Weight" },
  { k: "measurements", label: "Measurements" },
  { k: "habits", label: "Habits" },
  { k: "a1c", label: "A1C" },
] as const;

type TabKey = (typeof TABS)[number]["k"];

export default function ProgressPage() {
  const [tab, setTab] = useState<TabKey>("bs");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-semibold text-2xl text-foreground">Progress</h1>
        <p className="text-sm text-muted-foreground">Log your numbers. The trend is what matters.</p>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-3 py-2 text-sm border-b-2 whitespace-nowrap transition-colors ${
              tab === t.k
                ? "border-primary text-primary font-medium"
                : "border-transparent text-secondary-fg hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "bs" && <BloodSugarTab />}
      {tab === "weight" && <WeightTab />}
      {tab === "measurements" && <MeasurementsTab />}
      {tab === "habits" && <HabitsTab />}
      {tab === "a1c" && <A1CTab />}
    </div>
  );
}
