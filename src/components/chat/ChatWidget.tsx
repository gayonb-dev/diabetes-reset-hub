// Landing page chat widget.
//
// P1: authorization is an opaque server-issued session token. No visitor UUID
// and no local consent flag exist any more.
// P2: while the server AI-health gate is closed, the widget shows the approved
// "unavailable" state — never the normal consent body with a missing button.
// P3: Privacy options include "Delete this chat", which requires the active
// session and revokes it afterwards.

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, ArrowRight, Shield, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Vita } from "@/components/vita/Vita";
import { AI_HEALTH_UNAVAILABLE } from "@/lib/consentCopy";
import { getChatSession, deleteThisChat, clearChatSession } from "@/lib/chatSession";
import { useToast } from "@/hooks/use-toast";

type Cta = { type: "checkout"; label: string; url: string } | null;
type Msg = {
  role: "user" | "assistant";
  content: string;
  cta?: Cta;
  intent?: string;
  health_related?: boolean;
  unavailable?: boolean;
};

const WELCOME =
  "Hi there! I'm VITA. I'm here to help you figure out if the Diabetes Reset Method is the right fit for you. What's going on with your health right now?";

const MEMBERSHIP_WELCOME =
  "Happy to help with the membership, pricing, your login, or finding your way around. What do you need?";

