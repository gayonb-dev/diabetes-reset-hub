import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  template_key: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export function NotificationsBell({
  variant = "dark",
}: {
  variant?: "dark" | "light";
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, template_key, title, body, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifs();
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setItems((prev) => [payload.new as Notification, ...prev]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifs]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;
    const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id);
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
    setItems((prev) =>
      prev.map((n) =>
        n.read_at ? n : { ...n, read_at: new Date().toISOString() },
      ),
    );
  };

  const iconColor =
    variant === "dark" ? "text-white/70 hover:text-white" : "text-foreground";

  return (
    <Popover onOpenChange={(open) => open && fetchNotifs()}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`relative p-1.5 rounded-md transition-colors ${iconColor}`}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-accent text-[10px] font-semibold rounded-full text-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0 bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] h-auto py-1"
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {loading && items.length === 0 ? (
            <p className="text-xs text-muted-foreground p-6 text-center">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="text-xs text-muted-foreground p-6 text-center">
              No notifications yet. VITA will reach out when there's something
              important.
            </p>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-border/60 ${
                  !n.read_at ? "bg-accent/5" : ""
                }`}
              >
                <p className="text-[13px] leading-snug text-foreground">
                  {n.body}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
