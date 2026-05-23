import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Lock, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

interface ContentItem {
  id: string;
  type: string;
  slug: string;
  title: string;
  summary: string | null;
  day_unlock: number;
  metadata: Record<string, unknown> | null;
}

const TABS: { key: string; label: string; types: string[] }[] = [
  { key: "recipes", label: "Recipes", types: ["recipe"] },
  { key: "movement", label: "Movement", types: ["movement"] },
  { key: "resources", label: "Resources", types: ["article", "plate_method", "mini_challenge", "reset_day"] },
];

export default function Library() {
  const { user, subscription } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [completedDays, setCompletedDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("content_items")
        .select("id,type,slug,title,summary,day_unlock,metadata")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("member_progress").select("day_number").eq("user_id", user.id),
    ]).then(([ci, mp]) => {
      setItems((ci.data || []) as ContentItem[]);
      setCompletedDays((mp.data || []).length);
      setLoading(false);
    });
  }, [user]);

  const memberDay = useMemo(() => {
    if (!subscription?.created_at) return 1;
    const start = new Date(subscription.created_at);
    return Math.min(
      Math.max(
        Math.floor((Date.now() - start.getTime()) / 86400000) + 1,
        1,
      ),
      14,
    );
  }, [subscription]);

  const unlocked = memberDay >= 6 || completedDays >= 5;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-heading font-semibold text-xl mb-2 text-foreground">
          Available on Day 6
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Finish the daily actions first. You're on Day {memberDay} — {completedDays}/5 done.
        </p>
        <Link to="/app" className="text-sm text-primary hover:underline">
          Back to today
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-semibold text-2xl text-foreground">Library</h1>
        <p className="text-sm text-muted-foreground">Use it when you have a question.</p>
      </div>

      <Tabs defaultValue="recipes">
        <TabsList className="bg-muted">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => {
          const list = items.filter((i) => t.types.includes(i.type));
          return (
            <TabsContent key={t.key} value={t.key} className="mt-5">
              {list.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nothing here yet. New items are added weekly.
                  </p>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {list.map((it) => {
                    const meta = (it.metadata || {}) as Record<string, string>;
                    const tag = [meta.tag, meta.duration].filter(Boolean).join(" · ");
                    return (
                      <Card
                        key={it.id}
                        className="p-4 border border-border hover:border-primary/40 transition-colors cursor-pointer"
                      >
                        <h3 className="font-medium text-foreground text-sm mb-1">{it.title}</h3>
                        {it.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{it.summary}</p>
                        )}
                        {tag && (
                          <p className="text-[11px] text-muted-foreground mt-2 uppercase tracking-wide">
                            {tag}
                          </p>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
