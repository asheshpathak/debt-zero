import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, Lightbulb, Zap, AlertTriangle, ChevronDown, RefreshCw, X, Flag } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TerminalProgress } from "@/components/TerminalProgress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { getPlanView, getDefaultStrategyFromPlanData, isPlanDataV2 } from "@/lib/planData";
import { removeRazorpayCheckoutScript } from "@/lib/razorpayLoader";
import { expenseCategoryLabel } from "@/lib/expenses";
import { PAYOFF_STRATEGY_OPTIONS, type DebtPlan, type PayoffStrategy, type PlanDataV2 } from "@/types";

type DashTab = "overview" | "roadmap" | "schedule" | "debts" | "insights";

const TABS: { id: DashTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "roadmap", label: "Roadmap" },
  { id: "schedule", label: "Schedule" },
  { id: "debts", label: "Debts" },
  { id: "insights", label: "Insights" },
];

const STRATEGY_COLORS: Record<PayoffStrategy, string> = {
  safe: "#22c55e",
  balanced: "#f59e0b",
  aggressive: "#ef4444",
};

const STRATEGY_LABELS: Record<PayoffStrategy, string> = {
  safe: "Safe",
  balanced: "Balanced",
  aggressive: "Aggressive",
};

const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  safe: "Builds a cash buffer first.",
  balanced: "A moderate, hybrid path.",
  aggressive: "Fastest debt elimination.",
};

