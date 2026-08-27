import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { calendarDayKey } from "@/lib/calendarDay";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Lock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Vita } from "@/components/vita/Vita";
import { MINDSET_WEEKS, type MindsetWeek } from "@/data/mindsetWeeks";
import { DEFAULT_LEARN_GUIDES, type LearnGuide } from "@/data/learnGuides";
import { useProgramDay } from "@/hooks/useProgramDay";
import { useGamification } from "@/hooks/useGamification";


type BlogPost = {
  id: string;
  title: string;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export default function Learn() {
  const { user } = useAuth();
  const currentProgramDay = useProgramDay();
  const [searchParams] = useSearchParams();
  const requestedGuide = searchParams.get("guide");

  const [activeWeek, setActiveWeek] = useState<MindsetWeek | null>(null);
  const [guides, setGuides] = useState<LearnGuide[]>(DEFAULT_LEARN_GUIDES);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [tab, setTab] = useState(requestedGuide ? "learn" : "mindset");
  const [openGuide, setOpenGuide] = useState<string>(requestedGuide ?? "");
  const headingRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  // Focus/scroll only when the requested guide actually changes (a real
  // navigation or redirect) — never on background data refreshes.
  const lastFocusedGuide = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("content_items")
        .select("id,type,slug,title,summary,body,metadata,created_at")
        .eq("is_active", true)
        .in("type", ["guide", "blog"])
        .order("sort_order");
      if (cancelled || !data) return;

      const guideRows = data.filter((d) => d.type === "guide");
      if (guideRows.length) {
        const overrides = new Map(
          guideRows.map((g) => [g.slug, { slug: g.slug, title: g.title, body: g.body || "" }]),
        );
        setGuides(
          DEFAULT_LEARN_GUIDES.map((g) =>
            overrides.has(g.slug) ? { ...g, ...overrides.get(g.slug)! } : g,
          ),
        );
      }

      const blogs = data.filter((d) => d.type === "blog") as BlogPost[];
      setBlogPosts(blogs);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Deep link: /app/learn?guide=<slug> opens the matching article.
  useEffect(() => {
    if (!requestedGuide) return;
    const exists = guides.some((g) => g.slug === requestedGuide);
    if (!exists) return; // unknown slug — fall back to the normal Guides list
    setTab("learn");
    setOpenGuide(requestedGuide);
    if (lastFocusedGuide.current === requestedGuide) return;
    lastFocusedGuide.current = requestedGuide;
    const t = window.setTimeout(() => {
      const el = headingRefs.current[requestedGuide];
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus({ preventScroll: true });
    }, 120);
    return () => window.clearTimeout(t);
  }, [requestedGuide, guides]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading font-semibold text-2xl text-foreground">
          Learn
        </h1>
        <p className="text-sm text-secondary-fg mt-1">
          Mindset, guides, and curated reads.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="mindset" className="min-h-11">Mindset</TabsTrigger>
          <TabsTrigger value="learn" className="min-h-11">Guides</TabsTrigger>
          {blogPosts.length > 0 && <TabsTrigger value="blog" className="min-h-11">Blog</TabsTrigger>}

        </TabsList>

        {/* MINDSET TAB */}
        <TabsContent value="mindset" className="mt-5">
          <div className="grid lg:grid-cols-2 gap-3">
            {MINDSET_WEEKS.map((w) => {
              const locked = currentProgramDay < w.unlockDay;
              return (
                <Card
                  key={w.weekNumber}
                  className={`p-4 border ${
                    locked
                      ? "bg-muted border-border opacity-80"
                      : "bg-card border-border hover:border-primary/40 cursor-pointer"
                  }`}
                  onClick={() => !locked && setActiveWeek(w)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="label-caps text-accent">
                        Week {w.weekNumber}
                      </p>
                      <h3 className="font-heading font-semibold text-foreground mt-0.5">
                        {w.title.split("—")[1]?.trim() || w.title}
                      </h3>
                      <p className="text-xs text-tertiary-fg mt-1">
                        {w.cards.length} cards
                      </p>
                    </div>
                    {locked && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-tertiary-fg whitespace-nowrap">
                        <Lock className="h-3 w-3" /> Day {w.unlockDay}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* LEARN TAB — accordion */}
        <TabsContent value="learn" className="mt-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2
              ref={guidesHeadingRef}
              tabIndex={-1}
              className="font-heading font-semibold text-lg text-foreground outline-none"
            >
              Guides
            </h2>
            {/* Batch 2 E10 — returning clears the open article, restores the
                list, drops ?guide= from the URL and focuses the Guides heading. */}
            {openGuide && (
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 rounded-lg"
                onClick={returnToGuides}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden /> Return to Guides
              </Button>
            )}
          </div>
          <Accordion
            type="single"
            collapsible
            className="w-full"
            value={openGuide}
            onValueChange={setOpenGuide}
          >
            {guides.map((g) => {
              const locked = g.unlockDay && currentProgramDay < g.unlockDay;
              return (
                <AccordionItem key={g.slug} value={g.slug}>
                  <AccordionTrigger className="text-left">
                    <span className="flex items-center gap-2">
                      {locked && <Lock className="h-3.5 w-3.5 text-tertiary-fg" />}
                      <span
                        className="font-medium text-foreground"
                        tabIndex={-1}
                        ref={(el) => {
                          headingRefs.current[g.slug] = el;
                        }}
                      >
                        {g.title}
                      </span>
                      {g.category && (
                        <span className="text-[11px] text-accent border border-accent/40 rounded px-1.5 py-0.5">
                          {g.category}
                        </span>
                      )}
                      {locked && (
                        <span className="text-[11px] text-tertiary-fg">
                          (Day {g.unlockDay})
                        </span>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {locked ? (
                      <p className="text-sm text-tertiary-fg">
                        Unlocks on Day {g.unlockDay}.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-secondary-fg leading-relaxed whitespace-pre-wrap">
                          {g.body}
                        </p>
                        {g.sourceCard && (
                          <Card className="p-4 border border-border rounded-xl bg-muted/50">
                            <p className="font-heading font-semibold text-sm text-foreground">
                              {g.sourceCard.title}
                            </p>
                            <p className="text-[13px] text-secondary-fg mt-1 leading-relaxed">
                              {g.sourceCard.body}
                            </p>
                            <ul className="mt-2 space-y-1">
                              {g.sourceCard.links.map((l) => (
                                <li key={l.url}>
                                  <a
                                    href={l.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1"
                                  >
                                    {l.label}
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </Card>
                        )}
                        {g.cta && (
                          <Button asChild variant="outline" className="min-h-11 rounded-lg">
                            <Link to={g.cta.to}>{g.cta.label}</Link>
                          </Button>
                        )}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

        </TabsContent>

        {/* BLOG TAB — only when posts exist */}
        {blogPosts.length > 0 && (
        <TabsContent value="blog" className="mt-5 space-y-3">
          <p className="text-sm text-secondary-fg">
            Curated reads from trusted sources.
          </p>
          <div className="space-y-3">
              {blogPosts.map((p) => {
                const meta = (p.metadata || {}) as Record<string, string>;
                const url = meta.url ?? meta.external_url;
                const source = meta.source ?? meta.source_name;
                return (
                  <Card key={p.id} className="p-4 border border-border">
                    <h3 className="font-heading text-base font-semibold text-foreground">
                      {p.title}
                    </h3>
                    {source && (
                      <p className="text-xs text-accent mt-0.5">{source}</p>
                    )}
                    {p.summary && (
                      <p className="text-[13px] text-secondary-fg mt-2">
                        {p.summary}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-[11px] text-tertiary-fg">
                        Curated {new Date(p.created_at).toLocaleDateString()}
                      </p>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1"
                        >
                          Read article <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </Card>
                );
              })}

            </div>
        </TabsContent>
        )}
      </Tabs>

      {activeWeek && (
        <MindsetReader
          week={activeWeek}
          userId={user?.id}
          onClose={() => setActiveWeek(null)}
        />
      )}
    </div>
  );
}

function MindsetReader({
  week,
  userId,
  onClose,
}: {
  week: MindsetWeek;
  userId: string | undefined;
  onClose: () => void;
}) {
  const { recordAction } = useGamification();
  const { timezone } = useAuth();

  const [idx, setIdx] = useState(0);
  const [openedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [completing, setCompleting] = useState(false);
  const totalCards = week.cards.length + (week.assignment ? 1 : 0);
  const isLast = idx === totalCards - 1;

  // Live countdown until the 20-second read gate opens.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const READ_GATE_SECONDS = 20;
  const secondsRemaining = Math.max(0, READ_GATE_SECONDS - Math.floor((now - openedAt) / 1000));
  const canMarkRead = secondsRemaining === 0;

  async function markRead() {
    if (!userId || !canMarkRead) return;
    setCompleting(true);
    const today = calendarDayKey(new Date(), timezone);
    const { error } = await supabase.from("mindset_reads").insert({
      member_id: userId,
      log_date: today,
    });
    if (error && !error.message.includes("duplicate")) {
      toast.error(error.message);
    } else {
      toast.success(
        "Mindset ring closed for today ✓ — you can revisit any card, any time.",
      );
      recordAction("complete_lesson").catch(() => {});
    }
    setCompleting(false);
    onClose();
  }

  const card = idx < week.cards.length ? week.cards[idx] : null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg p-6 bg-card rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <p className="label-caps text-accent">{week.title}</p>
          <p className="text-[11px] text-tertiary-fg">
            {idx + 1} / {totalCards}
          </p>
        </div>

        <div className="flex justify-center mb-4">
          <Vita posture={card?.posture ?? "celebrating"} size={64} />
        </div>

        {card ? (
          <p className="text-[16px] leading-[1.7] text-foreground">{card.body}</p>
        ) : (
          <div>
            <h3 className="font-heading font-semibold text-lg text-primary mb-2">
              Your assignment
            </h3>
            <p className="text-[16px] leading-[1.7] text-foreground">
              {week.assignment}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            disabled={idx === 0}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {isLast ? (
            <Button
              onClick={markRead}
              disabled={!canMarkRead || completing}
              className="bg-primary text-primary-foreground"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {canMarkRead ? "I read this ✓" : `Read time: ${secondsRemaining}s`}
            </Button>
          ) : (
            <Button
              onClick={() => setIdx((i) => Math.min(totalCards - 1, i + 1))}
              variant="ghost"
              className="text-accent font-semibold"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

