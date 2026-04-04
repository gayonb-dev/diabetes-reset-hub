import { ArrowLeft, Calendar, MessageCircle, Video, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const BookSession = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button onClick={() => navigate("/")} className="flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </button>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-3">
            Book Your Sessions
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Schedule your 5-day challenge sessions. Each session is 30–45 minutes, once per day.
          </p>
        </div>

        {/* Booking Options */}
        <div className="space-y-6">
          {/* Primary: Calendly/Cal.com embed placeholder */}
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="font-heading font-semibold text-xl text-foreground mb-2">
              Schedule Your Day 1 Session
            </h2>
            <p className="text-muted-foreground mb-6">
              Pick a time that works best for you. We'll confirm the remaining 4 sessions based on your availability.
            </p>
            
            {/* Replace this URL with your actual Calendly or Cal.com link */}
            <Button 
              asChild
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 font-bold rounded-xl h-auto text-lg"
            >
              <a href="https://calendly.com/YOUR_LINK" target="_blank" rel="noopener noreferrer">
                <Calendar className="mr-2 h-5 w-5" />
                Open Booking Calendar
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>

            <p className="text-xs text-muted-foreground mt-3">
              Opens in a new tab • Takes 2 minutes
            </p>
          </div>

          {/* Alternative: WhatsApp */}
          <div className="bg-muted/30 border border-border rounded-2xl p-6">
            <h3 className="font-heading font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Prefer to book via WhatsApp?
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Send us your preferred dates and times on WhatsApp, and we'll schedule all 5 sessions for you.
            </p>
            <Button 
              asChild
              variant="outline"
              className="w-full py-3 font-semibold rounded-xl h-auto border-primary/30 hover:bg-primary/5"
            >
              <a href="https://wa.me/YOUR_NUMBER?text=Hi!%20I%20just%20purchased%20the%205-Day%20Reset%20and%20would%20like%20to%20book%20my%20sessions." target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" />
                Message Us on WhatsApp
              </a>
            </Button>
          </div>

          {/* Session Details */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4">
            <h3 className="font-heading font-semibold text-lg text-foreground">What to Expect</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Video className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Video Calls via Zoom or Google Meet</p>
                  <p className="text-xs text-muted-foreground">A link will be sent to you before each session</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">5 Consecutive Days</p>
                  <p className="text-xs text-muted-foreground">30–45 minute sessions, same time each day</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">WhatsApp Support Between Sessions</p>
                  <p className="text-xs text-muted-foreground">Daily check-ins, reminders, and accountability</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookSession;
