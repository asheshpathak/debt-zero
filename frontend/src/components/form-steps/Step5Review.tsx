import { useFormContext } from "react-hook-form";
import { CheckCircle2, Wallet, CreditCard, Target } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { formatCurrency } from "@/lib/utils";
import type { FormData } from "@/types";

export function Step5Review() {
  const { watch } = useFormContext<FormData>();
  const data = watch();

  const totalLoanDebt = data.loans?.reduce((s, l) => s + (l.balance || 0), 0) ?? 0;
  const totalCardDebt = data.creditCards?.reduce((s, c) => s + (c.balance || 0), 0) ?? 0;
  const totalDebt = totalLoanDebt + totalCardDebt;
  const totalEmi = data.loans?.reduce((s, l) => s + (l.monthlyEmi || 0), 0) ?? 0;
  const totalMinPayment = data.creditCards?.reduce((s, c) => s + (c.minimumPayment || 0), 0) ?? 0;
  const surplus = (data.monthlyIncome || 0) - (data.monthlyExpenses || 0) - totalEmi - totalMinPayment;

  return (
    <div className="space-y-5">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Review Your Details</h2>
        <p className="text-sm text-[#94a3b8]">Everything looks good? Hit Generate Plan to let Claude work its magic.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Income summary */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-[#6366f1]" />
            <span className="text-sm font-medium">Income & Expenses</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#94a3b8]">Monthly Income</span>
              <span className="font-mono text-emerald-400">{formatCurrency(data.monthlyIncome || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94a3b8]">Monthly Expenses</span>
              <span className="font-mono text-rose-400">-{formatCurrency(data.monthlyExpenses || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94a3b8]">Total EMIs/Min. Payments</span>
              <span className="font-mono text-orange-400">-{formatCurrency(totalEmi + totalMinPayment)}</span>
            </div>
            <div className="border-t border-white/8 pt-2 flex justify-between font-medium">
              <span className="text-[#94a3b8]">Monthly Surplus</span>
              <span className={`font-mono ${surplus >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(surplus)}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Debt summary */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-medium">Debt Summary</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#94a3b8]">Loans ({data.loans?.length ?? 0})</span>
              <span className="font-mono">{formatCurrency(totalLoanDebt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94a3b8]">Credit Cards ({data.creditCards?.length ?? 0})</span>
              <span className="font-mono">{formatCurrency(totalCardDebt)}</span>
            </div>
            <div className="border-t border-white/8 pt-2 flex justify-between font-medium">
              <span className="text-[#94a3b8]">Total Debt</span>
              <span className="font-mono text-rose-400">{formatCurrency(totalDebt)}</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Strategy */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-[#06b6d4]" />
          <span className="text-sm font-medium">Strategy & Goals</span>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/8">
            <span className="text-[#94a3b8]">Strategy: </span>
            <span className="capitalize font-medium text-[#06b6d4]">{data.strategy || "—"}</span>
          </div>
          {data.extraMonthlyBudget > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/8">
              <span className="text-[#94a3b8]">Extra: </span>
              <span className="font-mono font-medium text-emerald-400">
                {formatCurrency(data.extraMonthlyBudget)}/mo
              </span>
            </div>
          )}
          {data.targetMonths > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/8">
              <span className="text-[#94a3b8]">Target: </span>
              <span className="font-medium">{data.targetMonths} months</span>
            </div>
          )}
        </div>
      </GlassCard>

      {surplus < 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-4 text-sm text-red-400">
          <strong>Warning:</strong> Your expenses + debt payments exceed your income. Claude will factor
          this in and suggest adjustments.
        </div>
      )}

      <div className="rounded-xl border border-[#6366f1]/30 bg-[#6366f1]/8 p-4 text-sm text-[#94a3b8]">
        <CheckCircle2 className="inline w-4 h-4 text-[#6366f1] mr-2 -mt-0.5" />
        Your data stays private and is processed only by Claude AI. No human ever sees it.
      </div>
    </div>
  );
}
