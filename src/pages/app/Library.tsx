import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Lock, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

interface ContentItem {
  id: string;
  type: string;
  slug: string;
  title: string;
  summary: string | null;
  day_unlock: number;
}

export default function Library() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [completedDays, setCompletedDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("content_items").select("id,type,slug,title,summary,day_unlock").eq("is_active", true).order("sort_order"),
      supabase.from("member_progress").select("day_number").eq("user_id", user.id),
    ]).then(([ci, mp]) => {
      setItems((ci.data || []) as ContentItem[]);
      setCompletedDays((mp.data || []).length);
      setLoading(false);
    });
  }, [user]);

  const unlocked = completedDays >= 5;

  if (loading) return <p>Loading...</p>;

  if (!unlocked) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-heading font-bold text-2xl mb-2">Library locks until Day 6</h1>
        <p className="text-muted-foreground mb-6">
          Finish the 5-Day Reset Sprint first. Doing the work — even imperfectly — is what makes the library useful when you get here.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          You've completed <strong>{completedDays}/5 days</strong>.
        </p>
        <Link to="/app" className="text-primary font-semibold hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const byType = items.reduce<Record<string, ContentItem[]>>((acc, it) => {
    (acc[it.type] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-3xl mb-2">Library</h1>
        <p className="text-muted-foreground">Recipes, plate methods, movements, and mini-challenges.</p>
      </div>

      {Object.keys(byType).length === 0 && (
        <Card className="p-8 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Library content is being added. Check back soon.
          </p>
        </Card>
      )}

      {Object.entries(byType).map(([type, list]) => (
        <section key={type}>
          <h2 className="font-heading font-bold text-xl mb-3 capitalize">{type.replace("_", " ")}s</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {list.map((it) => (
              <Card key={it.id} className="p-4 hover:shadow-md transition-shadow">
                <h3 className="font-semibold mb-1">{it.title}</h3>
                {it.summary && <p className="text-sm text-muted-foreground">{it.summary}</p>}
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
