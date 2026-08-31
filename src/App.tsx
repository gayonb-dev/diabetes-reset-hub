import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AuthGuard from "@/components/AuthGuard";
import RetiredRoute from "@/components/RetiredRoute";
import RetiredOfferRoute from "@/components/RetiredOfferRoute";
import ClockSkewBanner from "@/components/ClockSkewBanner";
import Index from "./pages/Index";

// Lazy-loaded routes — keep the landing page bundle small.


const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancelled = lazy(() => import("./pages/PaymentCancelled"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const LLMInfo = lazy(() => import("./pages/LLMInfo"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AppNotFound = lazy(() => import("./pages/app/AppNotFound"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AppLayout = lazy(() => import("./pages/app/AppLayout"));
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const DayDetail = lazy(() => import("./pages/app/DayDetail"));
const Learn = lazy(() => import("./pages/app/Learn"));
const Supplements = lazy(() => import("./pages/app/Supplements"));
const WorkoutLibrary = lazy(() => import("./pages/app/WorkoutLibrary"));
const WorkoutSession = lazy(() => import("./pages/app/WorkoutSession"));
const WorkoutComplete = lazy(() => import("./pages/app/WorkoutComplete"));
const Meals = lazy(() => import("./pages/app/Meals"));
const Ask = lazy(() => import("./pages/app/Ask"));
const Billing = lazy(() => import("./pages/app/Billing"));
const Onboarding = lazy(() => import("./pages/app/Onboarding"));
const MealSetupTransition = lazy(() => import("./pages/app/MealSetupTransition"));

const AppProgress = lazy(() => import("./pages/app/Progress"));
const ProgressReport = lazy(() => import("./pages/app/ProgressReport"));
const DexcomCallback = lazy(() => import("./pages/app/DexcomCallback"));


const Settings = lazy(() => import("./pages/app/Settings"));
const Profile = lazy(() => import("./pages/app/Profile"));
const Fasting = lazy(() => import("./pages/app/Fasting"));

const Support = lazy(() => import("./pages/app/Support"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminQaQueue = lazy(() => import("./pages/admin/AdminQaQueue"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminBroadcasts = lazy(() => import("./pages/admin/AdminBroadcasts"));
const AdminCoachingInterest = lazy(() => import("./pages/admin/AdminCoachingInterest"));
const AdminDigest = lazy(() => import("./pages/admin/AdminDigest"));
const AdminPhiLog = lazy(() => import("./pages/admin/AdminPhiLog"));
const AdminCommunity = lazy(() => import("./pages/admin/AdminCommunity"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const Refunds = lazy(() => import("./pages/legal/Refunds"));
const AiUse = lazy(() => import("./pages/legal/AiUse"));
const HealthDataPrivacy = lazy(() => import("./pages/legal/HealthDataPrivacy"));
const DataRights = lazy(() => import("./pages/legal/DataRights"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

// ChatWidget is mounted per-page on marketing routes only (see src/pages/Index.tsx).
// It is intentionally NOT mounted here so it never appears inside /app/* or /admin/*.


const queryClient = new QueryClient();

/**
 * Shell-level fallback. Deliberately minimal and neutral: it stands in for a
 * whole layout (marketing page, app shell, admin shell) whose shape is not yet
 * known, and it announces itself so a screen reader is not left in silence.
 */
function AppBootFallback() {
  return (
    <div className="min-h-[60vh] px-4 py-10 max-w-3xl mx-auto space-y-5" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        Loading…
      </span>
      <div className="h-8 w-1/2 max-w-xs rounded bg-muted animate-pulse" />
      <div className="h-40 rounded-xl bg-muted animate-pulse" />
      <div className="h-24 rounded-xl bg-muted animate-pulse" />
    </div>
  );
}


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ClockSkewBanner />
          {/* Outer boundary: covers the shell itself (layouts are lazy too).
              Nested layouts provide their own page-shaped skeletons. */}
          <Suspense fallback={<AppBootFallback />}>

            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-cancelled" element={<PaymentCancelled />} />
              {/* Prompt 4 closeout — retired routes. Client-side replacements
                  (Lovable hosting has no server 301/308); no retired funnel,
                  coaching, booking, or $497 content is rendered. */}
              <Route
                path="/intake"
                element={
                  <RetiredRoute
                    authedTo="/app/onboarding"
                    anonTo="/login?next=%2Fapp%2Fonboarding"
                  />
                }
              />
              <Route
                path="/progress"
                element={
                  <RetiredRoute
                    authedTo="/app/progress"
                    anonTo="/login?next=%2Fapp%2Fprogress"
                  />
                }
              />
              <Route path="/book" element={<RetiredOfferRoute />} />
              <Route path="/6-week-reset" element={<RetiredOfferRoute />} />
              <Route path="/six-week-reset" element={<RetiredOfferRoute />} />
              <Route path="/coaching" element={<RetiredOfferRoute />} />


              <Route
                path="/admin"
                element={
                  <AuthGuard requireAdmin requireActiveSub={false}>
                    <AdminLayout />
                  </AuthGuard>
                }
              >
                <Route index element={<AdminDashboard />} />
                {/* Batch 2 F — Top Customers retired from active Admin. The
                    route redirects; historical data is retained in the DB. */}
                <Route path="top-customers" element={<Navigate to="/admin/subscriptions" replace />} />
                <Route path="coaching-interest" element={<AdminCoachingInterest />} />
                <Route path="digest" element={<AdminDigest />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="qa-queue" element={<AdminQaQueue />} />
                <Route path="support" element={<AdminSupport />} />
                <Route path="content" element={<AdminContent />} />
                <Route path="broadcasts" element={<AdminBroadcasts />} />
                {/* Coaching waitlist consolidated into Coaching Interest. */}
                <Route path="waitlist" element={<Navigate to="/admin/coaching-interest" replace />} />
                <Route path="phi-log" element={<AdminPhiLog />} />
                <Route path="community" element={<AdminCommunity />} />
              </Route>

              <Route path="/llm-info" element={<LLMInfo />} />
              <Route path="/llms.txt" element={<LLMInfo />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/refunds" element={<Refunds />} />
              <Route path="/ai-use" element={<AiUse />} />
              <Route path="/health-data-privacy" element={<HealthDataPrivacy />} />
              <Route path="/data-rights" element={<DataRights />} />

              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />


              {/* Doctor-shareable progress report — plain page, no AppLayout */}
              <Route
                path="/app/progress/report"
                element={
                  <AuthGuard>
                    <ProgressReport />
                  </AuthGuard>
                }
              />

              {/* Dexcom OAuth callback — plain page, no AppLayout */}
              <Route
                path="/app/settings/dexcom/callback"
                element={
                  <AuthGuard requireActiveSub={false}>
                    <DexcomCallback />
                  </AuthGuard>
                }
              />


              {/* Onboarding (auth required, no active sub needed yet) */}
              <Route
                path="/app/onboarding"
                element={
                  <AuthGuard requireActiveSub={false}>
                    <Onboarding />
                  </AuthGuard>
                }
              />
              <Route
                path="/app/onboarding/meal-setup"
                element={
                  <AuthGuard requireActiveSub={false}>
                    <MealSetupTransition />
                  </AuthGuard>
                }
              />


              {/* Member app */}
              <Route
                path="/app"
                element={
                  <AuthGuard>
                    <AppLayout />
                  </AuthGuard>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="today" element={<Dashboard />} />
                <Route path="day/:day" element={<DayDetail />} />
                {/* Library consolidated into Learn → Resources. Old deep links keep working. */}
                <Route path="library" element={<Navigate to="/app/learn?tab=resources" replace />} />
                <Route path="library/*" element={<Navigate to="/app/learn?tab=resources" replace />} />
                <Route path="learn" element={<Learn />} />
                <Route path="supplements" element={<Supplements />} />
                <Route path="workouts" element={<WorkoutLibrary />} />
                <Route path="workouts/:slug" element={<WorkoutSession />} />
                <Route path="workouts/:slug/complete" element={<WorkoutComplete />} />
                <Route path="meals" element={<Meals />} />
                <Route path="ask" element={<Ask />} />
                <Route path="progress" element={<AppProgress />} />
                <Route path="billing" element={<Billing />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Profile />} />
                <Route path="fasting" element={<Fasting />} />
                <Route path="cheat-meal" element={<Navigate to="/app/meals?tab=off-plan" replace />} />
                <Route path="support" element={<Support />} />
                <Route path="settings/billing" element={<Billing />} />
                {/* Prompt 6 A6 — /app/coaching-waitlist retired: one-to-one coaching
                    is not part of the membership, so the surface is not routed. */}
                <Route path="*" element={<AppNotFound />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>

        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
