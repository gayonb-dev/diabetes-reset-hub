// Phase A3: Self-serve privacy / data deletion page.
// Anyone (anonymous or authenticated) can purge their chat history + PHI.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const ANON_KEY = "drm_visitor_id";

export default function Privacy() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  async function handleDelete() {
    const anonId = localStorage.getItem(ANON_KEY);
    if (!anonId) {
      setDone(true);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("request-data-deletion", {
        body: { anonymous_id: anonId },
      });
      if (error) throw error;
      localStorage.removeItem(ANON_KEY);
      setDone(true);
      toast({ title: "Done.", description: "Your conversation history has been purged." });
    } catch (e) {
      console.error(e);
      toast({
        title: "Couldn't delete",
        description: "Please try again or email support.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Your data & privacy</h1>
          <p className="text-muted-foreground">
            Coaching is not medical advice. We treat anything you share like it matters — because it does.
          </p>
        </header>

        <section className="space-y-3 rounded-xl border border-border p-5 bg-card">
          <h2 className="font-semibold">What we store</h2>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Your chat messages with our coaching assistant.</li>
            <li>Anything you choose to share (health details, goals, questions).</li>
            <li>A persistent visitor ID so we recognize you across sessions.</li>
          </ul>
        </section>

        <section className="space-y-3 rounded-xl border border-border p-5 bg-card">
          <h2 className="font-semibold">Retention</h2>
          <p className="text-sm text-muted-foreground">
            All personal health information is automatically deleted after{" "}
            <strong>730 days (2 years) of inactivity</strong>. The clock resets every time you chat
            with us, log in, or make a purchase.
          </p>
        </section>

        <section className="space-y-3 rounded-xl border border-border p-5 bg-card">
          <h2 className="font-semibold">Delete everything now</h2>
          <p className="text-sm text-muted-foreground">
            One click. Purges your chat history, classifier data, and consent records from this
            browser. Cannot be undone.
          </p>
          {done ? (
            <p className="text-sm font-medium text-primary">
              Purged. You can close this page or{" "}
              <Link to="/" className="underline">
                go back home
              </Link>
              .
            </p>
          ) : (
            <Button onClick={handleDelete} disabled={busy} variant="destructive">
              {busy ? "Deleting…" : "Delete my data"}
            </Button>
          )}
        </section>
      </div>
    </main>
  );
}
