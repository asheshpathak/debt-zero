import { forwardRef } from "react";
import { DebtPlan, PlanDataV2 } from "../types";
import { Zap, AlertTriangle, Lightbulb } from "lucide-react";

function formatInrDigits(amount: number): string {
  if (amount == null) return "0";
  return amount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
    useGrouping: true,
  });
}

export const PDFReportTemplate = forwardRef<HTMLDivElement, { plan: DebtPlan; strategy: string }>(
  ({ plan, strategy }, ref) => {
    if (!plan.planData) return null;
    const v2 = plan.planData as PlanDataV2;
    const stratData = v2.strategies[strategy as keyof typeof v2.strategies];
    if (!stratData) return null;

    return (
      <div 
        ref={ref} 
        className="bg-[#f8fafc] text-slate-900 font-sans p-10 w-[800px] flex flex-col gap-8 mx-auto"
        style={{ minHeight: '1131px' }}
      >
        {/* HEADER */}
        <div className="flex justify-between items-end border-b-2 border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Financial Diagnostic</h1>
            <p className="text-sm font-mono text-slate-500 uppercase tracking-widest">Debt Zero Patient Report</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-slate-700">{plan.profile?.name || "Client"}</p>
            <p className="text-slate-500">{plan.profile?.city || "Location unknown"}</p>
            <p className="text-slate-500 mt-1 font-mono">{new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Strategy</p>
            <p className="text-2xl font-bold text-slate-800 capitalize">{strategy.replace(/_/g, " ")}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payoff Date</p>
            <p className="text-2xl font-bold text-slate-800">{stratData.summary.estimatedPayoffDate}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-purple-500">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {stratData.summary.baselineIsInfinite ? "Interest Cost" : "Interest Saved"}
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {stratData.summary.baselineIsInfinite
                ? `₹${formatInrDigits(stratData.summary.totalInterestPaid)}`
                : `₹${formatInrDigits(stratData.summary.totalInterestSaved)}`}
            </p>
          </div>
        </div>

        {/* KEY OBSERVATIONS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Clinical Observations</h2>
          </div>
          <div className="p-6 flex flex-col gap-6">
            {v2.shared.warnings && v2.shared.warnings.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4" /> Critical Warnings
                </h3>
                <ul className="space-y-2 text-sm text-slate-700 leading-relaxed list-disc pl-5">
                  {v2.shared.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            {v2.shared.insights && v2.shared.insights.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4" /> Key Insights
                </h3>
                <ul className="space-y-2 text-sm text-slate-700 leading-relaxed list-disc pl-5">
                  {v2.shared.insights.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            {v2.shared.quickWins && v2.shared.quickWins.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4" /> Prescribed Actions
                </h3>
                <ul className="space-y-2 text-sm text-slate-700 leading-relaxed list-disc pl-5">
                  {v2.shared.quickWins.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* LEDGER TABLE */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-4">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Amortization Ledger</h2>
          </div>
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-mono">
              <tr>
                <th className="px-6 py-4 font-semibold">Mth</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Payment</th>
                <th className="px-6 py-4 font-semibold text-right">Principal</th>
                <th className="px-6 py-4 font-semibold text-right">Interest</th>
                <th className="px-6 py-4 font-semibold text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[13px]">
              {stratData.monthlySchedule.map((row) => (
                <tr key={row.month} className="hover:bg-slate-50">
                  <td className="px-6 py-3.5 font-sans font-medium text-slate-900">{row.month}</td>
                  <td className="px-6 py-3.5 text-slate-500">{row.date}</td>
                  <td className="px-6 py-3.5 text-right font-bold text-slate-800">₹{formatInrDigits(row.totalPayment)}</td>
                  <td className="px-6 py-3.5 text-right text-emerald-600">₹{formatInrDigits(row.principalPaid)}</td>
                  <td className="px-6 py-3.5 text-right text-rose-500">₹{formatInrDigits(row.interestPaid)}</td>
                  <td className="px-6 py-3.5 text-right text-slate-600 font-medium">₹{formatInrDigits(row.remainingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
      </div>
    );
  }
);
