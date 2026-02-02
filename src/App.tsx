import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Results from "./pages/Results";
import Profile from "./pages/Profile";
import Help from "./pages/Help";
import Referrals from "./pages/Referrals";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import Recommendations from "./pages/Recommendations";
import RecommendationDownload from "./pages/RecommendationDownload";
import AdminDashboard from "./pages/admin/AdminDashboard";
import PatientProfile from "./pages/admin/PatientProfile";
import RecommendationCreator from "./pages/admin/RecommendationCreator";
import Partners from "./pages/admin/Partners";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/results" element={<Results />} />
            <Route path="/dashboard/profile" element={<Profile />} />
            <Route path="/dashboard/help" element={<Help />} />
            <Route path="/dashboard/referrals" element={<Referrals />} />
            <Route path="/dashboard/recommendations" element={<Recommendations />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            {/* Public recommendation download page */}
            <Route path="/recommendation/download" element={<RecommendationDownload />} />
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/patient/:id" element={<PatientProfile />} />
            <Route path="/admin/patient/:id/recommendation/new" element={<RecommendationCreator />} />
            <Route path="/admin/partners" element={<Partners />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
