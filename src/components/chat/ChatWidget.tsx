// Phase A2 chat widget — floating bubble with PHI consent gate + CTA button.
// On mobile, the bubble lifts above the sticky bottom CTA so they don't overlap.

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const ANON_KEY = "drm_visitor_id";

type Cta = { type: "checkout"; label: string; url: string } | null;
type Msg = { role: "user" | "assistant"; content: string; cta?: Cta };

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
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hey — quick question to start: are you here for yourself, or someone else with type 2?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const anonId = useRef(getOrCreateAnonId());

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function handleCtaClick(cta: Cta) {
    if (!cta) return;
    // In-page hash → smooth scroll; otherwise open in a new tab.
    if (cta.url.includes("#")) {
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

      if (data?.needs_phi_consent) {
        setNeedsConsent(true);
        setPendingMessage(text);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.assistant_message },
        ]);
      } else if (data?.assistant_message) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.assistant_message, cta: data.cta ?? null },
        ]);
      }
    } catch (e) {
      console.error(e);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, I hit a snag. Try again in a moment." },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function grantConsentAndResend() {
    setSending(true);
    try {
      await supabase.functions.invoke("grant-phi-consent", {
        body: { anonymous_id: anonId.current },
      });
      setNeedsConsent(false);
      const toResend = pendingMessage;
      setPendingMessage(null);
      if (toResend) {
        const { data } = await supabase.functions.invoke("chat-agent", {
          body: {
            anonymous_id: anonId.current,
            message: toResend,
            conversation_id: conversationId,
          },
        });
        if (data?.assistant_message) {
          setMessages((m) => [
            ...m,
            { role: "assistant", content: data.assistant_message, cta: data.cta ?? null },
          ]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  // On mobile (where StickyBottomCTA shows), lift the bubble + panel above it.
  const bubbleBottom = isMobile ? "bottom-24" : "bottom-6";
  const panelBottom = isMobile ? "bottom-44" : "bottom-24";

  return (
    <>
      <button
        aria-label={open ? "Close chat" : "Open chat"}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-primary text-primary-foreground flex items-center justify-center",
          "hover:scale-105 transition-transform",
          bubbleBottom,
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div
          className={cn(
            "fixed right-6 z-50 w-[min(380px,calc(100vw-3rem))] h-[min(560px,calc(100vh-12rem))]",
            "bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden",
            panelBottom,
          )}
        >
          <div className="px-4 py-3 border-b border-border bg-primary text-primary-foreground">
            <p className="font-semibold text-sm">The Diabetes Reset Method</p>
            <p className="text-xs opacity-90">Educational, not medical advice</p>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
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
                {m.role === "assistant" && m.cta && (
                  <Button
                    size="sm"
                    onClick={() => handleCtaClick(m.cta!)}
                    className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    {m.cta.label}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-2xl px-4 py-3 text-sm flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-foreground/50 animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {needsConsent ? (
            <div className="p-3 border-t border-border bg-muted/40 space-y-2">
              <p className="text-xs text-muted-foreground leading-snug">
                Stored securely. Only you and our care team see it. Deletable anytime. Auto-purged
                after 2 years of inactivity.
              </p>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={grantConsentAndResend} disabled={sending}>
                  I agree, continue
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNeedsConsent(false);
                    setPendingMessage(null);
                    setMessages((m) => [
                      ...m,
                      {
                        role: "assistant",
                        content:
                          "No problem. Ask me anything that doesn't involve sharing personal health details.",
                      },
                    ]);
                  }}
                  disabled={sending}
                >
                  Not now
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="p-3 border-t border-border flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={sending}
                autoFocus
              />
              <Button type="submit" size="icon" disabled={sending || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
