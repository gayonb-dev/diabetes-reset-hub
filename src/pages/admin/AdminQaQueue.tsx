import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Q {
  id: string;
  user_id: string;
  question: string;
  question_type: string;
  status: string;
  answer: string | null;
  publish_anonymously: boolean;
  created_at: string;
}

export default function AdminQaQueue() {
  const [rows, setRows] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { answer: string; publish: boolean }>>({});
  const [tab, setTab] = useState<"pending" | "answered" | "published">("pending");

  const load = async () => {
    setLoading(true);
    // Audited PHI read — questions often contain meds, A1C, symptoms.
    const { data, error } = await supabase.functions.invoke("read-phi-data", {
      body: {
        table: "qa_submissions",
        reason: "Admin Q&A queue review",
        order_by: { column: "created_at", ascending: false },
      },
    });
    if (error) toast.error(error.message);
    setRows(((data?.rows as Q[]) || []));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) =>
    tab === "pending"
      ? r.status === "pending"
      : tab === "answered"
        ? r.status === "answered"
        : r.status === "published",
  );

  const save = async (id: string, publish: boolean) => {
    const d = drafts[id];
    if (!d?.answer?.trim()) return;
    const { error } = await supabase
      .from("qa_submissions")
      .update({
        answer: d.answer.trim(),
        publish_anonymously: d.publish,
        status: publish ? "published" : "answered",
        answered_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(publish ? "Published" : "Saved");
      // Notify the member their question has been answered (fire-and-forget)
      supabase.functions
        .invoke("notify-qa-answered", { body: { submission_id: id } })
        .catch((e) => console.warn("notify-qa-answered failed", e));
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["pending", "answered", "published"] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t)}
          >
            {t} ({rows.filter((r) => r.status === t).length})
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No questions in {tab}.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const d = drafts[q.id] || { answer: q.answer || "", publish: q.publish_anonymously };
            return (
              <Card key={q.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span className="uppercase font-semibold">{q.question_type}</span>
                      <span>•</span>
                      <span>{new Date(q.created_at).toLocaleString()}</span>
                      <span>•</span>
                      <span className="font-mono">{q.user_id.slice(0, 8)}…</span>
                    </div>
                    <p className="font-medium">{q.question}</p>
                  </div>
                </div>

                <Textarea
                  rows={4}
                  placeholder="Type your answer..."
                  value={d.answer}
                  onChange={(e) =>
                    setDrafts({ ...drafts, [q.id]: { ...d, answer: e.target.value } })
                  }
                />

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`pub-${q.id}`}
                      checked={d.publish}
                      onCheckedChange={(v) =>
                        setDrafts({ ...drafts, [q.id]: { ...d, publish: !!v } })
                      }
                    />
                    <Label htmlFor={`pub-${q.id}`} className="text-sm cursor-pointer">
                      Publish anonymously to library
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => save(q.id, false)}>
                      Save Draft
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => save(q.id, true)}
                      disabled={!d.publish}
                      className="bg-primary text-primary-foreground"
                    >
                      Publish
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
