import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Search, Loader2, MessageCircleQuestion } from "lucide-react";
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

  // form state
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
        .limit(50),
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
    await refresh();
    setSubmitting(false);
    toast({ title: "Question submitted ✓", description: "You'll see the answer in this thread when it's ready." });
  };

  const filteredPub = published.filter(
    (q) =>
      !search ||
      q.question.toLowerCase().includes(search.toLowerCase()) ||
      (q.answer || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-3xl mb-2">Ask</h1>
        <p className="text-muted-foreground">
          Search answered questions first. Submit your own if you can't find it.
        </p>
      </div>

      {/* Search published */}
      <Card className="p-5">
        <h2 className="font-heading font-bold mb-3 flex items-center gap-2">
          <Search className="h-4 w-4" /> Answered Questions
        </h2>
        <Input
          placeholder="Search topics, foods, symptoms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredPub.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No answered questions match yet. Be the first to ask.
            </p>
          )}
          {filteredPub.map((q) => (
            <details key={q.id} className="border rounded-lg p-3">
              <summary className="font-semibold cursor-pointer text-sm">{q.question}</summary>
              {q.answer && (
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{q.answer}</p>
              )}
            </details>
          ))}
        </div>
      </Card>

      {/* Submit form */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold flex items-center gap-2">
            <MessageCircleQuestion className="h-4 w-4" /> Ask a New Question
          </h2>
          <span className="text-xs font-semibold text-muted-foreground">
            {remaining}/{POINT_CAP} pts left this month
          </span>
        </div>

        <RadioGroup value={qType} onValueChange={(v) => setQType(v as "quick" | "detailed")} className="mb-3">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="quick" id="quick" />
            <Label htmlFor="quick" className="cursor-pointer text-sm">
              <strong>Quick</strong> — short answer (1 pt)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="detailed" id="detailed" />
            <Label htmlFor="detailed" className="cursor-pointer text-sm">
              <strong>Detailed</strong> — in-depth response (2 pts)
            </Label>
          </div>
        </RadioGroup>

        <Textarea
          placeholder="Type your question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={4}
          className="mb-3"
          maxLength={1000}
        />
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full bg-primary hover:bg-primary-dark text-primary-foreground"
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Submit Question ({cost} pt{cost > 1 ? "s" : ""})
        </Button>
        {remaining < cost && (
          <p className="text-xs text-destructive mt-2 text-center">
            Not enough points this month. Resets on the 1st.
          </p>
        )}
      </Card>

      {/* My questions */}
      {mine.length > 0 && (
        <Card className="p-5">
          <h2 className="font-heading font-bold mb-3">Your Questions</h2>
          <div className="space-y-3">
            {mine.map((q) => (
              <div key={q.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {q.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(q.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="font-medium text-sm mb-1">{q.question}</p>
                {q.answer && (
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                    <strong className="text-primary">A:</strong> {q.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
