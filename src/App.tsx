import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AuthGuard from "@/components/AuthGuard";
import Index from "./pages/Index";
import IntakeForm from "./pages/IntakeForm";
import BookSession from "./pages/BookSession";
import ProgressTracker from "./pages/ProgressTracker";
import SixWeekReset from "./pages/SixWeekReset";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import AdminDashboard from "./pages/AdminDashboard";
import LLMInfo from "./pages/LLMInfo";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import AppLayout from "./pages/app/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import DayDetail from "./pages/app/DayDetail";
import Library from "./pages/app/Library";
import WorkoutLibrary from "./pages/app/WorkoutLibrary";
import WorkoutSession from "./pages/app/WorkoutSession";
import WorkoutComplete from "./pages/app/WorkoutComplete";
import Meals from "./pages/app/Meals";
import Ask from "./pages/app/Ask";
import Billing from "./pages/app/Billing";
import Onboarding from "./pages/app/Onboarding";
import MealSetupTransition from "./pages/app/MealSetupTransition";
import CoachingWaitlist from "./pages/app/CoachingWaitlist";
import AppProgress from "./pages/app/Progress";
import Settings from "./pages/app/Settings";
import Profile from "./pages/app/Profile";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminQaQueue from "./pages/admin/AdminQaQueue";
import AdminContent from "./pages/admin/AdminContent";
import AdminBroadcasts from "./pages/admin/AdminBroadcasts";
import AdminWaitlist from "./pages/admin/AdminWaitlist";
import AdminTopCustomers from "./pages/admin/AdminTopCustomers";
import AdminDigest from "./pages/admin/AdminDigest";
import AdminPhiLog from "./pages/admin/AdminPhiLog";
import Privacy from "./pages/Privacy";
import ChatWidget from "./components/chat/ChatWidget";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
              <Route path="workouts" element={<WorkoutLibrary />} />
              <Route path="workouts/:slug" element={<WorkoutSession />} />
              <Route path="workouts/:slug/complete" element={<WorkoutComplete />} />
              <Route path="meals" element={<Meals />} />
              <Route path="ask" element={<Ask />} />
              <Route path="progress" element={<AppProgress />} />
              <Route path="billing" element={<Billing />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
              <Route path="coaching-waitlist" element={<CoachingWaitlist />} />

            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatWidget />
        </AuthProvider>
      </BrowserRouter>

    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
