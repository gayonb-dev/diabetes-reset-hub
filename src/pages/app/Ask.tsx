import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ChevronUp, MessageSquare, Trophy, CheckCircle2, Flame } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";
import { Link, useNavigate } from "react-router-dom";

type Tab = "hot" | "new" | "unanswered" | "wins" | "mine";

interface Question {
  id: string;
  content: string;
  tags: string[];
  is_anonymous: boolean;
  display_name: string | null;
  author_day_in_program: number | null;
  upvote_count: number;
  metoo_count: number;
  answer_count: number;
  is_verified_answered: boolean;
  is_question_of_day: boolean;
  created_at: string;
  author_id: string;
}

interface AnswerRow {
  id: string;
  question_id: string;
  content: string;
  is_admin_response: boolean;
  is_vita_response: boolean;
  is_verified: boolean;
  is_anonymous: boolean;
  display_name: string | null;
  author_day_in_program: number | null;
  helpful_count: number;
  created_at: string;
}

interface WinPost {
  id: string;
  author_id: string;
  milestone_type: string;
  milestone_label: string;
  stat_improvement: string | null;
  share_stat: boolean;
  is_anonymous: boolean;
  display_name: string | null;
  author_day_in_program: number | null;
  reaction_counts: Record<string, number>;
  created_at: string;
}

const TAGS = ["meals", "blood sugar", "workouts", "supplements", "IF", "mindset", "snacks", "water", "measurements", "cheat meal"];
const REACTIONS: Array<{ key: string; emoji: string; label: string }> = [
  { key: "muscle", emoji: "💪", label: "Strong" },
  { key: "fist", emoji: "✊", label: "Solidarity" },
  { key: "fire", emoji: "🔥", label: "Fire" },
  { key: "clap", emoji: "👏", label: "Clap" },
];

