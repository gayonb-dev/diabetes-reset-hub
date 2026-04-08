import { useState, useEffect } from "react";
import { Trophy, Droplets, Zap, Smile, Send, CheckCircle2, Star, Calendar, ClipboardList, TrendingUp, ArrowRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DAYS = [
  { day: 1, title: "Clarity & Goals", description: "Discovery session — your goals, frustrations, and vision" },
  { day: 2, title: "Hydration & Habits", description: "Building your water habit and understanding blood sugar basics" },
  { day: 3, title: "Food & Plate Method", description: "Learning the plate method and making simple swaps" },
  { day: 4, title: "Movement & Mindset", description: "Adding safe movement and reframing your relationship with food" },
  { day: 5, title: "Momentum & Next Steps", description: "Reviewing your wins and planning your continued transformation" },
];

const MOODS = [
  { value: 1, emoji: "😫", label: "Struggling" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "😊", label: "Good" },
  { value: 5, emoji: "🔥", label: "Amazing" },
];

interface DayEntry {
  day_number: number;
  win_text: string;
  mood_rating: number | null;
  energy_rating: number | null;
  water_glasses: number;
}

const ProgressTracker = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const { toast } = useToast();

  const [emailInput, setEmailInput] = useState(emailParam);
  const [email, setEmail] = useState(emailParam);
  const [isLoaded, setIsLoaded] = useState(false);
  const [entries, setEntries] = useState<Record<number, DayEntry>>({});
  const [activeDay, setActiveDay] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summarySent, setSummarySent] = useState(false);

  const [winText, setWinText] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [water, setWater] = useState(0);

  useEffect(() => {
    if (emailParam) loadProgress();
  }, []);

  useEffect(() => {
    const existing = entries[activeDay];
    if (existing) {
      setWinText(existing.win_text);
      setMood(existing.mood_rating);
      setEnergy(existing.energy_rating);
      setWater(existing.water_glasses);
    } else {
      setWinText("");
      setMood(null);
      setEnergy(null);
      setWater(0);
    }
  }, [activeDay, entries]);

  const sendSummaryEmail = async (targetEmail: string) => {
    if (summarySent) return;
    setSummarySent(true);
    try {
      await supabase.functions.invoke("send-progress-summary", {
        body: { email: targetEmail },
      });
    } catch (err) {
      console.error("Failed to send summary to coach:", err);
    }
  };

  const loadProgress = async () => {
    const currentEmail = emailInput.toLowerCase().trim();
    if (!currentEmail) return;
    setEmail(currentEmail);
    const { data } = await supabase
      .from("challenge_progress")
      .select("*")
      .eq("email", currentEmail);

    if (data) {
      const map: Record<number, DayEntry> = {};
      data.forEach((row: any) => {
        map[row.day_number] = row;
      });
      setEntries(map);
      const completedCount = Object.keys(map).length;
      if (completedCount === 5) {
        setShowSummary(true);
        sendSummaryEmail(currentEmail);
      } else {
        const completed = Object.keys(map).map(Number);
        const nextDay = completed.length > 0 ? Math.min(Math.max(...completed) + 1, 5) : 1;
        setActiveDay(nextDay);
      }
    }
    setIsLoaded(true);
  };

  const handleSave = async () => {
    if (!email && !emailInput.trim()) {
      toast({ title: "Email required", description: "Please enter the email you used at checkout.", variant: "destructive" });
      return;
    }
    if (!winText.trim()) {
      toast({ title: "Share your win!", description: "Write at least one win or takeaway from today.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const currentEmail = email || emailInput.toLowerCase().trim();
    const payload = {
      email: currentEmail,
      day_number: activeDay,
      win_text: winText.trim(),
      mood_rating: mood,
      energy_rating: energy,
      water_glasses: water,
    };

    // Use upsert with the unique constraint
    const { error } = await supabase
      .from("challenge_progress")
      .upsert(payload, { onConflict: "email,day_number" });

    setSaving(false);

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Day ${activeDay} logged! 🎉`, description: "Your progress has been saved." });
      await loadProgress();

      // If this was day 5, send summary to coach
      const updatedEntries = { ...entries, [activeDay]: payload };
      const completedCount = Object.keys(updatedEntries).length;
      if (completedCount === 5) {
        sendSummaryEmail(currentEmail);
      }
    }
  };

  const completedDays = Object.keys(entries).length;

  // Calculate summary stats
  const entryValues = Object.values(entries);
  const avgMood = entryValues.filter(e => e.mood_rating).reduce((sum, e) => sum + (e.mood_rating || 0), 0) / (entryValues.filter(e => e.mood_rating).length || 1);
  const avgEnergy = entryValues.filter(e => e.energy_rating).reduce((sum, e) => sum + (e.energy_rating || 0), 0) / (entryValues.filter(e => e.energy_rating).length || 1);
  const totalWater = entryValues.reduce((sum, e) => sum + (e.water_glasses || 0), 0);

  // Mood/energy trend (compare last 2 days vs first 2 days)
  const earlyMood = [entries[1]?.mood_rating, entries[2]?.mood_rating].filter(Boolean) as number[];
  const lateMood = [entries[4]?.mood_rating, entries[5]?.mood_rating].filter(Boolean) as number[];
  const moodTrend = earlyMood.length && lateMood.length
    ? (lateMood.reduce((a, b) => a + b, 0) / lateMood.length) - (earlyMood.reduce((a, b) => a + b, 0) / earlyMood.length)
    : 0;

  const earlyEnergy = [entries[1]?.energy_rating, entries[2]?.energy_rating].filter(Boolean) as number[];
  const lateEnergy = [entries[4]?.energy_rating, entries[5]?.energy_rating].filter(Boolean) as number[];
  const energyTrend = earlyEnergy.length && lateEnergy.length
    ? (lateEnergy.reduce((a, b) => a + b, 0) / lateEnergy.length) - (earlyEnergy.reduce((a, b) => a + b, 0) / earlyEnergy.length)
    : 0;

  if (!isLoaded && email) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading your progress...</div>
      </div>
    );
  }

  // Full Summary View after all 5 days
  if (showSummary && completedDays === 5) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold tracking-widest uppercase text-primary mb-3">The Diabetes Reset Method</p>
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-10 w-10 text-primary" />
            </div>
            <h1 className="font-heading font-bold text-3xl text-foreground mb-2">
              🎉 Challenge Complete!
            </h1>
            <p className="text-muted-foreground text-lg">
              You did it — 5 days of real progress. Here's your full journey.
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <Smile className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="font-heading font-bold text-2xl text-primary">{avgMood.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Avg Mood</p>
              {moodTrend > 0 && (
                <p className="text-xs text-primary font-medium mt-1 flex items-center justify-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +{moodTrend.toFixed(1)}
                </p>
              )}
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <Zap className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="font-heading font-bold text-2xl text-primary">{avgEnergy.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Avg Energy</p>
              {energyTrend > 0 && (
                <p className="text-xs text-primary font-medium mt-1 flex items-center justify-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +{energyTrend.toFixed(1)}
                </p>
              )}
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <Droplets className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="font-heading font-bold text-2xl text-primary">{totalWater}</p>
              <p className="text-xs text-muted-foreground">Total Glasses</p>
            </div>
          </div>

          {/* Day-by-Day Journey */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h3 className="font-heading font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" /> Your 5-Day Journey
            </h3>
            <div className="space-y-3">
              {DAYS.map((d) => {
                const entry = entries[d.day];
                if (!entry) return null;
                return (
                  <div key={d.day} className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {d.day}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{d.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{entry.win_text}</p>
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        {entry.mood_rating && (
                          <span>{MOODS.find(m => m.value === entry.mood_rating)?.emoji} {MOODS.find(m => m.value === entry.mood_rating)?.label}</span>
                        )}
                        {entry.energy_rating && <span>⚡ Energy: {entry.energy_rating}/5</span>}
                        {entry.water_glasses > 0 && <span>💧 {entry.water_glasses} glasses</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Edit button */}
          <Button
            variant="outline"
            onClick={() => { setShowSummary(false); setActiveDay(1); }}
            className="w-full mb-4 rounded-xl border-primary/30 hover:bg-primary/5"
          >
            Edit My Entries
          </Button>

          {/* Upsell CTA */}
          <div className="bg-primary/5 border-2 border-primary rounded-2xl p-6 text-center">
            <h2 className="font-heading font-bold text-xl text-foreground mb-2">
              You proved you can do this.
            </h2>
            <p className="text-muted-foreground mb-4">
              In 5 days you built real habits. Imagine what 6 weeks of personalized coaching could do.
            </p>
            <Button
              onClick={() => navigate("/6-week-reset")}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 font-bold rounded-xl h-auto text-lg"
            >
              See the 6-Week Reset
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex gap-3 mb-6">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-primary/30 hover:bg-primary/5"
          >
            <a href="/book" target="_blank" rel="noopener noreferrer">
              <Calendar className="mr-2 h-4 w-4" /> Book Sessions
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-primary/30 hover:bg-primary/5"
          >
            <a href="/intake" target="_blank" rel="noopener noreferrer">
              <ClipboardList className="mr-2 h-4 w-4" /> Intake Form
            </a>
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sm font-semibold tracking-widest uppercase text-primary mb-3">The Diabetes Reset Method</p>
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-heading font-bold text-3xl text-foreground mb-2">
            Your 5-Day Progress
          </h1>
          <p className="text-muted-foreground">
            Log your daily wins, track your mood, and watch your momentum build.
          </p>
        </div>

        {/* Email input if not set */}
        {!email && (
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">Enter the email you used at checkout</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadProgress()}
                placeholder="your@email.com"
                className="flex-1 rounded-xl border border-input bg-background px-4 py-2 text-sm"
              />
              <Button onClick={loadProgress} className="rounded-xl">Load</Button>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Challenge Progress</span>
            <span className="text-sm font-bold text-primary">{completedDays}/5 Days</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(completedDays / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Day Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {DAYS.map((d) => {
            const isCompleted = !!entries[d.day];
            const isActive = activeDay === d.day;
            return (
              <button
                key={d.day}
                onClick={() => setActiveDay(d.day)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : isCompleted
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted && <CheckCircle2 className="h-4 w-4" />}
                Day {d.day}
              </button>
            );
          })}
        </div>

        {/* Active Day Card */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="mb-5">
            <h2 className="font-heading font-semibold text-xl text-foreground">
              Day {activeDay}: {DAYS[activeDay - 1].title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{DAYS[activeDay - 1].description}</p>
            {entries[activeDay] && (
              <p className="text-xs text-primary font-medium mt-2">✅ Already logged — you can update it below</p>
            )}
          </div>

          {/* Win */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-foreground mb-2">
              🏆 Today's Win or Takeaway
            </label>
            <Textarea
              value={winText}
              onChange={(e) => setWinText(e.target.value)}
              placeholder="What went well today? What did you learn? Even small wins count!"
              className="rounded-xl min-h-[100px] resize-none"
            />
          </div>

          {/* Mood */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-foreground mb-2">😊 How do you feel?</label>
            <div className="flex gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-sm transition-all ${
                    mood === m.value
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-muted border-2 border-transparent hover:border-border"
                  }`}
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Energy */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-foreground mb-2">
              <Zap className="inline h-4 w-4 text-primary mr-1" /> Energy Level
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setEnergy(level)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                    energy === level
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* Water */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              <Droplets className="inline h-4 w-4 text-primary mr-1" /> Glasses of Water Today
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWater(Math.max(0, water - 1))}
                className="w-10 h-10 rounded-full bg-muted text-foreground font-bold text-lg flex items-center justify-center"
              >
                −
              </button>
              <span className="text-2xl font-bold text-foreground w-12 text-center">{water}</span>
              <button
                onClick={() => setWater(water + 1)}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center"
              >
                +
              </button>
              <Droplets className="h-5 w-5 text-primary" />
            </div>
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 font-bold rounded-xl h-auto text-lg"
          >
            <Send className="mr-2 h-5 w-5" />
            {entries[activeDay] ? "Update" : "Log"} Day {activeDay}
          </Button>
        </div>

        {/* Completed Summary */}
        {completedDays > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
            <h3 className="font-heading font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" /> Your Wins So Far
            </h3>
            <div className="space-y-3">
              {DAYS.filter((d) => entries[d.day]).map((d) => (
                <div key={d.day} className="flex items-start gap-3 p-3 bg-background rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {d.day}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.title}</p>
                    <p className="text-sm text-muted-foreground">{entries[d.day].win_text}</p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      {entries[d.day].mood_rating && (
                        <span>{MOODS.find((m) => m.value === entries[d.day].mood_rating)?.emoji} Mood</span>
                      )}
                      {entries[d.day].energy_rating && <span>⚡ Energy: {entries[d.day].energy_rating}/5</span>}
                      {entries[d.day].water_glasses > 0 && <span>💧 {entries[d.day].water_glasses} glasses</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {completedDays === 5 && (
              <div className="mt-6 text-center">
                <Button
                  onClick={() => setShowSummary(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-8 font-bold rounded-xl h-auto text-lg"
                >
                  View Your Full Results 🎉
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressTracker;
