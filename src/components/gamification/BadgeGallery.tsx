import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock } from "lucide-react";

export interface BadgeRow {
  slug: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  category: string;
  unlock_hint: string | null;
}

interface BadgeGalleryProps {
  category: "program" | "community";
  earnedSlugs: string[];
  title?: string;
}

const tierColor: Record<string, string> = {
  bronze: "#C97A3D",
  silver: "#7C7F84",
  gold: "#D4A227",
};

export default function BadgeGallery({ category, earnedSlugs, title }: BadgeGalleryProps) {
  const [rows, setRows] = useState<BadgeRow[]>([]);
  const earned = new Set(earnedSlugs);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("badges")
        .select("slug,name,description,icon,tier,category,unlock_hint")
        .eq("category", category)
        .order("sort_order");
      if (data) setRows(data as BadgeRow[]);
    })();
  }, [category]);

  if (rows.length === 0 && category === "community") {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center">
        <p className="text-sm text-secondary-fg">
          Community badges unlock as you participate in the Ask tab.
        </p>
      </div>
    );
  }

  return (
    <section>
      {title && (
        <h2 className="font-heading text-lg font-semibold text-foreground mb-3">{title}</h2>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {rows.map((b) => {
          const got = earned.has(b.slug);
          return (
            <div
              key={b.slug}
              className={`bg-card border rounded-xl p-3 flex flex-col items-center text-center transition-all ${
                got ? "border-accent/60" : "border-border opacity-50"
              }`}
              title={got ? b.description : b.unlock_hint ?? b.description}
            >
              <div
                className={`relative w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                  got ? "" : "bg-muted"
                }`}
                style={
                  got
                    ? { background: `${tierColor[b.tier] ?? "hsl(var(--accent))"}22` }
                    : undefined
                }
              >
                <span aria-hidden>{b.icon}</span>
                {!got && (
                  <Lock
                    className="absolute -bottom-1 -right-1 h-4 w-4 bg-card rounded-full p-0.5 text-tertiary-fg"
                    strokeWidth={2.5}
                  />
                )}
              </div>
              <p className="mt-2 text-[12px] font-semibold text-foreground leading-tight">
                {b.name}
              </p>
              <p className="mt-0.5 text-[10px] text-tertiary-fg leading-snug line-clamp-2">
                {got ? b.description : b.unlock_hint ?? ""}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
