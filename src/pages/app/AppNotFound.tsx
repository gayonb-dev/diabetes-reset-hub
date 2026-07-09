import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Vita } from "@/components/vita/Vita";
import { Home, LineChart, UtensilsCrossed, MessageCircleQuestion } from "lucide-react";

/**
 * In-app 404 — keeps the AppLayout chrome and offers recovery paths
 * that make sense for a signed-in member (not "Back to marketing site").
 */
export default function AppNotFound() {
  const location = useLocation();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-12">
      <Vita posture="thinking" size={120} />
      <h1 className="font-heading font-bold text-3xl md:text-4xl text-foreground mt-6 mb-2">
        This page doesn't exist yet.
      </h1>
      <p className="text-muted-foreground max-w-md mb-2">
        We couldn't find <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{location.pathname}</span>.
      </p>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        It may have moved, or the link is out of date. Try one of these instead:
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-lg">
        <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 rounded-xl">
          <Link to="/app">
            <Home className="h-5 w-5" />
            <span className="text-xs font-semibold">Today</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 rounded-xl">
          <Link to="/app/progress">
            <LineChart className="h-5 w-5" />
            <span className="text-xs font-semibold">Progress</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 rounded-xl">
          <Link to="/app/meals">
            <UtensilsCrossed className="h-5 w-5" />
            <span className="text-xs font-semibold">Meals</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5 rounded-xl">
          <Link to="/app/ask">
            <MessageCircleQuestion className="h-5 w-5" />
            <span className="text-xs font-semibold">Ask VITA</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
