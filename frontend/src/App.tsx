import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import Landing from "@/pages/Landing";
import CreatePlan from "@/pages/CreatePlan";
import Teaser from "@/pages/Teaser";
import Dashboard from "@/pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/create-plan" element={<CreatePlan />} />
        <Route path="/teaser/:submissionId" element={<Teaser />} />
        <Route path="/dashboard/:submissionId" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
