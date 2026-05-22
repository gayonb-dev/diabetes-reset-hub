import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function Login() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const expired = params.get("expired") === "1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email.trim())) {
      setError("Please enter a valid email.");
      return;
    }
    setSending(true);
    try {
      await supabase.functions.invoke("send-magic-link", {
        body: { email: email.trim().toLowerCase() },
      });
      setSent(true);
    } catch {
      setSent(true); // Always succeed visually
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-md bg-card border-2 border-primary/20 rounded-2xl shadow-xl p-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-1 text-center">
          The Diabetes Reset Method
        </p>
        <h1 className="font-heading font-bold text-2xl text-center mb-2">Log in to your dashboard</h1>
        <p className="text-center text-muted-foreground mb-6 text-sm">
          We'll email you a secure one-click login link.
        </p>

        {expired && !sent && (
          <div className="bg-secondary/40 border border-secondary rounded-lg p-3 mb-4 text-sm text-secondary-foreground">
            Your previous login link expired or your membership is no longer active. Enter your email
            for a new link.
          </div>
        )}

        {sent ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-3" />
            <h2 className="font-bold text-lg mb-2">Check your email</h2>
            <p className="text-muted-foreground text-sm">
              If <strong>{email}</strong> is registered, a login link is on its way. Check your inbox
              (and spam folder).
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="h-12"
            />
            <Button
              type="submit"
              disabled={sending}
              className="w-full bg-primary hover:bg-primary-dark text-primary-foreground py-3 font-bold h-12"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                "Email me a login link"
              )}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Not a member yet?{" "}
          <Link to="/#pricing" className="text-primary font-semibold hover:underline">
            Start the 5-Day Reset
          </Link>
        </div>
      </div>
    </div>
  );
}
