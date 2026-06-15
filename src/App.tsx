import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AuthGuard from "@/components/AuthGuard";
import Index from "./pages/Index";

// Lazy-loaded routes — keep the landing page bundle small.
const IntakeForm = lazy(() => import("./pages/IntakeForm"));
const BookSession = lazy(() => import("./pages/BookSession"));
const ProgressTracker = lazy(() => import("./pages/ProgressTracker"));
const SixWeekReset = lazy(() => import("./pages/SixWeekReset"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancelled = lazy(() => import("./pages/PaymentCancelled"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const LLMInfo = lazy(() => import("./pages/LLMInfo"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AppLayout = lazy(() => import("./pages/app/AppLayout"));
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const DayDetail = lazy(() => import("./pages/app/DayDetail"));
const Library = lazy(() => import("./pages/app/Library"));
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
const CoachingWaitlist = lazy(() => import("./pages/app/CoachingWaitlist"));
const AppProgress = lazy(() => import("./pages/app/Progress"));
const Settings = lazy(() => import("./pages/app/Settings"));
const Profile = lazy(() => import("./pages/app/Profile"));
const Fasting = lazy(() => import("./pages/app/Fasting"));
const CheatMeal = lazy(() => import("./pages/app/CheatMeal"));
const Support = lazy(() => import("./pages/app/Support"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminQaQueue = lazy(() => import("./pages/admin/AdminQaQueue"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminBroadcasts = lazy(() => import("./pages/admin/AdminBroadcasts"));
const AdminWaitlist = lazy(() => import("./pages/admin/AdminWaitlist"));
const AdminTopCustomers = lazy(() => import("./pages/admin/AdminTopCustomers"));
const AdminDigest = lazy(() => import("./pages/admin/AdminDigest"));
const AdminPhiLog = lazy(() => import("./pages/admin/AdminPhiLog"));
const AdminCommunity = lazy(() => import("./pages/admin/AdminCommunity"));
const Privacy = lazy(() => import("./pages/Privacy"));
const ChatWidget = lazy(() => import("./components/chat/ChatWidget"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-cancelled" element={<PaymentCancelled />} />
              <Route path="/intake" element={<IntakeForm />} />
              <Route path="/book" element={<BookSession />} />
              <Route path="/progress" element={<ProgressTracker />} />
              <Route path="/6-week-reset" element={<SixWeekReset />} />
              <Route
                path="/admin"
                element={
                  <AuthGuard requireAdmin requireActiveSub={false}>
                    <AdminLayout />
                  </AuthGuard>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="top-customers" element={<AdminTopCustomers />} />
                <Route path="digest" element={<AdminDigest />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="qa-queue" element={<AdminQaQueue />} />
                <Route path="content" element={<AdminContent />} />
                <Route path="broadcasts" element={<AdminBroadcasts />} />
                <Route path="waitlist" element={<AdminWaitlist />} />
                <Route path="phi-log" element={<AdminPhiLog />} />
              </Route>

              <Route path="/llm-info" element={<LLMInfo />} />
              <Route path="/llms.txt" element={<LLMInfo />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/privacy" element={<Privacy />} />

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
                <Route path="library" element={<Library />} />
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
                <Route path="cheat-meal" element={<CheatMeal />} />
                <Route path="support" element={<Support />} />
                <Route path="settings/billing" element={<Billing />} />
                <Route path="coaching-waitlist" element={<CoachingWaitlist />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            <ChatWidget />
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