export default function ChatWidget() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [gateLoading, setGateLoading] = useState(false);
  const [aiHealthAvailable, setAiHealthAvailable] = useState<boolean | null>(null);
  const [noticeVersion, setNoticeVersion] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [bubbleOffset, setBubbleOffset] = useState(24);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionToken = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Establish the opaque session (and read the server gate) when the chat opens.
  useEffect(() => {
    if (!open || sessionToken.current || gateLoading) return;
    let cancelled = false;
    setGateLoading(true);
    (async () => {
      const { data } = await supabase.functions.invoke("visitor-session", {
        body: { action: "start" },
      });
      if (cancelled) return;
      if (data?.session_token) {
        // Held in memory for this tab only — never persisted to any browser store.
        sessionToken.current = data.session_token as string;

        setAiHealthAvailable(data.ai_health_available === true);
        setNoticeVersion((data.notice_version as string) ?? null);
      } else {
        // Cannot determine the gate -> treat health AI as unavailable.
        setAiHealthAvailable(false);
      }
      setGateLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, gateLoading]);

  // Dynamic mobile positioning above .sticky-bottom-cta
  useEffect(() => {
    if (!isMobile) {
      setBubbleOffset(24);
      return;
    }
    const compute = () => {
      const el = document.querySelector(".sticky-bottom-cta") as HTMLElement | null;
      if (!el || el.offsetParent === null) {
        setBubbleOffset(24);
      } else {
        setBubbleOffset(el.getBoundingClientRect().height + 16);
      }
    };
    compute();
    window.addEventListener("resize", compute);
    const observer = new MutationObserver(compute);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => {
      window.removeEventListener("resize", compute);
      observer.disconnect();
    };
  }, [isMobile, open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  function handleCtaClick(cta: Cta) {
    if (!cta) return;
    if (cta.url.includes("#") && !cta.url.startsWith("http")) {
      const hash = cta.url.split("#")[1];
      const el = document.getElementById(hash);
      if (el) {
        setOpen(false);
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.open(cta.url, "_blank", "noopener,noreferrer");
  }

  /** Closed gate: continue, membership questions only. No consent is recorded. */
  function continueWithMembership() {
    setStarted(true);
    setMessages([{ role: "assistant", content: MEMBERSHIP_WELCOME }]);
  }

  /** Open gate only: record purpose-keyed consent server-side, then chat. */
  async function acceptConsent() {
    const token = sessionToken.current ?? (await getChatSession());
    if (!token || !noticeVersion) {
      toast({ title: "Couldn't start", description: "Please try again.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.functions.invoke("grant-phi-consent", {
      body: {
        session_token: token,
        purpose_key: "health_ai_processing",
        notice_version: noticeVersion,
      },
    });
    if (error) {
      toast({
        title: "Couldn't record your choice",
        description: "Please try again.",
        variant: "destructive",
      });
      return;
    }
    setStarted(true);
    setMessages([{ role: "assistant", content: WELCOME }]);
  }

  function declineConsent() {
    setDeclined(true);
    setTimeout(() => {
      setOpen(false);
      setDeclined(false);
    }, 2200);
  }

  async function handleDeleteThisChat() {
    setDeleting(true);
    const result = await deleteThisChat();
    setDeleting(false);
    if (!result.ok) {
      toast({
        title: "Couldn't delete this chat",
        description:
          result.error === "no_active_session"
            ? "There's no active chat session to delete."
            : "Please try again.",
        variant: "destructive",
      });
      return;
    }
    sessionToken.current = null;
    clearChatSession();
    setMessages([]);
    setConversationId(undefined);
    setStarted(false);
    setPrivacyOpen(false);
    setOpen(false);
    toast({
      title: "This chat has been deleted.",
      description:
        "Your conversation, messages and consent records for this session were removed and the session was revoked. Records held by outside providers are tracked separately and are not claimed as deleted.",
    });
  }

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");

    try {
      const token = sessionToken.current ?? (await getChatSession());
      if (!token) throw new Error("no active session");
      sessionToken.current = token;

      const { data, error } = await supabase.functions.invoke("chat-agent", {
        body: {
          session_token: token,
          message: text,
          conversation_id: conversationId,
        },
      });
      if (error) throw error;
      if (data?.conversation_id) setConversationId(data.conversation_id);

      if (data?.ai_health_available === false) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: AI_HEALTH_UNAVAILABLE.body,
            unavailable: true,
            health_related: true,
          },
        ]);
        return;
      }

      if (data?.assistant_message) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.assistant_message,
            cta: data.cta ?? null,
            intent: data.intent,
            health_related: !!data.health_related,
          },
        ]);
      }
    } catch (err: unknown) {
      console.error("chat-agent invoke failed", err);
      const e = err as { context?: { error_description?: string; message?: string }; message?: string } | null;
      const detail =
        e?.context?.error_description ||
        e?.context?.message ||
        e?.message ||
        "Unknown error";
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Sorry, I hit a snag (${detail}). Try again in a moment.` },
      ]);
    } finally {
      setSending(false);
    }
  }


  const showPurchaseCard = (m: Msg) =>
    m.role === "assistant" && (m.intent === "purchase_intent" || m.cta);

  return (
    <>
      {/* Trigger button */}
      <button
        aria-label={open ? "Close chat" : "Chat with VITA"}
        onClick={() => setOpen((o) => !o)}
        style={{ bottom: `${bubbleOffset}px` }}
        className={cn(
          "fixed right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "transition-all duration-[250ms] ease-out",
          mounted ? "scale-100 opacity-100" : "scale-[0.2] opacity-0",
        )}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className={cn(
            "fixed z-50 bg-card flex flex-col overflow-hidden shadow-2xl",
            isMobile
              ? "left-0 right-0 bottom-0 rounded-t-[20px] h-[70vh]"
              : "right-6 bottom-6 w-[380px] h-[520px] rounded-t-2xl rounded-b-none",
          )}
        >
          {/* Header */}
          <div className="h-14 px-4 bg-primary text-primary-foreground flex items-center gap-3 shrink-0">
            <Vita size={32} />
            <div className="flex-1 min-w-0 text-center">
              <p className="text-sm font-semibold leading-tight">Hi, I'm VITA.</p>
              <p className="text-[11px] text-primary-foreground/60 leading-tight">
                Powered by Diabetes Reset Method
              </p>
            </div>
            <button
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="text-primary-foreground/80 hover:text-primary-foreground p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          {!started ? (
            <div className="flex-1 overflow-y-auto p-4 bg-background">
              {declined ? (
                <div className="bg-card rounded-xl p-4 text-center text-sm text-foreground">
                  That's okay. If you change your mind, we'll be here.
                </div>
              ) : gateLoading || aiHealthAvailable === null ? (
                <div className="bg-card rounded-xl p-4 text-center text-sm text-muted-foreground">
                  One moment…
                </div>
              ) : aiHealthAvailable === false ? (
                /* Approved unavailable state. Never the normal consent body. */
                <div className="bg-card rounded-xl p-4 space-y-3 shadow-sm">
                  <p className="text-sm font-semibold text-foreground">
                    {AI_HEALTH_UNAVAILABLE.title}
                  </p>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {AI_HEALTH_UNAVAILABLE.body}
                  </p>
                  <button
                    onClick={continueWithMembership}
                    className="w-full h-12 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    {AI_HEALTH_UNAVAILABLE.button}
                  </button>
                </div>
              ) : (
                <div className="bg-card rounded-xl p-4 space-y-3 shadow-sm">
                  <p className="text-sm font-semibold text-foreground">Before we chat:</p>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    What you share here is stored securely. Only you and the Diabetes
                    Reset Method team can see it. Stored for up to 2 years of inactivity,
                    then automatically deleted. You can request full deletion at any time.
                  </p>
                  <button
                    onClick={acceptConsent}
                    className="w-full h-12 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Agree and continue
                  </button>
                  <button
                    onClick={declineConsent}
                    className="w-full text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    No thanks
                  </button>
                </div>
              )}
            </div>
          ) : (

            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-background">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col",
                      m.role === "user" ? "items-end" : "items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-foreground border border-border",
                      )}
                    >
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none [&>*]:my-1">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      )}
                    </div>

                    {/* Health disclaimer */}
                    {m.role === "assistant" && m.health_related && (
                      <p className="text-[11px] text-muted-foreground mt-1 px-1">
                        This is not medical advice. Always consult your healthcare provider.
                      </p>
                    )}

                    {/* Purchase intent CTA card */}
                    {showPurchaseCard(m) && (
                      <div className="mt-3 w-full max-w-[85%] rounded-xl border border-accent bg-accent-muted p-3 space-y-1.5">
                        <p className="text-[15px] font-semibold text-primary">
                          Start the 7-Day Reset — $27
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          Then $67/month. Cancel anytime.
                        </p>
                        <button
                          onClick={() =>
                            handleCtaClick(
                              m.cta ?? {
                                type: "checkout",
                                label: "Begin now",
                                url: `${window.location.origin}/#pricing`,
                              },
                            )
                          }
                          className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors"
                        >
                          Begin now <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-card border border-border rounded-2xl px-4 py-3 text-sm flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" />
                    </div>
                  </div>
                )}
              </div>

              {/* Privacy options */}
              <div className="px-3 pt-2 border-t border-border bg-card shrink-0">
                <button
                  type="button"
                  onClick={() => setPrivacyOpen((v) => !v)}
                  aria-expanded={privacyOpen}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <Shield className="h-3 w-3" /> Privacy options
                </button>
                {privacyOpen && (
                  <div className="mt-2 mb-1 rounded-lg border border-border p-2.5 space-y-2">
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Deleting removes this chat's conversation, messages, consent and
                      derived records, then signs this chat session out. Records held by
                      outside providers are tracked separately and are not claimed as
                      deleted.
                    </p>
                    <button
                      type="button"
                      onClick={handleDeleteThisChat}
                      disabled={deleting}
                      className="w-full h-9 rounded-lg border border-destructive text-destructive text-[12px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deleting ? "Deleting…" : "Delete this chat"}
                    </button>
                  </div>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="p-3 border-t border-border flex gap-2 bg-card shrink-0"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={sending}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
