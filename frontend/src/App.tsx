import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import Landing from "@/pages/Landing";
import CreatePlan from "@/pages/CreatePlan";
import Teaser from "@/pages/Teaser";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import DashboardHome from "@/pages/DashboardHome";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import RefundPolicy from "@/pages/RefundPolicy";
import Contact from "@/pages/Contact";
import FAQ from "@/pages/FAQ";
import { useAuth } from "@/hooks/useAuth";

function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/create-plan" element={<CreatePlan />} />
        <Route path="/teaser/:submissionId" element={<Teaser />} />
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/dashboard/:submissionId" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/refunds" element={<RefundPolicy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
      </Routes>
    </BrowserRouter>
  );
}
