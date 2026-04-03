import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Help from "./pages/Help";
import Referrals from "./pages/Referrals";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import Recommendations from "./pages/Recommendations";
import RecommendationDownload from "./pages/RecommendationDownload";
import NutritionInterview from "./pages/NutritionInterview";
import SignupVerifyEmail from "./pages/flow/SignupVerifyEmail";
import OnboardingConfirm from "./pages/flow/OnboardingConfirm";
import PaymentMethod from "./pages/flow/PaymentMethod";
import PaymentCheckout from "./pages/flow/PaymentCheckout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import PatientProfile from "./pages/admin/PatientProfile";
import RecommendationCreator from "./pages/admin/RecommendationCreator";
import Partners from "./pages/admin/Partners";
import ImportPatients from "./pages/admin/ImportPatients";
import ExportData from "./pages/admin/ExportData";
import AdminFillInterview from "./pages/admin/AdminFillInterview";
import { AdminNotificationsProvider } from "@/contexts/AdminNotificationsContext";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/signup/verify-email" element={<SignupVerifyEmail />} />
            <Route path="/onboarding/confirm" element={<OnboardingConfirm />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/results" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard/profile" element={<Profile />} />
            <Route path="/dashboard/help" element={<Help />} />
            <Route path="/dashboard/referrals" element={<Referrals />} />
            <Route path="/dashboard/recommendations" element={<Recommendations />} />
            <Route path="/dashboard/interview" element={<NutritionInterview />} />
            <Route path="/interview" element={<NutritionInterview />} />
            <Route path="/interview/:step" element={<NutritionInterview />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/payment/method" element={<PaymentMethod />} />
            <Route path="/payment/checkout" element={<PaymentCheckout />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            {/* Public recommendation download page */}
            <Route path="/recommendation/download" element={<RecommendationDownload />} />
            {/* Admin Routes */}
            <Route path="/admin/*" element={
              <ErrorBoundary>
                <AdminNotificationsProvider>
                  <Routes>
                    <Route index element={<AdminDashboard />} />
                    <Route path="patient/:id" element={<PatientProfile />} />
                    <Route path="patient/:id/recommendation/new" element={<RecommendationCreator />} />
                    <Route path="patient/:id/recommendation/:recommendationId/edit" element={<RecommendationCreator />} />
                    <Route path="patient/:id/interview/:profileId" element={<AdminFillInterview />} />
                    <Route path="partners" element={<Partners />} />
                    <Route path="import" element={<ImportPatients />} />
                    <Route path="export" element={<ExportData />} />
                  </Routes>
                </AdminNotificationsProvider>
              </ErrorBoundary>
            } />
            <Route path="/help" element={<Navigate to="/dashboard/help" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
