import { useState, useEffect } from "react";
import { ArrowLeft, Trophy, Droplets, Zap, Smile, Send, CheckCircle2, Star } from "lucide-react";
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
      const completed = Object.keys(map).map(Number);
      const nextDay = completed.length > 0 ? Math.min(Math.max(...completed) + 1, 5) : 1;
      setActiveDay(nextDay);
    }
    setIsLoaded(true);
  };

  const handleSave = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", description: "Please enter the email you used at checkout.", variant: "destructive" });
      return;
    }
    if (!winText.trim()) {
      toast({ title: "Share your win!", description: "Write at least one win or takeaway from today.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      email: email.toLowerCase().trim(),
      day_number: activeDay,
      win_text: winText.trim(),
      mood_rating: mood,
      energy_rating: energy,
      water_glasses: water,
    };

    const { error } = entries[activeDay]
      ? await supabase.from("challenge_progress").update(payload).eq("email", payload.email).eq("day_number", activeDay)
      : await supabase.from("challenge_progress").insert(payload);

    setSaving(false);

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Day ${activeDay} logged! 🎉`, description: "Your progress has been saved." });
      await loadProgress();
    }
  };

  const completedDays = Object.keys(entries).length;

  if (!isLoaded && email) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading your progress...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => navigate("/")} className="flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </button>

        {/* Header */}
        <div className="text-center mb-8">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                <p className="text-lg font-bold text-foreground mb-2">🎉 You completed the 5-Day Challenge!</p>
                <p className="text-muted-foreground text-sm mb-4">
                  You've proven you can make changes. Ready to go deeper?
                </p>
                <Button
                  onClick={() => navigate("/6-week-reset")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-8 font-bold rounded-xl h-auto text-lg"
                >
                  See the 6-Week Reset →
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
