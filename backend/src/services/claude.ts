import Anthropic from "@anthropic-ai/sdk";
import type { PayoffStrategy, PlanDataV2 } from "../types";

/** Shared Anthropic client singleton. Import this instead of instantiating a new client. */
export const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Compact ↔ expanded schedule row helpers (used for backward-compat reads)
// ---------------------------------------------------------------------------

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

export function expandScheduleRow(row: CompactScheduleRow | Record<string, unknown>) {
  if ("month" in row) return row; // already expanded (legacy fallback)
  return {
    month: (row as CompactScheduleRow).m,
    date: (row as CompactScheduleRow).dt,
    totalPayment: (row as CompactScheduleRow).tp,
    principalPaid: (row as CompactScheduleRow).pp,
    interestPaid: (row as CompactScheduleRow).ip,
    remainingBalance: (row as CompactScheduleRow).rb,
    debtsCleared: (row as CompactScheduleRow).cl ?? [],
    roadmapAction: (row as CompactScheduleRow).rm,
    paymentBreakdown: (row as CompactScheduleRow).bd?.map((b) => ({ name: b.n, amount: b.a })),
  };
}

export function expandCompactPlan(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  if (!o.strategies || typeof o.strategies !== "object") return raw;
  const expandedStrategies: Record<string, unknown> = {};
  for (const [key, slice] of Object.entries(o.strategies as Record<string, unknown>)) {
    if (!slice || typeof slice !== "object") { expandedStrategies[key] = slice; continue; }
    const sl = slice as Record<string, unknown>;
    expandedStrategies[key] = {
      ...sl,
      monthlySchedule: Array.isArray(sl.monthlySchedule)
        ? (sl.monthlySchedule as Record<string, unknown>[]).map(expandScheduleRow)
        : [],
    };
  }
  return { ...o, strategies: expandedStrategies };
}

export function assertMultiStrategyPayload(
  parsed: unknown,
  expectedStrategies: PayoffStrategy[]
): asserts parsed is PlanDataV2 {
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid plan JSON");
  const o = parsed as Record<string, unknown>;
  if (o.version !== 2) throw new Error("Expected plan version 2");
  if (!o.strategies || typeof o.strategies !== "object") throw new Error("Missing strategies");
  if (!o.shared || typeof o.shared !== "object") throw new Error("Missing shared");
  const sh = o.shared as Record<string, unknown>;
  if (!Array.isArray(sh.insights) || !Array.isArray(sh.quickWins) || !Array.isArray(sh.warnings)) {
    throw new Error("Invalid shared section");
  }
  const strategies = o.strategies as Record<string, unknown>;
  for (const s of expectedStrategies) {
    const slice = strategies[s];
    if (!slice || typeof slice !== "object") throw new Error(`Missing strategy slice: ${s}`);
    const sl = slice as Record<string, unknown>;
    if (!sl.summary || !Array.isArray(sl.monthlySchedule) || !Array.isArray(sl.debtOrder)) {
      throw new Error(`Incomplete strategy slice: ${s}`);
    }
  }
}
