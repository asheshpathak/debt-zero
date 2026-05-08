import { useFormContext } from "react-hook-form";
import { GlassCard } from "@/components/GlassCard";
import { formatCurrency } from "@/lib/utils";
import { sumEnabledExpenses } from "@/lib/expenses";
import { sumEnabledAssets } from "@/lib/assets";
import type { AssetCategoryKey, FormData } from "@/types";

const BUREAU_LABEL: Record<string, string> = {
  cibil: "CIBIL",
  experian: "Experian",
  crif: "CRIF High Mark",
  unsure: "Not sure / varies",
};

const ASSET_LABELS: Record<AssetCategoryKey, string> = {
  cash: "Cash & equivalents",
  savings: "Savings",
  investments: "Investments",
  security_fund: "Emergency / safety fund",
  property: "Property",
  gold: "Gold",
  others: "Other",
};

export function Step9Review() {
  const { watch } = useFormContext<FormData>();
  const data = watch();

  const totalLoanDebt = data.loans?.reduce((s, l) => s + (Number(l.balance) || 0), 0) ?? 0;
  const totalCardDebt = data.creditCards?.reduce((s, c) => s + (Number(c.balance) || 0), 0) ?? 0;
  const totalDebt = totalLoanDebt + totalCardDebt;
  const totalEmi = data.loans?.reduce((s, l) => s + (Number(l.monthlyEmi) || 0), 0) ?? 0;
  const totalMinPayment = data.creditCards?.reduce((s, c) => s + (Number(c.minimumPayment) || 0), 0) ?? 0;
  const living = sumEnabledExpenses(data.expenseCategories);
  const incomeNum = Number(data.monthlyIncome) || 0;
  const surplus = incomeNum - living - totalEmi - totalMinPayment;
  const assetsTotal = sumEnabledAssets(data.assetCategories);

  const creditLine = data.creditScoreSkipped
    ? "Skipped — not provided"
    : data.creditScoreApprox != null
    ? `~${data.creditScoreApprox}${data.creditScoreBureau ? ` (${BUREAU_LABEL[data.creditScoreBureau] ?? data.creditScoreBureau})` : ""}`
    : "—";

  const assetLines =
    data.assetCategories?.filter((r) => r.enabled && (r.amount || 0) > 0) ?? [];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#64748b] mb-2">Step 9</p>
        <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight text-[#eceef4] mb-2">
          Review inputs
        </h2>
        <p className="text-sm text-[#8b95a8] leading-relaxed">
          Last check. After you generate, we&apos;ll show a ready screen and walk you through unlock—your full roadmap is synthesized right after payment completes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassCard glow="none" className="!rounded-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b] mb-4">
            Profile
          </p>
          <div className="space-y-2 text-sm text-[#8b95a8]">
            <p><span className="text-[#64748b]">Name · </span><span className="text-[#dce1ea]">{data.name || "—"}</span></p>
            <p><span className="text-[#64748b]">City · </span><span className="text-[#dce1ea]">{data.city || "—"}</span></p>
            <p><span className="text-[#64748b]">Age / role · </span><span className="text-[#dce1ea]">{data.age || "—"} · {data.occupation || "—"}</span></p>
            <p><span className="text-[#64748b]">Gender · </span><span className="text-[#dce1ea]">{data.gender || "—"}</span></p>
          </div>
        </GlassCard>

        <GlassCard glow="none" className="!rounded-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b] mb-4">
            Income & surplus
          </p>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-[#8b95a8]">Income</span>
              <span className="font-mono font-medium text-emerald-400/95 tabular-nums">{formatCurrency(incomeNum)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#8b95a8]">Category spend</span>
              <span className="font-mono font-medium text-rose-300/90 tabular-nums">−{formatCurrency(living)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#8b95a8]">Debt minimums</span>
              <span className="font-mono font-medium text-amber-200/85 tabular-nums">−{formatCurrency(totalEmi + totalMinPayment)}</span>
            </div>
            <div className="border-t border-white/[0.07] pt-3 flex justify-between gap-3 font-medium">
              <span className="text-[#8b95a8]">Residual surplus</span>
              <span className={`font-mono tabular-nums ${surplus >= 0 ? "text-emerald-400/95" : "text-red-400/95"}`}>
                {formatCurrency(surplus)}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard glow="none" className="!rounded-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b] mb-4">
          Assets (declared)
        </p>
        <p className="text-sm font-mono text-[#dce1ea] tabular-nums mb-3">Total · {formatCurrency(assetsTotal)}</p>
        {assetLines.length > 0 ? (
          <ul className="space-y-1.5 text-sm text-[#8b95a8]">
            {assetLines.map((r) => (
              <li key={r.key} className="flex justify-between gap-3">
                <span>{ASSET_LABELS[r.key as AssetCategoryKey]}</span>
                <span className="font-mono tabular-nums text-[#dce1ea]">{formatCurrency(r.amount || 0)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#64748b]">No non-zero enabled buckets — or all toggled off.</p>
        )}
      </GlassCard>

      <GlassCard glow="none" className="!rounded-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b] mb-4">
          Credit score (self-reported)
        </p>
        <p className="text-sm text-[#dce1ea] font-mono tabular-nums">{creditLine}</p>
      </GlassCard>

      <GlassCard glow="none" className="!rounded-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b] mb-4">
          Balances
        </p>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-[#8b95a8]">Loans ({data.loans?.length ?? 0})</span>
            <span className="font-mono tabular-nums text-[#dce1ea]">{formatCurrency(totalLoanDebt)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[#8b95a8]">Revolving cards ({data.creditCards?.length ?? 0})</span>
            <span className="font-mono tabular-nums text-[#dce1ea]">{formatCurrency(totalCardDebt)}</span>
          </div>
          <div className="border-t border-white/[0.07] pt-3 flex justify-between gap-3 font-medium">
            <span className="text-[#8b95a8]">Total owed</span>
            <span className="font-mono text-rose-300/90 tabular-nums">{formatCurrency(totalDebt)}</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard glow="none" className="!rounded-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b] mb-4">
          Target inputs
        </p>
        <div className="flex flex-wrap gap-2">
          {(Number(data.extraMonthlyBudget) || 0) > 0 && (
            <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm">
              <span className="text-[#8b95a8]">Extra monthly · </span>
              <span className="font-mono font-medium text-emerald-400/90 tabular-nums">{formatCurrency(Number(data.extraMonthlyBudget) || 0)}</span>
            </div>
          )}
          {(Number(data.targetMonths) || 0) > 0 && (
            <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm tabular-nums">
              <span className="text-[#8b95a8]">Target horizon · </span>
              <span className="font-medium text-[#dce1ea]">{Number(data.targetMonths) || 0} mo</span>
            </div>
          )}
          {!((Number(data.extraMonthlyBudget) || 0) > 0) && !((Number(data.targetMonths) || 0) > 0) && (
            <span className="text-sm text-[#64748b]">Optional targets left blank.</span>
          )}
        </div>
      </GlassCard>

      {surplus < 0 && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/[0.07] px-4 py-3 text-sm text-red-400/95 leading-relaxed">
          <strong className="text-[#fca5a5]">Heads-up. </strong>
          Category spend plus debt minimums exceed declared income—we&apos;ll still queue a blueprint, but some guidance may assume future cuts or income changes.
        </div>
      )}

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-xs text-[#8b95a8] leading-relaxed">
        Your numbers stay machine-processed inside this flow; nothing here is routed to advisors or marketers.
      </div>
    </div>
  );
}
