// Snack Library tab — reads from public.snack_library and gates by member day_number.
// Phase 9, Section 13. Locked snacks render dimmed with a lock + "Unlocks at Day X."

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Sun, Sunset, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Snack {
  id: string;
  name: string;
  description: string;
  nutritional_note: string;
  timing: "morning" | "afternoon" | "any";
  type: "fruit" | "protein" | "dairy" | "vegetable" | "grain";
  unlock_day: number;
  sort_order: number;
}

const TYPE_LABEL: Record<Snack["type"], string> = {
  fruit: "Fruit",
  protein: "Protein",
  dairy: "Dairy",
  vegetable: "Vegetable",
  grain: "Grain",
};

export function SnackLibrary({ dayNumber }: { dayNumber: number }) {
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("snack_library" as never)
        .select("*")
        .order("sort_order", { ascending: true });
      if (!active) return;
      setSnacks((data as Snack[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading snacks…
      </div>
    );
  }

  if (snacks.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Snacks unlock as you progress through the program.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pick any unlocked snack between meals — ideally 2.5–3 hours after eating.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {snacks.map((s) => {
          const locked = dayNumber < s.unlock_day;
          return (
            <Card
              key={s.id}
              className={cn(
                "p-4 border-border transition-opacity",
                locked && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-sm leading-tight flex items-center gap-1.5">
                  {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  {s.name}
                </h3>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {TYPE_LABEL[s.type]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{s.description}</p>
              <p className="text-[11px] text-primary/80 italic mb-3">{s.nutritional_note}</p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  {s.timing === "morning" ? (
                    <Sun className="h-3 w-3" />
                  ) : s.timing === "afternoon" ? (
                    <Sunset className="h-3 w-3" />
                  ) : null}
                  {s.timing === "any" ? "Anytime" : s.timing === "morning" ? "Morning" : "Afternoon"}
                </span>
                {locked && (
                  <span className="text-accent font-medium">
                    Unlocks at Day {s.unlock_day}.
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
