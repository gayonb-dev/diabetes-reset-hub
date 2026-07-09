import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useGamificationProfile } from "@/hooks/useGamificationProfile";
import BadgeGallery from "@/components/gamification/BadgeGallery";
import StreakHistoryModal from "@/components/gamification/StreakHistoryModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles, Heart, Flame, CalendarCheck } from "lucide-react";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function initialsOf(email?: string) {
  if (!email) return "U";
  return email.slice(0, 2).toUpperCase();
}

export default function Profile() {
  const { user, subscription } = useAuth();
  const currentProgramDay = useMemo(() => {
    const start = subscription?.created_at ? new Date(subscription.created_at) : new Date();
    const diff = Math.floor(
      (startOfDay(new Date()).getTime() - startOfDay(start).getTime()) / 86400000,
    );
    return Math.max(diff + 1, 1);
  }, [subscription]);

  const g = useGamificationProfile(currentProgramDay);
  const [showStreak, setShowStreak] = useState(false);

  const [activity, setActivity] = useState({
    workouts: 0,
    bsReadings: 0,
    measurements: 0,
    questionsAsked: 0,
    answersGiven: 0,
  });
  const [recentCommunity, setRecentCommunity] = useState<Array<{ id: string; kind: "q" | "a"; content: string; at: string }>>([]);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const sb: any = supabase;
    (async () => {
      const workoutRes = await sb
        .from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed");
      const bsRes = await sb
        .from("blood_sugar_readings")
        .select("id", { count: "exact", head: true })
        .eq("member_id", user.id);
      const measRes = await sb
        .from("member_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .contains("metadata", { kind: "measurement" });
      const qRes = await sb
        .from("community_questions")
        .select("id, content, created_at", { count: "exact" })
        .eq("author_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);
      const aRes = await sb
        .from("community_answers")
        .select("id, content, created_at", { count: "exact" })
        .eq("author_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);
      const profRes = await sb
        .from("visitor_profiles")
        .select("community_display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      setActivity({
        workouts: workoutRes.count ?? 0,
        bsReadings: bsRes.count ?? 0,
        measurements: measRes.count ?? 0,
        questionsAsked: qRes.count ?? 0,
        answersGiven: aRes.count ?? 0,
      });
      const recents = [
        ...((qRes.data || []) as any[]).map((r) => ({ id: r.id, kind: "q" as const, content: r.content, at: r.created_at })),
        ...((aRes.data || []) as any[]).map((r) => ({ id: r.id, kind: "a" as const, content: r.content, at: r.created_at })),
      ]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 5);
      setRecentCommunity(recents);
      setDisplayName(profRes.data?.community_display_name ?? null);
    })();
  }, [user]);

  const compliantDays = useMemo(() => {
    // approximate: streak history total + current
    const past = g.streak_history.reduce((sum, s) => sum + (s.length || 0), 0);
    return past + g.streak_count;
  }, [g.streak_history, g.streak_count]);

  const hasCommunity = activity.questionsAsked > 0 || activity.answersGiven > 0;
  const displayedName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Member";

  return (
    <div className="max-w-[880px] mx-auto space-y-5 animate-fade-in">
      {/* Hero */}
      <Card className="bg-primary text-primary-foreground border-0 p-6 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="h-[72px] w-[72px] rounded-full border-[3px] border-white/90 bg-primary-muted text-primary flex items-center justify-center text-2xl font-bold shrink-0">
            {initialsOf(user?.email)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-[22px] font-semibold text-white truncate">{displayedName}</h1>
            <span className="inline-block mt-1 bg-accent text-foreground text-[11px] font-medium px-2 py-0.5 rounded-full">
              Level {g.level}
            </span>
            <p className="text-[13px] text-white/70 mt-2">Day {currentProgramDay} in program</p>
            {displayName && displayName !== displayedName && (
              <p className="text-[12px] text-white/55 mt-1">Community: {displayName}</p>
            )}
          </div>
          <Link to="/app/settings">
            <Button variant="outline" size="sm" className="bg-transparent border-white/40 text-white hover:bg-white/10">
              Edit profile
            </Button>
          </Link>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Flame className="h-4 w-4" />} value={g.streak_count} label="day streak" color="text-accent" />
        <StatCard icon={<Sparkles className="h-4 w-4" />} value={g.reset_points} label="reset pts" color="text-primary" />
        <StatCard icon={<Heart className="h-4 w-4" />} value={g.helpful_points} label="helpful pts" color="text-accent" />
        <StatCard icon={<CalendarCheck className="h-4 w-4" />} value={compliantDays} label="compliant days" color="text-primary" />
      </div>

      {/* Activity summary */}
      <Card className="p-5 border border-border">
        <p className="text-sm font-medium text-foreground mb-3">Activity summary</p>
        <dl className="space-y-2 text-sm">
          <Row label="Workouts completed" value={activity.workouts} />
          <Row label="Blood sugar readings" value={activity.bsReadings} />
          <Row label="Measurements logged" value={activity.measurements} />
          <Row label="Current program phase" value={g.current_program_phase} />
          <Row label="All-time longest streak" value={
            Math.max(g.streak_count, ...g.streak_history.map((s) => s.length || 0), 0)
          } />
        </dl>
      </Card>

      <BadgeGallery category="program" title="Program badges" earnedSlugs={g.badges_earned} />
      {hasCommunity && (
        <BadgeGallery category="community" title="Community badges" earnedSlugs={g.community_badges_earned} />
      )}

      {recentCommunity.length > 0 && (
        <Card className="p-5 border border-border">
          <p className="text-sm font-medium text-foreground mb-3">Your community activity</p>
          <div className="divide-y divide-border">
            {recentCommunity.map((r) => (
              <div key={r.id} className="py-2.5">
                <p className="text-[11px] uppercase tracking-wider text-tertiary-fg">
                  {r.kind === "q" ? "Question asked" : "Answer given"} · {new Date(r.at).toLocaleDateString()}
                </p>
                <p className="text-sm text-foreground line-clamp-2">{r.content}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <StreakHistoryModal
        open={showStreak}
        onClose={() => setShowStreak(false)}
        currentStreak={g.streak_count}
        freezeAvailable={g.streak_freeze_available}
        startDate={g.last_ring_close_at}
        history={g.streak_history}
      />
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <Card className="p-3 border border-border text-center">
      <div className={`flex items-center justify-center gap-1 ${color}`}>
        {icon}
        <span className="text-2xl font-bold tabular-nums">{value}</span>
      </div>
      <p className="text-[11px] text-tertiary-fg mt-1">{label}</p>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground tabular-nums">{value}</dd>
    </div>
  );
}
