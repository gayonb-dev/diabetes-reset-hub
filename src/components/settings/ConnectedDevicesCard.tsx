// Settings → Connected Devices. Currently: Dexcom (sandbox) auto-sync.
// Apple Health / other meters are called out as coming with the mobile app — no promise here.

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Activity, RefreshCw, Unplug } from "lucide-react";
import { useDexcomConnection } from "@/hooks/useDexcomConnection";

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function ConnectedDevicesCard() {
  const { status, loading, busy, connect, syncNow, disconnect } = useDexcomConnection();

  return (
    <Card className="p-5 border border-border">
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-full bg-primary-muted p-2 text-primary">
          <Activity className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold">Connected Devices</h2>
          <p className="text-[12px] text-muted-foreground">
            Auto-sync your blood sugar from a CGM instead of typing every reading.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Dexcom CGM</p>
              {status?.environment === "sandbox" && (
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-accent-muted text-accent-foreground border border-accent/40">
                  Sandbox
                </span>
              )}
            </div>
            {loading ? (
              <p className="text-[12px] text-muted-foreground mt-0.5">Checking status…</p>
            ) : status?.connected ? (
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Connected · last synced {formatRelative(status.last_sync_at)}
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground mt-0.5">Not connected</p>
            )}
            {status?.last_sync_error && (
              <p className="text-[11px] text-destructive mt-1">
                Last sync error: {status.last_sync_error}
              </p>
            )}
          </div>
          {status?.connected ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={syncNow} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                <span className="ml-1.5 text-xs">Sync now</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={disconnect} disabled={busy}>
                <Unplug className="h-3.5 w-3.5" />
                <span className="ml-1.5 text-xs">Disconnect</span>
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={connect} disabled={busy || loading}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              <span className={busy ? "ml-1.5" : ""}>Connect Dexcom</span>
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Apple Health and other meters are coming with our mobile app release.
        </p>
      </div>
    </Card>
  );
}