function programDay(createdAt: string | null | undefined): number {
  if (!createdAt) return 1;
  return Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000) + 1);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Ask() {
  const { user, subscription } = useAuth();
  const navigate = useNavigate();
  const myDay = useMemo(() => programDay(subscription?.created_at), [subscription]);

  const [tab, setTab] = useState<Tab>("hot");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [wins, setWins] = useState<WinPost[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, Set<string>>>({}); // target_id -> set of vote_type
  const [displayName, setDisplayName] = useState<string | null>(null);

  // VITA bar
  const [vitaQ, setVitaQ] = useState("");
  const [vitaLoading, setVitaLoading] = useState(false);
  const [vitaResponse, setVitaResponse] = useState<any>(null);

  // Compose
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [composeTags, setComposeTags] = useState<string[]>([]);
  const [composeAnon, setComposeAnon] = useState(false);
  const [posting, setPosting] = useState(false);

  // Win compose
  const [winOpen, setWinOpen] = useState(false);
  const [winLabel, setWinLabel] = useState("");
  const [winStat, setWinStat] = useState("");

  const refresh = async () => {
    if (!user) return;
    const [qRes, wRes, vRes, profRes] = await Promise.all([
      supabase.from("community_questions").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("win_posts").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("community_votes").select("target_id, target_type, vote_type").eq("voter_id", user.id),
      supabase.from("visitor_profiles").select("community_display_name").eq("user_id", user.id).maybeSingle(),
    ]);
    setQuestions((qRes.data || []) as Question[]);
    setWins((wRes.data || []) as WinPost[]);
    setDisplayName(profRes.data?.community_display_name ?? null);
    const m: Record<string, Set<string>> = {};
    for (const v of vRes.data || []) {
      if (!m[v.target_id]) m[v.target_id] = new Set();
      m[v.target_id].add(v.vote_type);
    }
    setMyVotes(m);
  };

  useEffect(() => { refresh(); }, [user]);

  const visibleQuestions = useMemo(() => {
    let list = [...questions];
    if (tab === "hot") {
      const cutoff = Date.now() - 48 * 3600 * 1000;
      list = list
        .filter((q) => new Date(q.created_at).getTime() > cutoff)
        .sort((a, b) => (b.upvote_count + b.metoo_count + b.answer_count * 2) - (a.upvote_count + a.metoo_count + a.answer_count * 2));
    } else if (tab === "new") {
      // already sorted
    } else if (tab === "unanswered") {
      list = list.filter((q) => q.answer_count === 0);
    } else if (tab === "mine") {
      const myIds = new Set([user?.id]);
      list = list.filter((q) => myIds.has(q.author_id) || (myVotes[q.id]?.size ?? 0) > 0);
    }
    return list;
  }, [questions, tab, myVotes, user]);

  const unansweredCount = useMemo(() => questions.filter((q) => q.answer_count === 0).length, [questions]);

  // ----- VITA Quick Answer -----
  const askVita = async () => {
    if (!vitaQ.trim()) return;
    setVitaLoading(true);
    setVitaResponse(null);
    try {
      const { data, error } = await supabase.functions.invoke("ask-vita", {
        body: { question: vitaQ.trim(), day_in_program: myDay, first_name: displayName ?? null },
      });
      if (error) throw error;
      if (data?.type === "verified_existing") {
        const { data: ans } = await supabase
          .from("community_answers")
          .select("content, question_id")
          .eq("id", data.answer_id)
          .maybeSingle();
        setVitaResponse({ kind: "verified", answer: ans?.content, question_id: data.question_id, similarity: data.similarity });
      } else {
        setVitaResponse({ kind: "vita", ...data });
      }
    } catch (e: any) {
      toast({ title: "VITA couldn't answer", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setVitaLoading(false);
    }
  };

  // ----- Voting -----
  const toggleVote = async (target_id: string, target_type: "question" | "answer", vote_type: string) => {
    if (!user) return;
    const has = myVotes[target_id]?.has(vote_type);
    if (has) {
      await supabase.from("community_votes").delete()
        .eq("voter_id", user.id).eq("target_id", target_id).eq("target_type", target_type).eq("vote_type", vote_type);
    } else {
      await supabase.from("community_votes").insert({
        voter_id: user.id, target_id, target_type, vote_type,
      });
      // Helpful Points: +2 to question author when receiving Me too!
      if (vote_type === "metoo" && target_type === "question") {
        const q = questions.find((x) => x.id === target_id);
        if (q && q.author_id !== user.id) {
          await supabase.rpc("award_helpful_points", { p_user_id: q.author_id, p_amount: 2 });
        }
      }
    }
    await refresh();
  };

  // ----- Post question -----
  const submitQuestion = async () => {
    if (!user || composeText.trim().length < 10) return;
    setPosting(true);
    const { error } = await supabase.from("community_questions").insert({
      author_id: user.id,
      content: composeText.trim(),
      tags: composeTags,
      is_anonymous: composeAnon,
      display_name: composeAnon ? "DRM Member" : (displayName ?? "DRM Member"),
      author_day_in_program: myDay,
    });
    setPosting(false);
    if (error) {
      toast({ title: "Couldn't post", description: error.message, variant: "destructive" });
      return;
    }
    setComposeText(""); setComposeTags([]); setComposeOpen(false);
    toast({ title: "Posted!" });
    await refresh();
  };

  // ----- Post win -----
  const submitWin = async () => {
    if (!user || winLabel.trim().length < 3) return;
    const { error } = await supabase.from("win_posts").insert({
      author_id: user.id,
      milestone_type: "other",
      milestone_label: winLabel.trim(),
      stat_improvement: winStat.trim() || null,
      share_stat: !!winStat.trim(),
      is_anonymous: false,
      display_name: displayName ?? "DRM Member",
      author_day_in_program: myDay,
    });
    if (error) {
      toast({ title: "Couldn't share", description: error.message, variant: "destructive" });
      return;
    }
    setWinLabel(""); setWinStat(""); setWinOpen(false);
    toast({ title: "Shared with the community" });
    await refresh();
  };

  const reactToWin = async (win: WinPost, key: string) => {
    if (!user) return;
    const has = myVotes[win.id]?.has(`reaction:${key}`);
    if (has) return; // one-way reaction
    await supabase.from("community_votes").insert({
      voter_id: user.id, target_id: win.id, target_type: "answer", vote_type: "reaction", reaction_emoji: key,
    });
    const next = { ...win.reaction_counts, [key]: (win.reaction_counts[key] || 0) + 1 };
    await supabase.from("win_posts").update({ reaction_counts: next }).eq("id", win.id);
    if (win.author_id !== user.id) {
      await supabase.rpc("award_helpful_points", { p_user_id: win.author_id, p_amount: 1 });
    }
    // local optimistic
    setMyVotes((m) => ({ ...m, [win.id]: new Set([...(m[win.id] ?? []), `reaction:${key}`]) }));
    setWins((w) => w.map((x) => x.id === win.id ? { ...x, reaction_counts: next } : x));
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="font-heading font-semibold text-2xl text-foreground">Ask</h1>
        <p className="text-sm text-muted-foreground">VITA, the DRM team, and your community.</p>
      </div>

      {/* Layer 1 — VITA Quick Answer */}
      <Card className="p-4 bg-accent-muted border-accent/40">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex gap-2">
              <Input
                value={vitaQ}
                onChange={(e) => setVitaQ(e.target.value)}
                placeholder="Ask VITA anything about your program..."
                onKeyDown={(e) => e.key === "Enter" && askVita()}
              />
              <Button onClick={askVita} disabled={vitaLoading || !vitaQ.trim()}>
                {vitaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
              </Button>
            </div>

            {vitaResponse?.kind === "verified" && (
              <div className="rounded-lg bg-primary-muted border border-primary/30 p-3">
                <p className="text-[11px] uppercase tracking-wide text-primary font-semibold mb-1">
                  VITA found a verified answer from the DRM team
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap mb-2">{vitaResponse.answer}</p>
                {vitaResponse.question_id && (
                  <Button variant="link" className="h-auto p-0 text-primary" asChild>
                    <a href={`#q-${vitaResponse.question_id}`}>Open thread →</a>
                  </Button>
                )}
              </div>
            )}

            {vitaResponse?.kind === "vita" && (
              <div className="rounded-lg bg-card border p-3 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-accent font-semibold">VITA SAYS:</p>
                {vitaResponse.is_medical_question ? (
                  <p className="text-sm">That's a question for your doctor. But the DRM team or community may be able to share their experience here. Want me to post this for you?</p>
                ) : vitaResponse.needs_clarification ? (
                  <p className="text-sm">{vitaResponse.clarification_question}</p>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{vitaResponse.answer}</p>
                )}
                {vitaResponse.related_content_slug && (
                  <Link to={`/app/learn`} className="text-xs text-primary underline">
                    Related: {vitaResponse.related_content_slug}
                  </Link>
                )}
                {(vitaResponse.suggest_community_post || vitaResponse.is_medical_question) && (
                  <Button size="sm" variant="outline" onClick={() => { setComposeText(vitaQ); setComposeOpen(true); }}>
                    Post this to the community →
                  </Button>
                )}
                <p className="text-xs text-muted-foreground pt-1">
                  Still have questions or want the community's experience?{" "}
                  <button className="underline" onClick={() => { setComposeText(vitaQ); setComposeOpen(true); }}>Post it below →</button>
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        {([
          ["hot", "Hot"], ["new", "New"],
          ["unanswered", `Unanswered${unansweredCount ? ` (${unansweredCount})` : ""}`],
          ["wins", "Wins"], ["mine", "My Activity"],
        ] as Array<[Tab, string]>).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 ${tab === k ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground"}`}
          >{label}</button>
        ))}
        <div className="ml-auto flex gap-2 py-1">
          {tab === "wins" ? (
            <Button size="sm" variant="outline" onClick={() => setWinOpen(true)}>
              <Trophy className="h-3.5 w-3.5 mr-1" /> Share a win
            </Button>
          ) : (
            <Button size="sm" onClick={() => setComposeOpen(true)}>+ Ask</Button>
          )}
        </div>
      </div>

      {/* Feed */}
      {tab === "wins" ? (
        <div className="space-y-3">
          {wins.map((w) => (
            <Card key={w.id} className="p-4 bg-accent-muted border-accent/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{w.milestone_label}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.is_anonymous ? "DRM Member" : (w.display_name ?? "DRM Member")} · Day {w.author_day_in_program ?? "—"}
                  </p>
                  {w.share_stat && w.stat_improvement && (
                    <p className="text-sm text-status-normal font-medium mt-2">{w.stat_improvement}</p>
                  )}
                </div>
                <span className="text-2xl">🎉</span>
              </div>
              <div className="flex gap-2 mt-3">
                {REACTIONS.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => reactToWin(w, r.key)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-card border text-sm hover:bg-muted"
                    aria-label={r.label}
                  >
                    <span>{r.emoji}</span>
                    <span className="text-xs text-muted-foreground">{w.reaction_counts?.[r.key] ?? 0}</span>
                  </button>
                ))}
              </div>
            </Card>
          ))}
          {wins.length === 0 && (
            <EmptyState
              title="The wall is empty"
              description="No wins shared yet. Yours could be the first one on this wall."
              posture="encouraging"
            />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleQuestions.map((q) => (
            <QuestionCard
              key={q.id} q={q} myVotes={myVotes} myUserId={user?.id}
              onVote={toggleVote} onRefresh={refresh}
            />
          ))}
          {visibleQuestions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {tab === "unanswered" ? "Nothing unanswered right now ✓" : "Nothing here yet."}
            </p>
          )}
        </div>
      )}

      {/* Compose */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ask the community</DialogTitle></DialogHeader>
          <Textarea
            value={composeText}
            onChange={(e) => setComposeText(e.target.value)}
            placeholder="What's your question?"
            maxLength={500}
            rows={4}
          />
          <div className="text-xs text-muted-foreground text-right">{composeText.length}/500</div>
          <div>
            <p className="text-xs font-medium mb-2">Tags (up to 3)</p>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((t) => {
                const selected = composeTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setComposeTags((s) => selected ? s.filter((x) => x !== t) : (s.length < 3 ? [...s, t] : s))}
                    className={`text-[11px] px-2 py-1 rounded-full border ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-primary-muted text-primary border-transparent"}`}
                  >{t}</button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={composeAnon} onChange={(e) => setComposeAnon(e.target.checked)} />
            Post anonymously (as "DRM Member")
          </label>
          <DialogFooter>
            <Button onClick={submitQuestion} disabled={posting || composeText.trim().length < 10} className="w-full">
              {posting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Post to community
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Win compose */}
      <Dialog open={winOpen} onOpenChange={setWinOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share a win</DialogTitle></DialogHeader>
          <Input value={winLabel} onChange={(e) => setWinLabel(e.target.value)} placeholder="Milestone (e.g. First normal-range reading)" />
          <Input value={winStat} onChange={(e) => setWinStat(e.target.value)} placeholder="Stat improvement (optional, e.g. 148 → 94 mg/dL)" />
          <DialogFooter>
            <Button onClick={submitWin} disabled={winLabel.trim().length < 3} className="w-full">Share</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== Question Card with inline thread ==============
function QuestionCard({
  q, myVotes, myUserId, onVote, onRefresh,
}: {
  q: Question;
  myVotes: Record<string, Set<string>>;
  myUserId: string | undefined;
  onVote: (target_id: string, target_type: "question" | "answer", vote_type: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadAnswers = async () => {
    const { data } = await supabase
      .from("community_answers")
      .select("*")
      .eq("question_id", q.id)
      .order("created_at", { ascending: true });
    setAnswers((data || []) as AnswerRow[]);
  };

  useEffect(() => { if (open) loadAnswers(); }, [open]);

  const sortedAnswers = useMemo(() => {
    const arr = [...answers];
    arr.sort((a, b) => {
      if (a.is_admin_response !== b.is_admin_response) return a.is_admin_response ? -1 : 1;
      if (a.is_vita_response !== b.is_vita_response) return a.is_vita_response ? -1 : 1;
      return b.helpful_count - a.helpful_count;
    });
    return arr;
  }, [answers]);

  const post = async () => {
    if (!myUserId || reply.trim().length < 3) return;
    setSubmitting(true);
    const { error } = await supabase.from("community_answers").insert({
      question_id: q.id,
      author_id: myUserId,
      content: reply.trim(),
      is_anonymous: false,
      display_name: "DRM Member",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Couldn't reply", description: error.message, variant: "destructive" });
      return;
    }
    setReply("");
    await loadAnswers();
    await onRefresh();
  };

  const upvoted = myVotes[q.id]?.has("upvote");
  const metooed = myVotes[q.id]?.has("metoo");
  const unanswered = q.answer_count === 0;

  return (
    <Card id={`q-${q.id}`} className={`p-3 ${unanswered ? "border-l-4 border-l-accent" : ""}`}>
      {q.is_question_of_day && (
        <div className="text-[11px] text-accent font-medium mb-1">⭐ Today's question</div>
      )}
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <button onClick={() => onVote(q.id, "question", "upvote")} className={upvoted ? "text-accent" : "text-muted-foreground"}>
            <ChevronUp className="h-5 w-5" />
          </button>
          <span className="text-[11px] text-muted-foreground">{q.upvote_count}</span>
        </div>
        <div className="flex-1 min-w-0">
          <button className="text-left w-full" onClick={() => setOpen((o) => !o)}>
            <p className="text-sm font-medium text-foreground line-clamp-2">{q.content}</p>
          </button>
          {q.tags?.length > 0 && (
            <div className="flex gap-1 mt-1.5">
              {q.tags.slice(0, 3).map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-muted text-primary">{t}</span>
              ))}
            </div>
          )}
          <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
            <span>{q.is_anonymous ? "DRM Member" : (q.display_name ?? "DRM Member")}</span>
            {q.author_day_in_program && <Badge variant="outline" className="text-[10px]">Day {q.author_day_in_program}</Badge>}
            <span>· {timeAgo(q.created_at)}</span>
            {q.is_verified_answered && <CheckCircle2 className="h-3.5 w-3.5 text-status-normal" />}
          </div>
          {unanswered && <p className="text-[10px] text-accent mt-1">Be first to answer →</p>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="bg-primary text-primary-foreground text-[11px] rounded-full px-2 py-0.5 min-w-[1.5rem] text-center">{q.answer_count}</span>
          <button
            onClick={() => onVote(q.id, "question", "metoo")}
            className={`text-[11px] ${metooed ? "text-accent font-medium" : "text-muted-foreground"}`}
          >
            Me too! {q.metoo_count > 0 && q.metoo_count}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t space-y-2">
          {sortedAnswers.map((a) => (
            <div
              key={a.id}
              className={
                a.is_admin_response
                  ? "p-3 rounded-lg bg-primary-muted border-l-4 border-primary"
                  : a.is_vita_response
                  ? "p-3 rounded-lg bg-accent-muted"
                  : "p-3 rounded-lg bg-muted/40"
              }
            >
              <div className="flex items-center gap-2 mb-1">
                {a.is_admin_response && <span className="text-[11px] font-semibold text-primary">Diabetes Reset Method ✓</span>}
                {a.is_vita_response && <span className="text-[11px] font-semibold text-accent">VITA says:</span>}
                {!a.is_admin_response && !a.is_vita_response && (
                  <span className="text-[11px] text-muted-foreground">
                    {a.is_anonymous ? "DRM Member" : a.display_name ?? "DRM Member"}
                    {a.author_day_in_program ? ` · Day ${a.author_day_in_program}` : ""}
                  </span>
                )}
                {a.is_verified && <CheckCircle2 className="h-3 w-3 text-status-normal" />}
              </div>
              <p className="text-sm whitespace-pre-wrap">{a.content}</p>
              <div className="mt-2 flex items-center gap-3">
                <button onClick={() => onVote(a.id, "answer", "helpful")} className="text-[11px] text-muted-foreground hover:text-primary">
                  Helpful {a.helpful_count > 0 && `(${a.helpful_count})`}
                </button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Share your experience..." />
            <Button size="sm" onClick={post} disabled={submitting || reply.trim().length < 3}>Reply</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
