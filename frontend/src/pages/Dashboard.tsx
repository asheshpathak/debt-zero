import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingDown, Calendar, Banknote, Target, Lightbulb, AlertTriangle,
  Download, Loader2, CheckCircle2, ArrowRight
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { DebtPlan } from "@/types";

export default function Dashboard() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<DebtPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate(`/teaser/${submissionId}`); return; }
    fetchPlan();
  }, [user, authLoading]);

  const fetchPlan = async () => {
    try {
      const res = await api.get<DebtPlan>(`/plan/${submissionId}`);
      if (!res.data.paid) { navigate(`/teaser/${submissionId}`); return; }
      setPlan(res.data);
    } catch {
      setError("Could not load your plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");
    if (!dashboardRef.current) return;
    const canvas = await html2canvas(dashboardRef.current, { backgroundColor: "#0a0a0f", scale: 1.5 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`DebtClear-Plan-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#6366f1] animate-spin mx-auto mb-4" />
          <p className="text-[#94a3b8] text-sm">Loading your plan…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <GlassCard className="text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={fetchPlan}>Retry</Button>
        </GlassCard>
      </div>
    );
  }

  if (!plan) return null;

  const { summary, monthlySchedule, debtOrder, insights, quickWins, warnings } = plan.planData;

  const chartData = monthlySchedule.slice(0, 36).map((m) => ({
    name: m.date,
    balance: m.remainingBalance,
    interest: m.interestPaid,
    principal: m.principalPaid,
  }));

  const statCards = [
    { label: "Total Debt", value: formatCurrency(summary.totalDebt), icon: Banknote, color: "text-rose-400", glow: "none" as const },
    { label: "Debt-Free Date", value: summary.estimatedPayoffDate, icon: Calendar, color: "text-emerald-400", glow: "none" as const },
    { label: "Months to Freedom", value: `${summary.estimatedPayoffMonths} months`, icon: Target, color: "text-[#6366f1]", glow: "indigo" as const },
    { label: "Interest Saved", value: formatCurrency(summary.totalInterestSaved), icon: TrendingDown, color: "text-[#06b6d4]", glow: "cyan" as const },
  ];

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="orb w-[400px] h-[400px] bg-[#6366f1] -top-20 -right-32" />

      <div className="max-w-5xl mx-auto" ref={dashboardRef}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">Plan Unlocked</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Your Debt-Free Roadmap</h1>
            <p className="text-[#94a3b8] text-sm mt-1">
              Strategy: <span className="capitalize text-[#f1f5f9]">{summary.strategy}</span> ·
              DTI Ratio: <span className="text-[#f1f5f9]">{summary.debtToIncomeRatio.toFixed(1)}%</span>
            </p>
          </div>

          {/* Download — sticky on mobile */}
          <div className="fixed bottom-4 left-4 right-4 sm:static sm:bottom-auto sm:left-auto sm:right-auto z-40 sm:z-auto">
            <Button
              onClick={handleDownloadPDF}
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-[#6366f1] to-[#06b6d4] shadow-2xl sm:shadow-none"
            >
              <Download className="w-4 h-4" /> Download PDF Report
            </Button>
          </div>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <GlassCard glow={s.glow} className="!p-4">
                <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-0.5">{s.label}</p>
                <p className={`text-base sm:text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-6"
        >
          <GlassCard>
            <h2 className="font-semibold mb-4">Debt Balance Over Time</h2>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[300px] h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#475569" }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                      formatter={(value) => [formatCurrency(Number(value)), "Balance"]}
                    />
                    <Area type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2} fill="url(#balanceGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Debt payoff order + schedule grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Payoff order */}
          <GlassCard>
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-[#6366f1]" /> Payoff Order
            </h2>
            <div className="space-y-3">
              {debtOrder.map((d, i) => (
                <div key={d.name} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#6366f1]/20 border border-[#6366f1]/40 flex items-center justify-center text-[10px] font-bold text-[#6366f1] shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <span className="text-xs text-[#475569] shrink-0">Mo. {d.payoffMonth}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-[#94a3b8] mt-0.5">
                      <span>{formatCurrency(d.balance)}</span>
                      <span className="text-orange-400">{d.interestRate}% p.a.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Monthly schedule preview */}
          <GlassCard>
            <h2 className="font-semibold mb-4">First 6 Months</h2>
            <div className="space-y-2 overflow-y-auto max-h-64 pr-1">
              {monthlySchedule.slice(0, 6).map((m) => (
                <div key={m.month} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="font-medium text-[#f1f5f9]">{m.date}</p>
                    {m.debtsCleared.length > 0 && (
                      <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {m.debtsCleared.join(", ")} cleared!
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[#6366f1]">{formatCurrency(m.totalPayment)}</p>
                    <p className="text-[10px] text-[#475569]">{formatCurrency(m.remainingBalance)} left</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Insights / Quick wins / Warnings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <GlassCard>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" /> Insights
            </h2>
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li key={i} className="text-sm text-[#94a3b8] flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5 shrink-0">•</span>{insight}
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Quick Wins
            </h2>
            <ul className="space-y-2">
              {quickWins.map((win, i) => (
                <li key={i} className="text-sm text-[#94a3b8] flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>{win}
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard className="sm:col-span-2 lg:col-span-1">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" /> Warnings
            </h2>
            {warnings.length === 0 ? (
              <p className="text-sm text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> No critical warnings!
              </p>
            ) : (
              <ul className="space-y-2">
                {warnings.map((w, i) => (
                  <li key={i} className="text-sm text-orange-300 flex items-start gap-2">
                    <span className="text-orange-400 mt-0.5 shrink-0">!</span>{w}
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
