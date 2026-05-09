import type {
  MonthlyPayment,
  DebtOrderItem,
  PayoffStrategy,
  PlanSummary,
  PlanStrategySlice,
  PlanDataV2,
  PlanDataLegacy,
  StoredPlanData,
  PlanDataShared,
} from "@/types";

export type { PlanDataV2, PlanDataLegacy, StoredPlanData, PlanSummary, PlanStrategySlice };

export { PLAN_DATA_VERSION } from "@/types";

export function isPlanDataV2(d: unknown): d is PlanDataV2 {
  if (!d || typeof d !== "object") return false;
  const o = d as Record<string, unknown>;
  return (
    o.version === 2 &&
    typeof o.strategies === "object" &&
    o.strategies !== null &&
    typeof o.shared === "object" &&
    o.shared !== null
  );
}

export function getDefaultStrategyFromPlanData(d: StoredPlanData | null | undefined): PayoffStrategy {
  if (!d) return "balanced";
  if (isPlanDataV2(d)) return d.defaultStrategy in d.strategies ? d.defaultStrategy : "balanced";
  const s = (d as PlanDataLegacy).summary?.strategy as any;
  if (s === "safe" || s === "balanced" || s === "aggressive") return s;
  return "balanced";
}

export interface NormalizedPlanView {
  summary: PlanSummary;
  monthlySchedule: MonthlyPayment[];
  debtOrder: DebtOrderItem[];
  insights: string[];
  quickWins: string[];
  warnings: string[];
  /** When minimum payments alone never clear listed balances (negative amortization). */
  refinanceFlag?: PlanDataShared["refinanceFlag"];
  precomputedStrategies: boolean;
  defaultStrategy: PayoffStrategy;
}

function inrFmt(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

/** Older plans may have empty `shared` arrays when narrative JSON was truncated server-side. */
function fallbackInsightsFromSlice(slice: PlanStrategySlice, strategy: PayoffStrategy): string[] {
  const s = slice.summary;
  const label = strategy === "aggressive" ? "Aggressive" : strategy === "balanced" ? "Balanced" : "Safe";
  const lines: string[] = [
    `Under ${label}, this plan targets debt-free by ${s.estimatedPayoffDate} (${s.estimatedPayoffMonths} months), with about ₹${inrFmt(s.totalInterestPaid)} in total interest paid along the way.`,
  ];
  if (!s.baselineIsInfinite && s.totalInterestSaved > 0) {
    lines.push(
      `Compared with minimum-only payments, this path saves roughly ₹${inrFmt(s.totalInterestSaved)} in interest — assuming modeled payments hold steady.`,
    );
  }
  if (s.baselineIsInfinite) {
    lines.push(
      "On minimums alone, at least one balance would keep growing — use the refinance / consolidation flag on the dashboard (if shown) and compare formal quotes against this payoff path.",
    );
  }
  lines.push(
    `Modeled monthly income is ₹${inrFmt(s.monthlyIncome)}. Open the Roadmap tab for month-by-month payment guidance.`,
  );
  return lines;
}

const FALLBACK_QUICK_WINS: string[] = [
  "Pay every balance at least the minimum before the due date to avoid penalty rates.",
  "Send any reliable surplus to the highest-rate debt first while keeping a small cash buffer for emergencies.",
];

function fallbackWarningsFromSummary(summary: PlanSummary): string[] {
  if (summary.debtToIncomeRatio <= 0.4) return [];
  return [
    `Debt minimums are high relative to income (about ${Math.round(summary.debtToIncomeRatio * 100)}% of income). Treat cashflow as tight and revisit if income drops.`,
  ];
}

function stringList(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

export function getPlanView(planData: StoredPlanData | null | undefined, strategy: PayoffStrategy): NormalizedPlanView | null {
  if (!planData) return null;
  if (isPlanDataV2(planData)) {
    const slice =
      planData.strategies[strategy] ??
      planData.strategies[planData.defaultStrategy] ??
      (Object.values(planData.strategies)[0] as PlanStrategySlice | undefined);
    if (!slice) return null;
    const insightsRaw = stringList(planData.shared.insights);
    const quickWinsRaw = stringList(planData.shared.quickWins);
    const warningsRaw = stringList(planData.shared.warnings);
    const usedInsightFallback = insightsRaw.length === 0;
    const extraWarnings = usedInsightFallback && warningsRaw.length === 0 ? fallbackWarningsFromSummary(slice.summary) : [];
    const rf = planData.shared.refinanceFlag;
    const refinanceFlag =
      rf?.active && Array.isArray(rf.debts) && rf.debts.length > 0 ? rf : undefined;
    return {
      summary: { ...slice.summary, strategy },
      monthlySchedule: slice.monthlySchedule.map((row) => ({
        ...row,
        roadmapAction: row.roadmapAction ?? "",
      })),
      debtOrder: slice.debtOrder,
      insights: insightsRaw.length > 0 ? insightsRaw : fallbackInsightsFromSlice(slice, strategy),
      quickWins: quickWinsRaw.length > 0 ? quickWinsRaw : FALLBACK_QUICK_WINS,
      warnings: warningsRaw.length > 0 ? warningsRaw : extraWarnings,
      refinanceFlag,
      precomputedStrategies: true,
      defaultStrategy: planData.defaultStrategy,
    };
  }
  const leg = planData as PlanDataLegacy;
  const sliceLike: PlanStrategySlice = {
    summary: leg.summary,
    monthlySchedule: leg.monthlySchedule,
    debtOrder: leg.debtOrder,
  };
  const strat = (leg.summary.strategy === "safe" || leg.summary.strategy === "balanced" || leg.summary.strategy === "aggressive"
    ? leg.summary.strategy
    : "balanced") as PayoffStrategy;
  const insightsRaw = stringList(leg.insights);
  const quickWinsRaw = stringList(leg.quickWins);
  const warningsRaw = stringList(leg.warnings);
  const usedInsightFallback = insightsRaw.length === 0;
  const extraWarnings = usedInsightFallback && warningsRaw.length === 0 ? fallbackWarningsFromSummary(leg.summary) : [];
  return {
    summary: leg.summary,
    monthlySchedule: leg.monthlySchedule,
    debtOrder: leg.debtOrder,
    insights: insightsRaw.length > 0 ? insightsRaw : fallbackInsightsFromSlice(sliceLike, strat),
    quickWins: quickWinsRaw.length > 0 ? quickWinsRaw : FALLBACK_QUICK_WINS,
    warnings: warningsRaw.length > 0 ? warningsRaw : extraWarnings,
    refinanceFlag: undefined,
    precomputedStrategies: false,
    defaultStrategy: getDefaultStrategyFromPlanData(planData),
  };
}
