// Self-serve privacy page.
//
// P1/P3: the legacy anonymous-ID deletion endpoint is retired. Deleting an
// anonymous chat requires the active server-issued session, and member data
// deletion runs through the authenticated, reauthenticated account-deletion
// lifecycle in Settings.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { deleteThisChat, clearChatSession, hasChatSession } from "@/lib/chatSession";

export default function Privacy() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  async function handleDeleteChat() {
    if (!hasChatSession()) {
      setDone(true);
      return;
    }
    setBusy(true);
    const result = await deleteThisChat();
    setBusy(false);
    if (!result.ok) {
      toast({
        title: "Couldn't delete this chat",
        description:
          result.error === "no_active_session"
            ? "There's no active chat session in this browser."
            : "Please try again or email support.",
        variant: "destructive",
      });
      return;
    }
    clearChatSession();
    setDone(true);
    toast({
      title: "This chat has been deleted.",
      description:
        "The conversation, messages, consent and derived records for this session were removed and the session was revoked.",
    });
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Your data & privacy</h1>
          <p className="text-muted-foreground">
            Educational content only, not medical advice. We treat anything you share like it
            matters — because it does.
          </p>
        </header>

        <section className="space-y-3 rounded-xl border border-border p-5 bg-card">
          <h2 className="font-semibold">What we store</h2>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Your chat messages with our assistant.</li>
            <li>Anything you choose to share (goals, questions, membership details).</li>
            <li>
              A short-lived chat session that exists only for the current browser tab. We no longer
              keep a persistent visitor ID.
            </li>
          </ul>
        </section>

        <section className="space-y-3 rounded-xl border border-border p-5 bg-card">
          <h2 className="font-semibold">Retention</h2>
          <p className="text-sm text-muted-foreground">
            All personal health information is deleted after{" "}
            <strong>730 days (2 years) of inactivity</strong>. The clock resets every time you chat
            with us, log in, or make a purchase.
          </p>
        </section>

        <section className="space-y-3 rounded-xl border border-border p-5 bg-card">
          <h2 className="font-semibold">Delete this chat</h2>
          <p className="text-sm text-muted-foreground">
            Removes the conversation, messages, consent and derived records for your current chat
            session and signs that session out. Records held by outside providers are tracked
            separately and are not claimed as deleted. Cannot be undone.
          </p>
          {done ? (
            <p className="text-sm font-medium text-primary">
              Deleted. You can close this page or{" "}
              <Link to="/" className="underline">
                go back home
              </Link>
              .
            </p>
          ) : (
            <Button onClick={handleDeleteChat} disabled={busy} variant="destructive">
              {busy ? "Deleting…" : "Delete this chat"}
            </Button>
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-border p-5 bg-card">
          <h2 className="font-semibold">Member account & export</h2>
          <p className="text-sm text-muted-foreground">
            If you have a membership, exporting or deleting your account happens in{" "}
            <Link to="/app/settings" className="underline">
              Settings
            </Link>
            . Both require a recent sign-in for your protection.
          </p>
        </section>
      </div>
    </main>
  );
}