function formatK(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${Math.round(amount / 1000)}K`;
  return `₹${Math.round(amount)}`;
}

/** Indian grouping only — use a single leading ₹ in the UI to cut clutter on mobile. */
function formatInrDigits(amount: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(amount));
}

/** Claude sometimes returns DTI as a decimal (0.38) and sometimes as a percent (38). Normalize to 0–100. */
function normalizeDti(ratio: number): number {
  return ratio < 2 ? Math.round(ratio * 100) : Math.round(ratio);
}

/** Gentle title case for city / occupation on the profile card */
function toTitleCasePhrase(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export default function Dashboard() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<DebtPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [strategyBusy, setStrategyBusy] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [generatingStrategy, setGeneratingStrategy] = useState<PayoffStrategy | null>(null);
  const [uiStrategy, setUiStrategy] = useState<PayoffStrategy>("balanced");
  const [activeTab, setActiveTab] = useState<DashTab>("overview");
  const [isTabMenuOpen, setIsTabMenuOpen] = useState(false);
  /** Schedule tab: show first month only until user expands (full table/cards). */
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const userPickedStrategy = useRef(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    userPickedStrategy.current = false;
  }, [submissionId]);

  useEffect(() => {
    removeRazorpayCheckoutScript();
  }, []);

  useEffect(() => {
    if (!plan?.planData || userPickedStrategy.current) return;
    setUiStrategy(getDefaultStrategyFromPlanData(plan.planData));
  }, [plan?.planData]);

  useEffect(() => {
    setScheduleExpanded(false);
  }, [uiStrategy, submissionId]);

  const fetchPlan = useCallback(async () => {
    if (!submissionId) return;
    try {
      const res = await api.get<DebtPlan>(`/plan/${submissionId}`);
      if (!res.data.paid) {
        navigate(`/teaser/${submissionId}`);
        return;
      }
      setPlan(res.data);
      if (res.data.planData) setError(null);
    } catch {
      setError("Could not load your plan. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [submissionId, navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/teaser/${submissionId}`);
      return;
    }
    void fetchPlan();
  }, [user, authLoading, fetchPlan, navigate, submissionId]);

  useEffect(() => {
    const shouldPoll = plan?.paid && !plan.planData;
    if (!shouldPoll) return;
    pollingRef.current = setInterval(() => {
      void fetchPlan();
    }, 2000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [plan?.paid, plan?.planData, fetchPlan]);

  const handleDownloadPDF = async () => {
    if (isGeneratingPdf || !plan?.planData) return;
    setIsGeneratingPdf(true);
    try {
      const { generateFinancialReport } = await import("../lib/pdfGenerator");
      generateFinancialReport(plan as DebtPlan, uiStrategy);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const regenerateWithStrategy = async (s: PayoffStrategy) => {
    if (!submissionId) return;
    setStrategyBusy(true);
    setGeneratingStrategy(s);
    setStrategyError(null);
    try {
      const res = await api.post<{ planData: NonNullable<DebtPlan["planData"]> }>(
        `/plan/${submissionId}/regenerate`,
        { strategy: s }
      );
      setPlan((prev) => (prev ? { ...prev, planData: res.data.planData } : prev));
    } catch {
      setStrategyError("Could not rebuild roadmap. Try again.");
    } finally {
      setStrategyBusy(false);
      setGeneratingStrategy(null);
    }
  };

  const handleRetryGeneration = async () => {
    await regenerateWithStrategy(uiStrategy);
  };

  // Multi-strategy chart data (all 4 strategies overlaid)
  const multiStrategyChartData = useMemo(() => {
    if (!plan?.planData || !isPlanDataV2(plan.planData)) return null;
    const v2 = plan.planData as PlanDataV2;
    const dateMap = new Map<string, Record<string, number | string>>();

    for (const [stratKey, slice] of Object.entries(v2.strategies)) {
      for (const row of slice.monthlySchedule) {
        if (!dateMap.has(row.date)) {
          dateMap.set(row.date, { name: row.date, _month: row.month });
        }
        dateMap.get(row.date)![stratKey] = row.remainingBalance;
      }
    }

    return Array.from(dateMap.values()).sort((a, b) => (a._month as number) - (b._month as number));
  }, [plan?.planData]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center gap-3 font-mono text-[13px] text-[#44475a] mb-3">
            <Loader2 className="w-4 h-4 text-[#5b5fc7] animate-spin" />
            <span>loading plan data...</span>
          </div>
          <div className="font-mono text-[11px] text-[#2d2d3a]">// please wait</div>
        </div>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div
          className="text-center max-w-sm rounded-lg p-7"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="font-mono text-[12px] text-[#f87171] mb-5 leading-relaxed">
            <span className="text-[#ef4444] mr-1">!</span>{error}
          </p>
          <Button onClick={fetchPlan} variant="outline" size="sm" className="font-mono text-[12px]">
            [ RETRY ]
          </Button>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  if (plan.paid && !plan.planData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-16" style={{ background: "#08080f" }}>
        <div className="text-left max-w-lg w-full">
          <p className="cmd-label mb-2">// synthesis_job</p>
          <h2 className="font-sans text-xl font-semibold text-[#e2e4ec] mb-2">Synthesising your roadmap</h2>
          <p className="font-mono text-[12px] text-[#7b7f9a] leading-relaxed mb-4">
            Intelligent analysis builds <span className="text-[#dce1ea]">three</span> payoff strategies in one pass. This page refreshes automatically when data is ready.
          </p>
          <TerminalProgress active mode="synthesis" title="generate.log" className="mb-5" />
          <div className="flex items-center gap-3 font-mono text-[12px] text-[#44475a] mb-4">
            <Loader2 className="w-4 h-4 text-[#5b5fc7] animate-spin shrink-0" />
            <span>polling plan endpoint…</span>
          </div>
          {error && (
            <p className="font-mono text-[12px] text-[#f87171] mb-4">
              <span className="text-[#ef4444] mr-1">!</span>{error}
            </p>
          )}
          <Button onClick={handleRetryGeneration} variant="outline" size="sm" className="font-mono text-[12px]" disabled={strategyBusy}>
            {strategyBusy ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />REBUILDING...</>
            ) : (
              "[ RETRY_GENERATION ]"
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (generatingStrategy) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-16" style={{ background: "#08080f" }}>
        <div className="text-left max-w-lg w-full">
          <p className="cmd-label mb-2">// synthesis_job</p>
          <h2 className="font-sans text-xl font-semibold text-[#e2e4ec] mb-2 capitalize">
            Generating {generatingStrategy} strategy
          </h2>
          <p className="font-mono text-[12px] text-[#7b7f9a] leading-relaxed mb-4">
            Running intelligent analysis to project the exact month-by-month roadmap. This takes a few seconds...
          </p>
          <TerminalProgress active mode="synthesis" title={`generate_${generatingStrategy}.log`} className="mb-5" />
          <div className="flex items-center gap-3 font-mono text-[12px] text-[#44475a] mb-4">
            <Loader2 className="w-4 h-4 text-[#5b5fc7] animate-spin shrink-0" />
            <span>crunching numbers…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!plan.planData) return null;

  const view = getPlanView(plan.planData, uiStrategy);

  // ── Regen Modal (₹99) ──
  const RegenModal = regenModalOpen ? (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setRegenModalOpen(false); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 sm:p-8 relative"
        style={{
          background: "linear-gradient(135deg, rgba(15,15,24,0.98) 0%, rgba(8,8,15,0.99) 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        }}
      >
        <button
          type="button"
          onClick={() => setRegenModalOpen(false)}
          className="absolute top-4 right-4 text-[#44475a] hover:text-[#7b7f9a] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5fc7] mb-3">regenerate_report</p>
        <h3 className="font-sans text-[1.1rem] font-semibold text-[#e2e4ec] mb-2">Regenerate your report</h3>
        <p className="font-mono text-[12px] text-[#7b7f9a] leading-relaxed mb-6">
          Start fresh by entering updated details. You’ll pay ₹99 to unlock the new roadmap.
        </p>

        <div className="space-y-3 mb-5">
          <button
            type="button"
            onClick={() => {
              setRegenModalOpen(false);
              navigate("/create-plan?regen=1");
            }}
            className="w-full py-3 rounded-xl font-mono text-[12px] font-semibold tracking-wider transition-all"
            style={{
              background: "#5b5fc7",
              color: "white",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            [ START FRESH · ₹99 ]
          </button>
        </div>
      </div>
    </div>
  ) : null;
  if (!view) return null;

  const { summary, monthlySchedule, debtOrder, insights, quickWins, warnings, refinanceFlag } = view;
  const shared = isPlanDataV2(plan.planData) ? (plan.planData as PlanDataV2).shared : null;
  const spendsOverview = shared?.spendsOverview || [];

  const scheduleRowCount = monthlySchedule.length;
  const canExpandSchedule = scheduleRowCount > 1;
  const visibleScheduleRows =
    !canExpandSchedule || scheduleExpanded ? monthlySchedule : monthlySchedule.slice(0, 1);

  const planDataIsStale = false;

  return (
    <div className="min-h-screen pt-[4.75rem] sm:pt-20 pb-20 px-4" style={{ background: "#08080f" }}>
      {RegenModal}
      <div className="fixed inset-0 dot-grid pointer-events-none z-0" aria-hidden />

      <div className="relative z-[1] max-w-5xl mx-auto" ref={dashboardRef}>

        {plan.profile &&
          (plan.profile.name?.trim() || plan.profile.city?.trim() || plan.profile.occupation?.trim()) && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-8 overflow-hidden rounded-2xl px-6 py-8 sm:px-9 sm:py-10"
            style={{
              background:
                "linear-gradient(152deg, rgba(255,255,255,0.072) 0%, rgba(255,255,255,0.02) 42%, rgba(91,95,199,0.07) 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow:
                "0 28px 90px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.07)",
            }}
            aria-labelledby="dashboard-profile-heading"
          >
            <div
              className="pointer-events-none absolute -right-12 -top-28 size-[13rem] rounded-full opacity-90 blur-3xl"
              style={{ background: "radial-gradient(circle at center, rgba(91,95,199,0.28), transparent 70%)" }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-24 -left-16 size-[11rem] rounded-full opacity-70 blur-3xl"
              style={{ background: "radial-gradient(circle at center, rgba(255,255,255,0.06), transparent 70%)" }}
              aria-hidden
            />
            <p className="relative font-sans text-[11px] font-semibold uppercase tracking-[0.3em] text-[#9ea6bf]">
              Built for you
            </p>
            <h2
              id="dashboard-profile-heading"
              className="relative mt-3 font-display text-[clamp(1.875rem,5.5vw,3rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-[#fafbfc] text-balance"
            >
              {plan.profile.name?.trim() ? plan.profile.name.trim() : "Your debt-free plan"}
            </h2>
            {(() => {
              const subtitle = [plan.profile.city, plan.profile.occupation]
                .map((s) => (typeof s === "string" ? s.trim() : ""))
                .filter(Boolean)
                .map(toTitleCasePhrase)
                .join(" · ");
              return subtitle ? (
                <p className="relative mt-4 max-w-xl font-sans text-[15px] font-normal leading-[1.55] text-[#aeb6cf] sm:text-[17px]">
                  {subtitle}
                </p>
              ) : null;
            })()}
          </motion.section>
        )}

        {/* Strategy + DTI — directly under hero profile */}
        <div
          className="-mx-4 mb-5 flex flex-wrap items-center justify-center gap-2 border-b border-white/[0.07] bg-[rgba(8,8,15,0.72)] px-4 py-2.5 backdrop-blur-xl sm:-mx-0 sm:mb-6 sm:rounded-lg sm:border sm:border-white/[0.08] sm:px-3 sm:py-2.5"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
          aria-label="Active plan context"
        >
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STRATEGY_COLORS[uiStrategy] }} />
            <span className="font-sans text-[11px] font-medium text-[#b4b9f5] capitalize whitespace-nowrap">
              {uiStrategy.replace(/_/g, " ")} Strategy
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span className="font-sans text-[10px] font-medium text-[#7b7f9a] tracking-tight whitespace-nowrap">
              Debt to income
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#e2e4ec] tabular-nums">
              {normalizeDti(summary.debtToIncomeRatio)}%
            </span>
          </div>
        </div>

        {/* Title + actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <h1 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-[#e2e4ec] shrink-0">
            Your debt-free timeline
          </h1>
          <div className="flex w-full min-w-0 gap-2 sm:w-auto sm:items-center sm:justify-end">
            <Button
              onClick={() => {
                setRegenModalOpen(true);
              }}
              size="sm"
              variant="outline"
              className="h-9 flex-1 basis-0 font-sans sm:h-9 sm:flex-initial sm:font-mono text-[11px] sm:tracking-wider gap-2 justify-center"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
              <span className="sm:hidden">Regenerate</span>
              <span className="hidden sm:inline">[ REGENERATE ]</span>
            </Button>
            <Button
              onClick={handleDownloadPDF}
              size="sm"
              disabled={isGeneratingPdf}
              className="h-9 flex-1 basis-0 font-sans sm:h-9 sm:flex-initial sm:font-mono text-[11px] sm:tracking-wider gap-2 justify-center"
            >
              {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" /> : <Download className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />}
              {isGeneratingPdf ? (
                <>
                  <span className="sm:hidden">Exporting…</span>
                  <span className="hidden sm:inline">[ EXPORTING_PDF... ]</span>
                </>
              ) : (
                <>
                  <span className="sm:hidden">Export PDF</span>
                  <span className="hidden sm:inline">[ EXPORT_PDF ]</span>
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {refinanceFlag?.active && refinanceFlag.debts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl box-border overflow-hidden p-5 sm:p-6"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)",
              border: "1px solid rgba(245,158,11,0.35)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
            role="status"
          >
            <div className="min-w-0">
              <div className="flex items-start gap-2.5 sm:gap-3 mb-3">
                <span className="shrink-0 inline-flex mt-[0.2em] text-amber-400/95" aria-hidden>
                  <Flag className="w-4 h-4 sm:w-[1.125rem] sm:h-[1.125rem]" strokeWidth={2} />
                </span>
                <h3 className="font-display min-w-0 flex-1 text-[15px] sm:text-[1.05rem] font-medium tracking-[-0.02em] text-[#fef3c7] leading-snug">
                  Consider refinancing or consolidating
                </h3>
              </div>
              <p className="font-sans text-[13px] sm:text-[14px] text-[#b4bccf] leading-[1.65] text-pretty mb-5 w-full break-words hyphens-none">
                On scheduled minimums alone, these balances do not shrink (minimum payment does not clear monthly interest). Compare formal consolidation, balance transfer, or top-up loan quotes against staying on this payoff plan — fees, blended APR, tenure, and discipline after clearing cards all matter.
              </p>
              <p className="font-sans text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b95a8] mb-2.5">
                Priority by APR · worst first
              </p>
              <ol className="list-none m-0 p-0 space-y-0 border-t border-white/[0.07] min-w-0">
                {refinanceFlag.debts.map((d, idx) => (
                  <li
                    key={`${d.name}-${d.interestRateApr}`}
                    className="flex gap-3 sm:gap-3.5 py-3 border-b border-white/[0.05] last:border-b-0 min-w-0"
                  >
                    <span
                      className="font-mono text-[11px] sm:text-xs font-medium tabular-nums text-amber-400/75 w-5 shrink-0 pt-0.5 text-right"
                      aria-hidden
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-sans text-[13px] sm:text-[14px] font-medium tracking-[-0.01em] text-[#f1f5f9] leading-snug break-words">
                        {d.name}
                      </p>
                      <div className="font-sans text-[12px] sm:text-[13px] leading-snug text-[#8b95a8] flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums">
                        <span className="text-[#cbd5e1] shrink-0">{d.interestRateApr}% APR</span>
                        <span className="text-[#5c6578] shrink-0" aria-hidden>
                          ·
                        </span>
                        <span className="break-words">{formatCurrency(d.balance)}</span>
                        <span className="text-[#5c6578] shrink-0" aria-hidden>
                          ·
                        </span>
                        <span className="capitalize text-[#7b8499] shrink-0">
                          {d.type === "credit_card" ? "Credit card" : "Loan"}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}

        {/* Stale plan warning */}
        {planDataIsStale && (
          <div className="mb-5 flex items-start gap-3 rounded-lg px-4 py-3 font-mono text-[12px]"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}
          >
            <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
            <div>
              <span className="text-[#f59e0b] font-semibold">Plan data needs refresh.</span>
              <span className="text-[#7b7f9a] ml-1">
                All strategies are showing identical results — this plan was generated with an older model prompt.
              </span>
              <button
                onClick={() => void regenerateWithStrategy(uiStrategy)}
                disabled={strategyBusy}
                className="ml-2 text-[#f59e0b] underline underline-offset-2 hover:text-[#fbbf24] disabled:opacity-50"
              >
                {strategyBusy ? "Regenerating…" : "Regenerate now →"}
              </button>
            </div>
          </div>
        )}

        {/* Tab navigation - Mobile */}
        <div className="sm:hidden mb-6 relative z-30">
          <button
            onClick={() => setIsTabMenuOpen(!isTabMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg font-sans text-[14px] font-medium text-[#e2e4ec]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            {TABS.find((t) => t.id === activeTab)?.label}
            <ChevronDown className={cn("w-4 h-4 text-[#7b7f9a] transition-transform", isTabMenuOpen && "rotate-180")} />
          </button>
          <AnimatePresence>
            {isTabMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 w-full mt-2 rounded-lg overflow-hidden border"
                style={{ background: "#11121a", borderColor: "rgba(255,255,255,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
              >
                <div className="flex flex-col py-1">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsTabMenuOpen(false);
                      }}
                      className={cn(
                        "text-left px-4 py-3 font-sans text-[14px] transition-colors",
                        activeTab === tab.id
                          ? "bg-white/[0.06] text-white font-medium"
                          : "text-[#aeb6cf] hover:bg-white/[0.03] hover:text-white"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tab navigation - Desktop */}
        <div className="hidden sm:block w-full overflow-x-auto pb-2 mb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex items-center gap-1 p-1 rounded-lg w-max"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-1.5 rounded-md font-sans text-[13px] font-medium transition-all duration-150 shrink-0",
                  activeTab === tab.id
                    ? "bg-white text-[#08080f]"
                    : "text-[#7b7f9a] hover:text-[#e2e4ec]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>

            {/* Stat cards */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 lg:grid-cols-4 mb-10 rounded-2xl relative overflow-hidden"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 30px rgba(0,0,0,0.2)"
              }}
            >
              {[
                { label: "TOTAL DEBT", value: formatCurrency(summary.totalDebt), sub: "starting balance" },
                { label: "PAYOFF", value: `${summary.estimatedPayoffMonths} mo`, sub: summary.estimatedPayoffDate },
                {
                  label: summary.baselineIsInfinite ? "INTEREST COST" : "INTEREST SAVED",
                  value: summary.baselineIsInfinite
                    ? formatK(summary.totalInterestPaid)
                    : summary.totalInterestSaved > 0 ? formatK(summary.totalInterestSaved) : "—",
                  sub: summary.baselineIsInfinite
                    ? "minimum payments compound forever on credit card"
                    : "vs min payments",
                },
                { label: "DTI RATIO", value: `${normalizeDti(summary.debtToIncomeRatio)}%`, sub: "debt-to-income" },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className={cn(
                    "p-5 sm:p-7 relative",
                    i % 2 !== 0 && "border-l border-white/[0.04]",
                    i > 1 && "border-t border-white/[0.04] lg:border-t-0",
                    i > 0 && "lg:border-l lg:border-white/[0.04]"
                  )}
                >
                  <p className="font-mono text-[10px] text-[#7b7f9a] uppercase tracking-[0.18em] mb-3">{s.label}</p>
                  <p className="font-mono text-[22px] sm:text-[28px] font-bold tabular-nums text-[#e2e4ec] tracking-tight leading-none mb-2">
                    {s.value}
                  </p>
                  <p className="font-mono text-[11px] text-[#44475a]">{s.sub}</p>
                </div>
              ))}
            </motion.div>

            {/* Strategy comparison — select to switch view */}
            <div className="mb-10">
              <div className="flex items-center gap-4 mb-5 px-1 opacity-70">
                 <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/[0.1]" />
                 <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#44475a]">
                    Select a Strategy
                 </span>
                 <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/[0.1]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {isPlanDataV2(plan.planData)
                  ? PAYOFF_STRATEGY_OPTIONS.map((opt) => {
                      const slice = (plan.planData as PlanDataV2).strategies[opt.value];
                      const isGenerating = !slice;
                      
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={strategyBusy}
                          onClick={() => {
                            userPickedStrategy.current = true;
                            setUiStrategy(opt.value);
                            setStrategyError(null);
                          }}
                          className={cn(
                            "text-left rounded-2xl p-5 sm:p-6 border transition-all duration-300 group relative overflow-hidden",
                            uiStrategy === opt.value
                              ? "border-white/30 bg-white/[0.04]"
                              : "border-white/[0.06] bg-transparent hover:border-white/[0.15] hover:bg-white/[0.02]",
                            isGenerating && "border-dashed hover:border-solid opacity-60 hover:opacity-100"
                          )}
                        >
                          {uiStrategy === opt.value && (
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                          )}
                          <div className="flex flex-col h-full">
                            <div className="flex items-start justify-between mb-5">
                              <div className="pr-2">
                                <p className={cn(
                                  "font-sans text-[15px] font-semibold tracking-tight",
                                  uiStrategy === opt.value ? "text-[#e2e4ec]" : "text-[#b4b9f5]"
                                )}>
                                  {opt.label}
                                </p>
                                <p className="font-sans text-[12px] text-[#7b7f9a] mt-0.5 leading-snug">
                                  {STRATEGY_DESCRIPTIONS[opt.value]}
                                </p>
                              </div>
                              {isGenerating ? (
                                <div className="mt-1 animate-pulse h-5 w-16 bg-white/[0.05] rounded shrink-0" />
                              ) : (
                                (slice!.summary.baselineIsInfinite || slice!.summary.totalInterestSaved > 0) && (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] shrink-0 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: STRATEGY_COLORS[opt.value] }} />
                                    <span className="font-mono text-[10px] font-semibold text-[#e2e4ec] tracking-wide">
                                      {slice!.summary.baselineIsInfinite
                                        ? `${formatK(slice!.summary.totalInterestPaid)} interest`
                                        : `saves ${formatK(slice!.summary.totalInterestSaved)}`}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                            
                            {isGenerating ? (
                              <div className="mt-auto pt-2 flex items-center gap-2 text-[#7b7f9a] group-hover:text-[#b4b9f5] transition-colors">
                                <span className="font-mono text-[11px] uppercase tracking-widest font-semibold flex items-center gap-2">
                                  Tap to generate <span className="opacity-50">→</span>
                                </span>
                              </div>
                            ) : (
                              <div className="mt-auto pt-2 flex items-baseline gap-1.5">
                                <p className="font-display text-[36px] font-bold text-[#e2e4ec] leading-none tracking-tight">
                                  {slice!.summary.estimatedPayoffMonths}
                                </p>
                                <p className="font-mono text-[12px] text-[#7b7f9a] uppercase tracking-wider font-medium">months</p>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  : PAYOFF_STRATEGY_OPTIONS.map((opt) => (
                    // Old-format plan: strategy data doesn't exist yet.
                    // Gate regeneration behind the ₹99 modal — never regenerate for free.
                    <button
                      key={opt.value}
                      type="button"
                      disabled={strategyBusy}
                      onClick={() => {
                        userPickedStrategy.current = true;
                        setUiStrategy(opt.value);
                        setRegenModalOpen(true);
                      }}
                      className={cn(
                        "text-left rounded-2xl p-5 sm:p-6 border transition-all duration-300 relative overflow-hidden",
                        uiStrategy === opt.value
                          ? "border-white/30 bg-white/[0.04]"
                          : "border-white/[0.06] bg-transparent hover:border-white/[0.15]"
                      )}
                    >
                      {uiStrategy === opt.value && (
                         <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                      )}
                      <p className="font-sans text-[13px] font-medium text-[#b4b9f5] mb-1">{opt.label}</p>
                      <p className="font-mono text-[11px] text-[#5b5fc7] mt-1">regenerate to unlock →</p>
                      {strategyBusy && uiStrategy === opt.value && (
                        <Loader2 className="w-4 h-4 animate-spin text-[#5b5fc7]" />
                      )}
                    </button>
                  ))}
              </div>
              {strategyError && (
                <p className="font-mono text-[11px] text-[#f87171] px-5 pb-4">
                  <span className="text-[#ef4444] mr-1">!</span>{strategyError}
                </p>
              )}
            </div>

            {/* Multi-strategy balance chart */}
            <div className="hidden sm:block rounded-lg overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="p-5">
                <div className="flex items-center gap-4 flex-wrap mb-4">
                  {PAYOFF_STRATEGY_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-1.5">
                      <div className="w-3 h-[2px] rounded-full" style={{ background: STRATEGY_COLORS[opt.value] }} />
                      <span className="font-mono text-[11px] text-[#7b7f9a]">{opt.label}</span>
                    </div>
                  ))}
                </div>
                <div className="w-full h-64 sm:h-72 overflow-x-auto overflow-y-hidden">
                  <div style={{ minWidth: multiStrategyChartData && multiStrategyChartData.length > 8 ? 700 : "100%", height: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={multiStrategyChartData ?? []}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#44475a", fontFamily: "JetBrains Mono, monospace" }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#44475a", fontFamily: "JetBrains Mono, monospace" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => {
                          if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
                          return `₹${(v / 1000).toFixed(0)}K`;
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#1e1e2e",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 6,
                          fontSize: 11,
                          fontFamily: "JetBrains Mono, monospace",
                          color: "#e2e4ec",
                        }}
                        formatter={(value: any, name: any) => [
                          formatCurrency(Number(value) || 0),
                          STRATEGY_LABELS[String(name) as PayoffStrategy] ?? String(name),
                        ]}
                        labelStyle={{ color: "#7b7f9a", marginBottom: 4 }}
                      />
                      <Legend wrapperStyle={{ display: "none" }} />
                      {PAYOFF_STRATEGY_OPTIONS.map((opt) => (
                        <Line
                          key={opt.value}
                          type="monotone"
                          dataKey={opt.value}
                          stroke={STRATEGY_COLORS[opt.value]}
                          strokeWidth={uiStrategy === opt.value ? 2 : 1.5}
                          dot={false}
                          strokeDasharray={uiStrategy === opt.value ? undefined : "4 2"}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── ROADMAP TAB ── */}
        {activeTab === "roadmap" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
            <div className="mb-8">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#44475a] mb-2">
                STEP-BY-STEP ROADMAP
              </p>
              <p className="font-sans text-[13px] text-[#7b7f9a] leading-relaxed">
                Follow this dynamic month-by-month guide based on the <span className="text-[#e2e4ec] capitalize font-medium">{uiStrategy.replace(/_/g, " ")}</span> strategy. Focus on these direct actions.
              </p>
            </div>
            
            <div className="relative border-l border-white/[0.08] ml-3 sm:ml-4 space-y-6 sm:space-y-8 py-2">
              {monthlySchedule.map((m) => (
                <div key={m.month} className="relative pl-5 sm:pl-8">
                  {/* Timeline Dot */}
                  <div 
                    className="absolute w-3 h-3 rounded-full top-[22px]"
                    style={{ 
                      left: "-6.5px", // Centers 12px dot on 1px border
                      background: STRATEGY_COLORS[uiStrategy] || "#5b8dee",
                      boxShadow: "0 0 0 4px #08080f"
                    }}
                  />
                  
                  {/* Content Box */}
                  <div className="rounded-xl p-5 sm:p-6 transition-all hover:bg-white/[0.02]" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-4 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <h3 className="font-sans text-[18px] font-semibold text-[#e2e4ec]">
                        Month {m.month} <span className="text-[#7b7f9a] font-normal text-[14px] ml-1">· {m.date}</span>
                      </h3>
                      <p className="font-mono text-[11px] text-[#44475a] mt-1 sm:mt-0 uppercase tracking-widest">
                        Total Output <span className="text-[#b4b9f5] font-semibold ml-2 text-[13px]">{formatCurrency(m.totalPayment)}</span>
                      </p>
                    </div>
                    
                    {m.roadmapAction && (
                      <p className="font-sans text-[15px] text-[#dce1ea] leading-relaxed mb-5">
                        {m.roadmapAction}
                      </p>
                    )}
                    
                    {m.paymentBreakdown && m.paymentBreakdown.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                        {m.paymentBreakdown.map((bd, i) => (
                          <div key={i} className="flex justify-between items-center text-[12px] font-mono px-3.5 py-2.5 rounded-lg" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.03)" }}>
                            <span className="text-[#7b7f9a] min-w-0 break-words pr-3">{bd.name}</span>
                            <span className="text-[#e2e4ec] font-semibold shrink-0">{formatCurrency(bd.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── SCHEDULE TAB ── */}
        {activeTab === "schedule" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>

            {/* Strategy / Payoff date / Monthly payment header */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 sm:grid-cols-3 mb-8 rounded-2xl relative overflow-hidden"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 30px rgba(0,0,0,0.2)"
              }}
            >
              {[
                { label: "STRATEGY", value: uiStrategy.replace(/_/g, " "), sub: null },
                { label: "PAYOFF DATE", value: summary.estimatedPayoffDate, sub: `${summary.estimatedPayoffMonths} months` },
                { label: "MONTHLY PAYMENT", value: monthlySchedule[0] ? formatCurrency(monthlySchedule[0].totalPayment) : "—", sub: "All debts combined · approx." }
              ].map((s, i) => (
                <div
                  key={s.label}
                  className={cn(
                    "p-5 sm:p-7 relative",
                    i > 0 && "border-t border-white/[0.04] sm:border-t-0 sm:border-l sm:border-white/[0.04]"
                  )}
                >
                  <p className="font-mono text-[10px] text-[#7b7f9a] uppercase tracking-[0.18em] mb-3">{s.label}</p>
                  <p className="font-sans text-[22px] sm:text-[26px] font-semibold text-[#e2e4ec] tracking-tight leading-none mb-2 capitalize">
                    {s.value}
                  </p>
                  {s.sub && (
                    <p className="font-mono text-[11px] text-[#44475a]">{s.sub}</p>
                  )}
                </div>
              ))}
            </motion.div>

            <div className="rounded-lg overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {canExpandSchedule ? (
                <button
                  type="button"
                  onClick={() => setScheduleExpanded((e) => !e)}
                  aria-expanded={scheduleExpanded}
                  aria-label={
                    scheduleExpanded
                      ? "Collapse repayment schedule"
                      : `Expand repayment schedule (${scheduleRowCount} months)`
                  }
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b92a8]">
                    Monthly repayment schedule
                  </span>
                  <span className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-[#7b7f9a]">
                    {!scheduleExpanded ? (
                      <span className="tabular-nums max-w-[5.5rem] truncate text-right">{`1 / ${scheduleRowCount}`}</span>
                    ) : (
                      <span className="hidden sm:inline">Show less</span>
                    )}
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-[#b4b9f5] transition-transform duration-200",
                        scheduleExpanded && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </span>
                </button>
              ) : (
                <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b92a8]">
                    Monthly repayment schedule
                  </span>
                </div>
              )}

              <p className="mx-3 lg:mx-4 mt-3 mb-2 lg:mt-3 lg:mb-3 font-sans text-[11px] text-[#7b7f9a] leading-relaxed">
                Each row is your{" "}
                <span className="text-[#b8bdd0]">total cash outflow for every debt that month</span>
                {" "}(EMIs/minimums plus extra).{" "}
                <span className="text-[#b8bdd0]">Principal</span> and{" "}
                <span className="text-[#b8bdd0]">interest</span> are sums across the whole portfolio — not one loan.{" "}
                <span className="text-[#b8bdd0]">Total balance</span> is combined outstanding. Extra rupees follow your{" "}
                <span className="text-[#dce1ea] capitalize">{uiStrategy.replace(/_/g, " ")}</span> priority — see the{" "}
                <span className="text-[#b8bdd0]">Debts</span> tab.
              </p>

              {/* Mobile / tablet: compact cards */}
              <div className="lg:hidden flex flex-col gap-4 px-3 pb-4 pt-2">
                {visibleScheduleRows.map((m) => (
                  <div
                    key={m.month}
                    className="rounded-2xl p-4 relative overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    {/* Header Row */}
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <p className="font-mono text-[10px] text-[#7b7f9a] uppercase tracking-wider mb-1.5">
                          Month {m.month}
                        </p>
                        <p className="font-sans text-[16px] font-semibold text-[#e2e4ec] leading-none">
                          {m.date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#7d8499] mb-1.5">
                          Total Payment
                        </p>
                        <p className="font-mono text-[16px] font-bold tabular-nums text-[#e2e4ec] leading-none">
                          ₹{formatInrDigits(m.totalPayment)}
                        </p>
                        {m.paymentBreakdown ? (
                          <div className="font-mono text-[10px] text-[#5f6573] mt-2 flex flex-col items-end gap-0.5">
                            {m.paymentBreakdown.slice(0, 2).map((b, i) => (
                              <div key={i} className="min-w-0 max-w-[140px] break-words text-right leading-snug">
                                {b.name}
                              </div>
                            ))}
                            {m.paymentBreakdown.length > 2 && <div>+{m.paymentBreakdown.length - 2} more</div>}
                          </div>
                        ) : (
                          <p className="font-mono text-[10px] text-[#5f6573] mt-2">All debts</p>
                        )}
                      </div>
                    </div>

                    {/* Breakdown Row */}
                    <div className="mb-4 p-3.5 rounded-xl" style={{ background: "rgba(0,0,0,0.2)" }}>
                      <div className="grid grid-cols-2 gap-3 mb-2.5">
                        <div>
                           <p className="font-mono text-[9px] uppercase tracking-wider text-[#7d8499] mb-1.5">Principal</p>
                           <p className="font-mono text-[13px] font-semibold text-[#34d399]">₹{formatInrDigits(m.principalPaid)}</p>
                        </div>
                        <div className="text-right">
                           <p className="font-mono text-[9px] uppercase tracking-wider text-[#7d8499] mb-1.5">Interest</p>
                           <p className="font-mono text-[13px] font-semibold text-[#fb7185]">₹{formatInrDigits(m.interestPaid)}</p>
                        </div>
                      </div>
                      
                      {/* Inline Progress Bar */}
                      {(() => {
                        const total = m.principalPaid + m.interestPaid;
                        const principalPct = total > 0 ? (m.principalPaid / total) * 100 : 0;
                        return (
                          <div className="w-full h-1.5 flex rounded-full overflow-hidden bg-white/[0.05]">
                            <div className="h-full bg-[#34d399]" style={{ width: `${principalPct}%` }} />
                            <div className="h-full bg-[#fb7185]" style={{ width: `${100 - principalPct}%` }} />
                          </div>
                        );
                      })()}
                    </div>

                    {/* Footer Row */}
                    <div className="flex justify-between items-end pt-1">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-[#7d8499]">Total Balance</span>
                      <span className="font-mono text-[14px] font-semibold tabular-nums text-[#b4b9f5]">
                        ₹{formatInrDigits(m.remainingBalance)}
                      </span>
                    </div>

                    {m.debtsCleared.length > 0 && (
                      <div className="mt-4 pt-4" style={{ borderTop: "1px dashed rgba(255,255,255,0.06)" }}>
                        <p className="font-mono text-[10px] font-semibold leading-snug text-[#34d399] flex items-center gap-1.5">
                          <Zap className="w-3 h-3" /> Paid off: {m.debtsCleared.join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop: full-width table */}
              <div className="hidden lg:block">
                <div className="grid grid-cols-[2.5rem_5.5rem_minmax(7.5rem,1.5fr)_minmax(5rem,1fr)_minmax(5rem,1fr)_minmax(6rem,1fr)_minmax(7.5rem,1.5fr)] gap-x-3 gap-y-0 px-4 py-2.5 font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.1em] text-[#44475a] leading-tight"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span>#</span>
                  <span>Date</span>
                  <span className="text-right" title="Combined outflow for every debt this month">
                    Total payment
                  </span>
                  <span className="text-right" title="Principal summed across all debts">
                    Principal
                  </span>
                  <span className="text-right" title="Interest summed across all debts">
                    Interest
                  </span>
                  <span className="text-right" title="Combined outstanding balance">
                    Total balance
                  </span>
                  <span title="Debts closed after this month’s payment">Paid off</span>
                </div>
                <div
                  className={cn(
                    "divide-y divide-white/[0.04] overscroll-contain",
                    scheduleExpanded ? "max-h-[min(70vh,32rem)] overflow-y-auto" : ""
                  )}
                >
                  {visibleScheduleRows.map((m) => (
                    <div
                      key={m.month}
                      className="grid grid-cols-[2.5rem_5.5rem_minmax(7.5rem,1.5fr)_minmax(5rem,1fr)_minmax(5rem,1fr)_minmax(6rem,1fr)_minmax(7.5rem,1.5fr)] gap-x-3 px-4 py-3 items-start font-mono text-[12px]"
                    >
                      <span className="text-[#44475a] tabular-nums">{m.month}</span>
                      <span className="text-[#7b7f9a] whitespace-nowrap">{m.date}</span>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[#e2e4ec] tabular-nums font-semibold">{formatCurrency(m.totalPayment)}</span>
                        {m.paymentBreakdown && m.paymentBreakdown.length > 0 && (
                          <div className="text-[9px] text-[#7b7f9a] mt-1 space-y-0.5">
                            {m.paymentBreakdown.slice(0, 2).map((b, i) => (
                              <div key={i} className="min-w-0 max-w-full break-words leading-snug">
                                {b.name}
                              </div>
                            ))}
                            {m.paymentBreakdown.length > 2 && <div>+{m.paymentBreakdown.length - 2} more</div>}
                          </div>
                        )}
                      </div>
                      <span className="text-[#22c55e] tabular-nums text-right">{formatCurrency(m.principalPaid)}</span>
                      <span className="text-[#f87171] tabular-nums text-right">{formatCurrency(m.interestPaid)}</span>
                      <span className="text-[#e2e4ec] tabular-nums text-right">{formatCurrency(m.remainingBalance)}</span>
                      <span className="min-w-0 self-center">
                        {m.debtsCleared.length > 0 ? (
                          <span
                            className="inline-block max-w-full whitespace-normal break-words px-2 py-1 rounded text-[10px] font-semibold text-[#22c55e] leading-snug text-left"
                            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
                          >
                            ✓ {m.debtsCleared.join(", ")}
                          </span>
                        ) : (
                          <span className="text-[#2d2d3a]">—</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── DEBTS TAB ── */}
        {activeTab === "debts" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#44475a] mb-4">
              DEBT PRIORITY ORDER
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {debtOrder.map((d) => {
                const priorityColors = ["#5b8dee", "#22c55e", "#f59e0b", "#ec4899", "#a78bfa", "#06b6d4"];
                const color = priorityColors[(d.priority - 1) % priorityColors.length];
                return (
                  <div
                    key={d.name}
                    className="rounded-lg p-4 relative"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {/* Priority badge */}
                    <div
                      className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold"
                      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
                    >
                      #{d.priority}
                    </div>

                    <p className="font-sans text-[14px] font-semibold text-[#e2e4ec] pr-8 leading-tight mb-0.5">
                      {d.name}
                    </p>
                    <p className="font-mono text-[10px] text-[#44475a] mb-3 capitalize">
                      {d.type.replace(/_/g, " ")} · {d.interestRate}% p.a.
                    </p>

                    <p className="font-mono text-[22px] font-bold tabular-nums leading-none mb-3" style={{ color }}>
                      {formatCurrency(d.balance)}
                    </p>

                    {/* Progress bar */}
                    <div className="h-[2px] rounded-full mb-3" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, (d.payoffMonth / summary.estimatedPayoffMonths) * 100)}%`, background: color }}
                      />
                    </div>

                    <div className="flex justify-between font-mono text-[11px] text-[#44475a]">
                      <span>
                        Payoff: <span className="text-[#7b7f9a]">month {d.payoffMonth}</span>
                      </span>
                      <span>
                        Interest: <span className="text-[#7b7f9a]">{formatK(d.totalInterestPaid)}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── INSIGHTS TAB ── */}
        {activeTab === "insights" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>

            {/* Summary header row */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 sm:grid-cols-3 mb-8 rounded-2xl relative overflow-hidden"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 30px rgba(0,0,0,0.2)"
              }}
            >
              {[
                { label: "BEST STRATEGY", value: uiStrategy.replace(/_/g, " "), sub: "your selection" },
                { label: "PAYOFF DATE", value: summary.estimatedPayoffDate, sub: "freedom day" },
                {
                  label: summary.baselineIsInfinite ? "INTEREST COST" : "INTEREST SAVED",
                  value: summary.baselineIsInfinite ? formatK(summary.totalInterestPaid) : formatK(summary.totalInterestSaved),
                  sub: summary.baselineIsInfinite ? "minimum payments compound forever on credit card" : "real money back",
                }
              ].map((s, i) => (
                <div
                  key={s.label}
                  className={cn(
                    "p-5 sm:p-7 relative",
                    i > 0 && "border-t border-white/[0.04] sm:border-t-0 sm:border-l sm:border-white/[0.04]"
                  )}
                >
                  <p className="font-mono text-[10px] text-[#7b7f9a] uppercase tracking-[0.18em] mb-3">{s.label}</p>
                  <p className="font-sans text-[22px] sm:text-[26px] font-semibold text-[#e2e4ec] tracking-tight leading-none mb-2 capitalize">
                    {s.value}
                  </p>
                  {s.sub && (
                    <p className="font-mono text-[11px] text-[#44475a]">{s.sub}</p>
                  )}
                </div>
              ))}
            </motion.div>

            {/* Spends Overview */}
            {spendsOverview && spendsOverview.length > 0 && (
              <div className="mb-8">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#44475a] mb-4">
                  SPENDS OVERVIEW
                </p>
                <div className="space-y-3">
                  {spendsOverview.map((spend, idx) => (
                    <div key={idx} className="rounded-md p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-sans text-[14px] font-semibold text-[#e2e4ec]">
                          {expenseCategoryLabel(spend.category)}
                        </span>
                        <span className={cn("text-[9px] uppercase font-mono px-2 py-0.5 rounded tracking-wide", spend.status === "on_track" ? "text-[#22c55e] bg-[#22c55e]/10" : "text-[#f59e0b] bg-[#f59e0b]/10")}>
                          {spend.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="font-mono text-[16px] font-bold text-[#e2e4ec] mb-2">{formatCurrency(spend.amount)}</p>
                      <p className="font-sans text-[13px] text-[#b4b9f5] leading-relaxed">{spend.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Insights */}
            <div className="mb-8">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#44475a] mb-4">
                KEY INSIGHTS
              </p>
              <div className="space-y-3">
                {insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 pb-3"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <Lightbulb className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
                    <p className="font-sans text-[13px] text-[#b4b9f5] leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Wins */}
            <div className="mb-8">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#44475a] mb-4">
                QUICK WINS
              </p>
              <div className="space-y-3">
                {quickWins.map((win, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 pb-3"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <Zap className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                    <p className="font-sans text-[13px] text-[#b4b9f5] leading-relaxed">{win}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Warnings */}
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#44475a] mb-4">
                WARNINGS
              </p>
              {warnings.length === 0 ? (
                <p className="font-sans text-[13px] text-[#22c55e]">No urgent flags for this scenario.</p>
              ) : (
                <div className="space-y-3">
                  {warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 pb-3"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
                      <p className="font-sans text-[13px] text-[#b4b9f5] leading-relaxed">{w}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
