import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, CheckCircle2, Loader2, Bot, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

type Category = "Bug" | "Question" | "Feedback" | "Billing";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export default function Support() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("Bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  async function askAssistant() {
    const q = chatInput.trim();
    if (!q || chatSending) return;
    const nextHistory: ChatTurn[] = [...chat, { role: "user", content: q }];
    setChat(nextHistory);
    setChatInput("");
    setChatSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("support-assistant", {
        body: { messages: nextHistory },
      });
      if (error) {
        let detail = (error as Error).message;
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const body = await ctx.text();
            if (body) detail = body.slice(0, 400);
          } catch {
            /* ignore */
          }
        }
        throw new Error(detail);
      }
      const reply = (data?.reply as string) || "Sorry — I didn't catch that. Try again.";
      setChat((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setChat((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn't reach the assistant. Try again, or use **Report an issue** below to send a support ticket.",
        },
      ]);
      toast({
        title: "Assistant unavailable",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setChatSending(false);
      requestAnimationFrame(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  function openDialog(cat: Category) {
    setCategory(cat);
    setMessage("");
    setSent(false);
    setOpen(true);
  }

  async function submit() {
    if (message.trim().length < 5) {
      toast({
        title: "Add a bit more detail",
        description: "A few sentences helps us help you faster.",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("support-request", {
        body: {
          category,
          message: message.trim(),
          pageContext: `${location.pathname}${location.search}`,
          userAgent: navigator.userAgent,
        },
      });
      if (error) {
        let detail = (error as Error).message;
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const body = await ctx.text();
            if (body) detail = body.slice(0, 400);
          } catch {
            /* ignore */
          }
        }
        throw new Error(detail);
      }
      setSent(true);
    } catch (e) {
      toast({
        title: "Couldn't send — try emailing info@diabetesresetmethod.com",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold text-primary">We're here to help.</h1>
        <div className="my-4 inline-flex h-16 w-16 rounded-full bg-accent items-center justify-center text-accent-foreground">
          <Sparkles className="h-8 w-8" />
        </div>
        <p className="text-sm text-muted-foreground">Ask the assistant, or send a ticket.</p>
      </div>

      {/* Support assistant chat */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Support assistant</p>
        </div>
        <h2 className="text-base font-semibold">Ask a question about the app</h2>
        <p className="text-sm text-muted-foreground">
          Where's my meal plan? How do I log water? The assistant answers app navigation and how-to questions.
          For medical questions, ask your doctor.
        </p>

        <div
          ref={chatScrollRef}
          className="min-h-[80px] max-h-[280px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 space-y-3"
        >
          {chat.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Try: "Where do I regenerate my meal plan?"
            </p>
          )}
          {chat.map((turn, i) => (
            <div
              key={i}
              className={
                turn.role === "user"
                  ? "text-sm text-foreground ml-6 bg-primary-muted rounded-md px-3 py-2"
                  : "text-sm text-foreground mr-6 bg-background border border-border rounded-md px-3 py-2 prose prose-sm max-w-none"
              }
            >
              {turn.role === "assistant" ? <ReactMarkdown>{turn.content}</ReactMarkdown> : turn.content}
            </div>
          ))}
          {chatSending && (
            <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                askAssistant();
              }
            }}
            placeholder="Ask about the app…"
            disabled={chatSending}
          />
          <Button onClick={askAssistant} disabled={chatSending || !chatInput.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">App Issues</p>
        <h2 className="text-base font-semibold">Something not working right?</h2>
        <p className="text-sm text-muted-foreground">
          Report bugs, crashes, billing questions, or anything behaving unexpectedly.
        </p>
        <p className="text-xs text-accent">⏱ We respond within 24 hours.</p>
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => openDialog("Bug")}
        >
          Report an issue →
        </Button>
        <p className="text-xs text-muted-foreground text-center pt-1 select-text">
          or email info@diabetesresetmethod.com
        </p>
      </Card>

      <Card className="p-5 space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Program Questions</p>
        <h2 className="text-base font-semibold">Have a question about how the program works?</h2>
        <p className="text-sm text-muted-foreground">
          Questions about meals, workouts, blood sugar, IF, supplements — ask the community and VITA
          for the fastest answer.
        </p>
        <Button
          variant="outline"
          className="w-full border-primary text-primary"
          onClick={() => navigate("/app/ask")}
        >
          Ask the community →
        </Button>
      </Card>

      <Dialog open={open} onOpenChange={(v) => !sending && setOpen(v)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{sent ? "Message sent ✓" : "Contact support"}</DialogTitle>
          </DialogHeader>

          {sent ? (
            <div className="py-4 text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Thanks — we got it. You'll hear back at{" "}
                <span className="font-medium text-foreground">{user?.email}</span> within 24 hours.
              </p>
              <Button onClick={() => setOpen(false)} className="w-full">
                Close
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Category</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as Category)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bug">Bug</SelectItem>
                      <SelectItem value="Question">Question</SelectItem>
                      <SelectItem value="Feedback">Feedback</SelectItem>
                      <SelectItem value="Billing">Billing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Message</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 5000))}
                    rows={6}
                    placeholder="Tell us what's going on…"
                    className="mt-1.5"
                    autoFocus
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    We'll include your email, member ID, program day, and current page.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
                  Cancel
                </Button>
                <Button onClick={submit} disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    "Send"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
