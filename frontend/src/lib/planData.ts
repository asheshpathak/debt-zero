import type {
  MonthlyPayment,
  DebtOrderItem,
  PayoffStrategy,
  PlanSummary,
  PlanStrategySlice,
  PlanDataV2,
  PlanDataLegacy,
  StoredPlanData,
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
  precomputedStrategies: boolean;
  defaultStrategy: PayoffStrategy;
}

export function getPlanView(planData: StoredPlanData | null | undefined, strategy: PayoffStrategy): NormalizedPlanView | null {
  if (!planData) return null;
  if (isPlanDataV2(planData)) {
    const slice =
      planData.strategies[strategy] ??
      planData.strategies[planData.defaultStrategy] ??
      (Object.values(planData.strategies)[0] as PlanStrategySlice | undefined);
    if (!slice) return null;
    return {
      summary: { ...slice.summary, strategy },
      monthlySchedule: slice.monthlySchedule.map((row) => ({
        ...row,
        roadmapAction: row.roadmapAction ?? "",
      })),
      debtOrder: slice.debtOrder,
      insights: planData.shared.insights,
      quickWins: planData.shared.quickWins,
      warnings: planData.shared.warnings,
      precomputedStrategies: true,
      defaultStrategy: planData.defaultStrategy,
    };
  }
  const leg = planData as PlanDataLegacy;
  return {
    summary: leg.summary,
    monthlySchedule: leg.monthlySchedule,
    debtOrder: leg.debtOrder,
    insights: leg.insights,
    quickWins: leg.quickWins,
    warnings: leg.warnings,
    precomputedStrategies: false,
    defaultStrategy: getDefaultStrategyFromPlanData(planData),
  };
}
