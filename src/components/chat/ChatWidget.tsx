// Landing page chat widget — Section 17 of the DRM spec.
// PHI consent gate upfront. VITA voice. Purchase-intent CTA card.
// Medical-question refusal + health disclaimer come from the chat-agent edge
// function response. Does not touch any other element on the landing page.

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Vita } from "@/components/vita/Vita";

const ANON_KEY = "drm_visitor_id";
const CONSENT_KEY = "drm_landing_chat_consent";

type Cta = { type: "checkout"; label: string; url: string } | null;
type Msg = {
  role: "user" | "assistant";
  content: string;
  cta?: Cta;
  intent?: string;
  health_related?: boolean;
};

const WELCOME =
  "Hi there! I'm VITA. I'm here to help you figure out if the Diabetes Reset Method is the right fit for you. What's going on with your health right now?";

function getOrCreateAnonId(): string {
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

export default function ChatWidget() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [consented, setConsented] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem(CONSENT_KEY) === "1",
  );
  const [declined, setDeclined] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [bubbleOffset, setBubbleOffset] = useState(24);
  const scrollRef = useRef<HTMLDivElement>(null);
  const anonId = useRef(getOrCreateAnonId());

  useEffect(() => {
    setMounted(true);
  }, []);

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

  function acceptConsent() {
    localStorage.setItem(CONSENT_KEY, "1");
    setConsented(true);
    setMessages([{ role: "assistant", content: WELCOME }]);
  }

  function declineConsent() {
    setDeclined(true);
    setTimeout(() => {
      setOpen(false);
      setDeclined(false);
    }, 2200);
  }

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");

    try {
      const { data, error } = await supabase.functions.invoke("chat-agent", {
        body: {
          anonymous_id: anonId.current,
          message: text,
          conversation_id: conversationId,
        },
      });
      if (error) throw error;
      if (data?.conversation_id) setConversationId(data.conversation_id);

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
    } catch (e: any) {
      console.error("chat-agent invoke failed", e);
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
          {!consented ? (
            <div className="flex-1 overflow-y-auto p-4 bg-background">
              {declined ? (
                <div className="bg-card rounded-xl p-4 text-center text-sm text-foreground">
                  That's okay. If you change your mind, we'll be here.
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
                    I understand, let's chat
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
