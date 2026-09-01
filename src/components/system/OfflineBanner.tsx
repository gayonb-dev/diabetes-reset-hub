import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

/**
 * Thin connectivity banner. Shows while offline, then a brief "Back online"
 * confirmation that clears two seconds after reconnection.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    const goOffline = () => {
      setReconnected(false);
      setOffline(true);
    };
    const goOnline = () => {
      setOffline(false);
      setReconnected(true);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    if (!reconnected) return;
    const t = window.setTimeout(() => setReconnected(false), 2000);
    return () => window.clearTimeout(t);
  }, [reconnected]);

  if (!offline && !reconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        offline
          ? "bg-destructive/10 text-destructive px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium"
          : "bg-primary-muted text-primary px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium"
      }
    >
      {offline ? (
        <>
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>You're offline, changes will save once you reconnect.</span>
        </>
      ) : (
        <>
          <Wifi className="h-3.5 w-3.5 shrink-0" />
          <span>Back online.</span>
        </>
      )}
    </div>
  );
}

export default OfflineBanner;
