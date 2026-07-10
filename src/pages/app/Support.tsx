import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Category = "Bug" | "Question" | "Feedback" | "Billing";

export default function Support() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("Bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

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
        // Surface the real error body from the edge function when available.
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
        <p className="text-sm text-muted-foreground">Choose what you need help with below.</p>
      </div>

      <Card className="p-5 space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">App Issues</p>
        <h2 className="text-base font-semibold">Something not working right?</h2>
        <p className="text-sm text-muted-foreground">
          Report bugs, crashes, or anything behaving unexpectedly in the app.
        </p>
        <p className="text-xs text-accent">⏱ We respond to app issues within 24 hours.</p>
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
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Billing</p>
        <h2 className="text-base font-semibold">Questions about your subscription?</h2>
        <p className="text-sm text-muted-foreground">
          Payment issues, plan changes, or anything billing-related.
        </p>
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => openDialog("Billing")}
        >
          Contact billing support →
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
