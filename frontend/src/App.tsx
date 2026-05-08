import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import Landing from "@/pages/Landing";
import CreatePlan from "@/pages/CreatePlan";
import Teaser from "@/pages/Teaser";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import DashboardHome from "@/pages/DashboardHome";
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
      </Routes>
    </BrowserRouter>
  );
}
