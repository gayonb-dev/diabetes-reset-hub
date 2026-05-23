import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Sub {
  id: string;
  question: string;
  question_type: "quick" | "detailed";
  status: string;
  answer: string | null;
  publish_anonymously: boolean;
  created_at: string;
}

const POINT_CAP = 4;

function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function Ask() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [published, setPublished] = useState<Sub[]>([]);
  const [mine, setMine] = useState<Sub[]>([]);
  const [pointsUsed, setPointsUsed] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const [question, setQuestion] = useState("");
  const [qType, setQType] = useState<"quick" | "detailed">("quick");
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    if (!user) return;
    const [pub, own, usage] = await Promise.all([
      supabase
        .from("qa_submissions")
        .select("*")
        .eq("status", "published")
        .eq("publish_anonymously", true)
        .order("answered_at", { ascending: false })
        .limit(100),
      supabase
        .from("qa_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("qa_monthly_usage")
        .select("points_used")
        .eq("user_id", user.id)
        .eq("period_month", monthKey())
        .maybeSingle(),
    ]);
    setPublished((pub.data || []) as Sub[]);
    setMine((own.data || []) as Sub[]);
    setPointsUsed(usage.data?.points_used || 0);
  };

  useEffect(() => {
    refresh();
  }, [user]);

  const filtered = useMemo(
    () =>
      published.filter(
        (q) =>
          !search ||
          q.question.toLowerCase().includes(search.toLowerCase()) ||
          (q.answer || "").toLowerCase().includes(search.toLowerCase()),
      ),
    [search, published],
  );

  const noMatch = search.length > 2 && filtered.length === 0;
  const cost = qType === "quick" ? 1 : 2;
  const remaining = POINT_CAP - pointsUsed;
  const canSubmit = remaining >= cost && question.trim().length >= 10;

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setSubmitting(true);

    const { error: insErr } = await supabase.from("qa_submissions").insert({
      user_id: user.id,
      question: question.trim(),
      question_type: qType,
      points_cost: cost,
    });
    if (insErr) {
      toast({ title: "Couldn't submit", description: insErr.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    await supabase.from("qa_monthly_usage").upsert(
      { user_id: user.id, period_month: monthKey(), points_used: pointsUsed + cost },
      { onConflict: "user_id,period_month" },
    );

    setQuestion("");
    setShowForm(false);
    await refresh();
    setSubmitting(false);
    toast({ title: "Submitted", description: "You'll see the answer here when it's ready." });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-foreground">Ask</h1>
          <p className="text-sm text-muted-foreground">Search answered questions first.</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {pointsUsed} of {POINT_CAP} questions used this month
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search answered questions"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filtered.slice(0, 30).map((q) => (
          <details key={q.id} className="border border-border rounded-lg p-3 bg-card">
            <summary className="text-sm font-medium cursor-pointer text-foreground">
              {q.question}
            </summary>
            {q.answer && (
              <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap leading-relaxed">
                {q.answer}
              </p>
            )}
          </details>
        ))}
        {published.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Answered questions appear here as the coach replies.
          </p>
        )}
      </div>

      {/* Submission form — expands when no match or user clicks */}
      {(noMatch || showForm) ? (
        <Card className="p-5 border border-border">
          <p className="text-sm font-medium text-foreground mb-3">
            {noMatch ? "Nothing matched. Ask the coach:" : "Submit a new question"}
          </p>
          <RadioGroup
            value={qType}
            onValueChange={(v) => setQType(v as "quick" | "detailed")}
            className="mb-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="quick" id="quick" />
              <Label htmlFor="quick" className="cursor-pointer text-sm">
                Quick — short answer (1 point)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="detailed" id="detailed" />
              <Label htmlFor="detailed" className="cursor-pointer text-sm">
                Detailed — in-depth (2 points)
              </Label>
            </div>
          </RadioGroup>
          <Textarea
            placeholder="Type your question…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            className="mb-3"
            maxLength={1000}
          />
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit ({cost} {cost === 1 ? "point" : "points"})
          </Button>
          {remaining < cost && (
            <p className="text-xs text-destructive mt-2 text-center">
              Out of points this month. Resets on the 1st.
            </p>
          )}
        </Card>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-primary hover:underline"
        >
          Or submit a new question →
        </button>
      )}

      {/* My questions */}
      {mine.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-foreground mb-2">Your questions</h2>
          <div className="space-y-2">
            {mine.map((q) => (
              <div key={q.id} className="border border-border rounded-lg p-3 bg-card">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {q.status}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(q.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-foreground">{q.question}</p>
                {q.answer && (
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed">
                    {q.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
