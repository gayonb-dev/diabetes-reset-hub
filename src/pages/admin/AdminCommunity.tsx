import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Trash2, Star, Bot } from "lucide-react";
import AdminListSkeleton from "@/components/admin/AdminListSkeleton";
import { toast } from "sonner";

interface Q {
  id: string;
  content: string;
  is_question_of_day: boolean;
  question_of_day_date: string | null;
  answer_count: number;
  is_verified_answered: boolean;
  created_at: string;
  display_name: string | null;
  author_day_in_program: number | null;
}

interface A {
  id: string;
  question_id: string;
  content: string;
  is_verified: boolean;
  is_admin_response: boolean;
  is_vita_response: boolean;
  created_at: string;
  display_name: string | null;
}

export default function AdminCommunity() {
  const [qs, setQs] = useState<Q[]>([]);
  const [answersByQ, setAnswersByQ] = useState<Record<string, A[]>>({});
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: qData } = await supabase
      .from("community_questions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    const { data: aData } = await supabase
      .from("community_answers")
      .select("*")
      .order("created_at", { ascending: true });
    setQs((qData || []) as Q[]);
    const map: Record<string, A[]> = {};
    for (const a of (aData || []) as A[]) {
      (map[a.question_id] ||= []).push(a);
    }
    setAnswersByQ(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const postAdminAnswer = async (q: Q) => {
    const text = (replyDraft[q.id] ?? "").trim();
    if (text.length < 3) return;
    setBusy(q.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("community_answers").insert({
      question_id: q.id,
      author_id: user.id,
      content: text,
      is_admin_response: true,
      is_verified: true,
      display_name: "Diabetes Reset Method",
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    setReplyDraft((s) => ({ ...s, [q.id]: "" }));
    toast.success("Posted as DRM team");
    await load();
  };

  const verifyAnswer = async (a: A) => {
    setBusy(a.id);
    const { error } = await supabase.functions.invoke("verify-community-answer", {
      body: { answer_id: a.id },
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Verified + embedded for VITA search");
    await load();
  };

  const deleteAnswer = async (a: A) => {
    if (!confirm("Delete this answer?")) return;
    await supabase.from("community_answers").delete().eq("id", a.id);
    await supabase.from("community_answer_embeddings").delete().eq("answer_id", a.id);
    await load();
  };

  const deleteQuestion = async (q: Q) => {
    if (!confirm("Delete this question and all its answers?")) return;
    await supabase.from("community_questions").delete().eq("id", q.id);
    await load();
  };

  const setQotD = async (q: Q) => {
    const today = new Date().toISOString().slice(0, 10);
    // clear any other QotD for today
    await supabase
      .from("community_questions")
      .update({ is_question_of_day: false, question_of_day_date: null })
      .eq("question_of_day_date", today);
    await supabase
      .from("community_questions")
      .update({ is_question_of_day: true, question_of_day_date: today })
      .eq("id", q.id);
    toast.success("Set as Question of the Day");
    await load();
  };

  if (loading) {
    return <AdminListSkeleton rows={4} rowHeight="h-28" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Community Moderation</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            const { data, error } = await supabase.functions.invoke("select-question-of-day", { body: {} });
            if (error) return toast.error(error.message);
            toast.success(`QotD cron ran: ${data?.source ?? "ok"}`);
            await load();
          }}
        >
          Run QotD cron
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Verify high-quality answers so VITA surfaces them in similarity search. Post as DRM team for authoritative replies.
      </p>


      {qs.map((q) => (
        <Card key={q.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-medium">{q.content}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {q.display_name ?? "DRM Member"}
                {q.author_day_in_program ? ` · Day ${q.author_day_in_program}` : ""}
                {q.is_verified_answered && " · ✓ verified"}
                {q.is_question_of_day && " · ⭐ QotD"}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setQotD(q)}>
                <Star className="h-3.5 w-3.5 mr-1" /> QotD
              </Button>
              <Button size="sm" variant="outline" onClick={() => deleteQuestion(q)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-2 pl-3 border-l-2">
            {(answersByQ[q.id] || []).map((a) => (
              <div key={a.id} className="text-sm bg-muted/30 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    {a.is_admin_response ? "DRM Team" : a.is_vita_response ? "VITA" : (a.display_name ?? "Member")}
                    {a.is_verified && " ✓"}
                  </span>
                  <div className="flex gap-1">
                    {!a.is_verified && (
                      <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => verifyAnswer(a)}>
                        {busy === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-1" /> Verify + embed</>}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteAnswer(a)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap">{a.content}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Textarea
              placeholder="Post as DRM team (auto-verified)..."
              value={replyDraft[q.id] ?? ""}
              onChange={(e) => setReplyDraft((s) => ({ ...s, [q.id]: e.target.value }))}
              rows={2}
              className="flex-1"
            />
            <Button onClick={() => postAdminAnswer(q)} disabled={busy === q.id}>
              {busy === q.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
            </Button>
          </div>
        </Card>
      ))}

      {qs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No community questions yet.</p>}
    </div>
  );
}
