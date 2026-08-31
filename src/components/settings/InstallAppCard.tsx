import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, CheckCircle2 } from "lucide-react";

/**
 * Add to Home Screen — online-first installability.
 * Manifest + icons only: no service worker, no offline cache, so nothing
 * member data related is ever stored by the browser for offline use.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallAppCard() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const isApple =
    typeof navigator !== "undefined" && /iphone|ipad|ipod|macintosh/i.test(navigator.userAgent);

  return (
    <Card className="p-5 border-border rounded-xl shadow-warm">
      <h2 className="font-heading font-semibold text-base text-foreground mb-1 flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-primary" /> Add to Home Screen
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Install the membership as an app icon on your phone or desktop. It still needs an internet
        connection — nothing is stored on your device for offline use.
      </p>

      {installed ? (
        <p className="text-sm text-primary flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> You're using the installed app.
        </p>
      ) : deferred ? (
        <Button
          className="h-11 rounded-lg"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          }}
        >
          Install app
        </Button>
      ) : isApple ? (
        <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
          <li>Tap the Share button in Safari.</li>
          <li>
            Choose <span className="text-foreground">Add to Home Screen</span>, or{" "}
            <span className="text-foreground">Open as Web App</span> where your device offers it.
          </li>
          <li>Tap Add, then open the new icon.</li>
        </ol>
      ) : (
        <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
          <li>Open your browser menu.</li>
          <li>
            Choose <span className="text-foreground">Install app</span> or{" "}
            <span className="text-foreground">Add to Home screen</span>.
          </li>
          <li>Confirm, then open the new icon.</li>
        </ol>
      )}
    </Card>
  );
}

export default InstallAppCard;
