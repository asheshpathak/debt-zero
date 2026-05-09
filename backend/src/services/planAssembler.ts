import type { PlanDataV2, PayoffStrategy } from "../types";
import type { ComputedPlan, StrategyResult, ScheduleRow } from "./amortization";
import type { NarrativeResult } from "./claudeNarrative";

/** Compact schedule row format matching expandScheduleRow() on the frontend/claude.ts */
interface CompactScheduleRow {
  m: number;
  dt: string;
  tp: number;
  pp: number;
  ip: number;
  rb: number;
  cl: string[];
  rm?: string;
  bd?: { n: string; a: number }[];
}

function toCompactRow(row: ScheduleRow, roadmapAction?: string): CompactScheduleRow {
  const compact: CompactScheduleRow = {
    m: row.month,
    dt: row.date,
    tp: row.totalPayment,
    pp: row.principalPaid,
    ip: row.interestPaid,
    rb: row.remainingBalance,
    cl: row.debtsCleared,
  };

  if (roadmapAction) {
    compact.rm = roadmapAction;
  }

  if (row.paymentBreakdown && row.paymentBreakdown.length > 0) {
    compact.bd = row.paymentBreakdown.map((b) => ({ n: b.name, a: b.amount }));
  }

  return compact;
}

function assembleStrategySlice(
  result: StrategyResult,
  roadmapActions: Record<string, string>
) {
  return {
    summary: result.summary,
    // Stored as compact rows; expandScheduleRow() in claude.ts expands on read
    monthlySchedule: result.monthlySchedule.map((row) =>
      toCompactRow(row, roadmapActions[String(row.month)])
    ),
    debtOrder: result.debtOrder,
  };
}

export function assemblePlanData(
  computed: ComputedPlan,
  narrative: NarrativeResult,
  defaultStrategy: PayoffStrategy
): PlanDataV2 {
  const { roadmapActions } = narrative;

  // roadmapActions are written by Claude specifically for `defaultStrategy`.
  // Embedding them into other strategy slices causes cross-strategy contamination
  // (narrative text references wrong clearance months and payment amounts).
  // Non-default slices receive an empty map so their schedule rows carry no roadmapAction.
  const NO_ROADMAP: Record<string, string> = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    version: 2,
    defaultStrategy,
    shared: {
      insights: narrative.insights,
      quickWins: narrative.quickWins,
      warnings: narrative.warnings,
      spendsOverview: computed.spendsOverview,
      ...(computed.baselineIsInfinite && computed.refinancePriorityDebts.length > 0
        ? {
            refinanceFlag: {
              active: true as const,
              reason: "minimum_payments_never_clear" as const,
              debts: computed.refinancePriorityDebts,
            },
          }
        : {}),
    },
    strategies: {
      safe: assembleStrategySlice(computed.safe, defaultStrategy === "safe" ? roadmapActions : NO_ROADMAP) as any,
      balanced: assembleStrategySlice(computed.balanced, defaultStrategy === "balanced" ? roadmapActions : NO_ROADMAP) as any,
      aggressive: assembleStrategySlice(computed.aggressive, defaultStrategy === "aggressive" ? roadmapActions : NO_ROADMAP) as any,
    },
  };
}
