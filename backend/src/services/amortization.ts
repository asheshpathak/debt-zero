import type { FormData, RefinancePriorityDebt } from "../types";
import { resolvedMonthlyLivingCosts } from "../utils/financeForm";

// COMPUTED — do not send to LLM
export interface NormalizedDebt {
  id: string;
  name: string;
  /** COMPUTED — do not send to LLM */
  balance: number;
  /** COMPUTED — do not send to LLM */
  annualRate: number;
  /** COMPUTED — do not send to LLM */
  minimumPayment: number;
  type: "loan" | "credit_card";
  /** COMPUTED — do not send to LLM */
  isInterestFree: boolean;
}

/** COMPUTED — do not send to LLM */
export interface ScheduleRow {
  /** COMPUTED — do not send to LLM */
  month: number;
  /** COMPUTED — do not send to LLM */
  date: string;
  /** COMPUTED — do not send to LLM */
  totalPayment: number;
  /** COMPUTED — do not send to LLM */
  principalPaid: number;
  /** COMPUTED — do not send to LLM */
  interestPaid: number;
  /** COMPUTED — do not send to LLM */
  remainingBalance: number;
  /** COMPUTED — do not send to LLM */
  debtsCleared: string[];
  /** COMPUTED — do not send to LLM */
  paymentBreakdown: { name: string; amount: number }[];
}

/** COMPUTED — do not send to LLM */
export interface StrategyResult {
  /** COMPUTED — do not send to LLM */
  debtOrder: {
    name: string;
    type: string;
    /** COMPUTED — do not send to LLM */
    balance: number;
    /** COMPUTED — do not send to LLM */
    interestRate: number;
    /** COMPUTED — do not send to LLM */
    payoffMonth: number;
    /** COMPUTED — do not send to LLM */
    totalInterestPaid: number;
    /** COMPUTED — do not send to LLM */
    priority: number;
  }[];
  /** COMPUTED — do not send to LLM */
  monthlySchedule: ScheduleRow[];
  /** COMPUTED — do not send to LLM */
  summary: {
    /** COMPUTED — do not send to LLM */
    totalDebt: number;
    /** COMPUTED — do not send to LLM */
    monthlyIncome: number;
    /** COMPUTED — do not send to LLM */
    debtToIncomeRatio: number;
    /** COMPUTED — do not send to LLM */
    estimatedPayoffMonths: number;
    /** COMPUTED — do not send to LLM */
    estimatedPayoffDate: string;
    /** COMPUTED — do not send to LLM */
    totalInterestSaved: number;
    /** COMPUTED — do not send to LLM */
    totalInterestPaid: number;
    strategy: "safe" | "balanced" | "aggressive";
    /**
     * True when at least one debt has a minimum payment ≤ its monthly interest,
     * meaning minimum payments alone will never clear that debt.
     * When true, totalInterestSaved is a capped estimate, not a precise figure.
     */
    baselineIsInfinite: boolean;
    /** Monthly repayment commitment for this strategy. Aggressive may be higher. */
    monthlyBudget: number;
  };
}

export interface StrategyMilestone {
  month: number;
  date: string;
  event: string;
  /** Pre-formatted "DebtA: ₹X | DebtB: ₹Y" — copy verbatim into narrative */
  paymentBreakdown: string;
  /**
   * Total payment made this month (principal + interest across all debts).
   * Claude MUST use this figure when describing the total payment for this month.
   */
  totalPayment: number;
}

/** COMPUTED — do not send to LLM */
export interface ComputedPlan {
  /** COMPUTED — do not send to LLM */
  safe: StrategyResult;
  /** COMPUTED — do not send to LLM */
  balanced: StrategyResult;
  /** COMPUTED — do not send to LLM */
  aggressive: StrategyResult;
  /** COMPUTED — do not send to LLM */
  baselineInterest: number;
  /**
   * True when at least one debt is in a payment death-spiral (min payment ≤ monthly interest).
   * Minimum payments alone will never clear this debt — any finite number would be misleading.
   */
  baselineIsInfinite: boolean;
  /** @deprecated Use strategicMilestones[strategy] instead */
  milestones: { month: number; date: string; event: string }[];
  /** Per-strategy milestones extracted from full (unsampled) schedules */
  strategicMilestones: {
    safe: StrategyMilestone[];
    balanced: StrategyMilestone[];
    aggressive: StrategyMilestone[];
  };
  spendsOverview: {
    category: string;
    amount: number;
    status: "on_track" | "cut_down";
    suggestion: string;
  }[];
  /** COMPUTED — do not send to LLM */
  liquidAssets: number;
  /** COMPUTED — do not send to LLM */
  emergencyFundTarget: number;
  /** COMPUTED — do not send to LLM */
  emergencyFundCurrent: number;
  /** COMPUTED — do not send to LLM */
  emergencyFundMonthsToTarget: number;
  /** Monthly allocation toward emergency fund per strategy. Aggressive is always 0. */
  efMonthlyAllocations: {
    safe: number;
    balanced: number;
    aggressive: number;
  };
  /**
   * Extra monthly budget unlocked for Aggressive by assuming 25% cuts to
   * over-spending categories (those flagged "cut_down"). 0 when no categories
   * are flagged. The Aggressive amortisation runs on (base budget + this).
   */
  aggressiveSpendingSavings: number;
  /**
   * When baselineIsInfinite, debts where minimum payment ≤ monthly interest (APR order).
   * Used for refinance / consolidation callouts — same screen as negative amortization.
   */
  refinancePriorityDebts: RefinancePriorityDebt[];
}

/**
 * Lines where minimums do not exceed monthly interest — balance grows if only minimums are paid.
 * Sorted by APR descending, then balance descending.
 */
export function buildRefinancePriorityList(debts: NormalizedDebt[]): RefinancePriorityDebt[] {
  const rows: RefinancePriorityDebt[] = [];
  for (const d of debts) {
    if (d.balance <= 0 || d.isInterestFree || d.annualRate <= 0) continue;
    const monthlyInterest = d.balance * (d.annualRate / 100 / 12);
    if (d.minimumPayment <= monthlyInterest + 0.01) {
      rows.push({
        name: d.name,
        interestRateApr: Math.round(d.annualRate * 100) / 100,
        balance: Math.round(d.balance),
        type: d.type,
      });
    }
  }
  rows.sort((a, b) => b.interestRateApr - a.interestRateApr || b.balance - a.balance);
  return rows;
}

function formatMonthDate(date: Date): string {
  return date.toLocaleString("en-IN", { month: "short", year: "numeric" });
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function normalizeDebts(formData: FormData): NormalizedDebt[] {
  const debts: NormalizedDebt[] = [];

  for (const loan of formData.loans) {
    const balance = Number(loan.balance) || 0;
    if (balance <= 0) continue;
    debts.push({
      id: loan.id,
      name: loan.name,
      balance,
      annualRate: loan.interestFree ? 0 : Number(loan.interestRate) || 0,
      minimumPayment: Number(loan.monthlyEmi) || 0,
      type: "loan",
      isInterestFree: loan.interestFree,
    });
  }

  for (const card of formData.creditCards) {
    const balance = Number(card.balance) || 0;
    if (balance <= 0) continue;
    debts.push({
      id: card.id,
      name: card.name,
      balance,
      annualRate: Number(card.interestRate) || 0,
      minimumPayment: Number(card.minimumPayment) || 0,
      type: "credit_card",
      isInterestFree: false,
    });
  }

  return debts;
}

function computeMonthlyInterest(balance: number, annualRate: number, isInterestFree: boolean): number {
  if (isInterestFree) return 0;
  return balance * (annualRate / 100 / 12);
}

/**
 * Avalanche ordering for all strategies: highest APR first, then larger balance as tie-break.
 * Safe vs Balanced vs Aggressive differ by EF / budget rules only — not by debt stack order.
 */
function sortDebtsForStrategy(debts: NormalizedDebt[], _strategy: "safe" | "balanced" | "aggressive"): NormalizedDebt[] {
  const sorted = [...debts];
  sorted.sort((a, b) => {
    if (b.annualRate !== a.annualRate) return b.annualRate - a.annualRate;
    return b.balance - a.balance;
  });
  return sorted;
}

/**
 * Computes the total interest a user would pay making only minimum payments.
 *
 * Returns -1 (sentinel) when any debt has a minimum payment ≤ its monthly
 * interest charge — meaning that debt can never be cleared under minimum
 * payments alone (negative amortization / death spiral).
 *
 * An epsilon of 0.01 is used to catch floating-point near-zero deficits
 * (e.g. a ₹50 deficit that rounds to 0 in IEEE 754 arithmetic).
 *
 * Callers must check for -1 before using the result as a rupee amount.
 */
function computeMinimumPaymentBaseline(debts: NormalizedDebt[]): number {
  // Step 1 — Screen every debt for negative amortization BEFORE running any loop.
  for (const debt of debts) {
    if (debt.isInterestFree || debt.balance <= 0) continue;

    const monthlyInterest = debt.balance * (debt.annualRate / 100 / 12);
    const deficit = debt.minimumPayment - monthlyInterest;

    if (deficit <= 0.01) {
      // Minimum payment does not cover monthly interest — balance grows forever.
      // Return sentinel without running the loop at all.
      return -1;
    }
  }

  // Step 2 — All debts have positive amortization. Run the baseline loop.
  const workingDebts = debts.map((d) => ({ ...d, balance: d.balance }));
  let totalInterest = 0;
  let month = 0;
  const MAX_MONTHS = 480;

  while (workingDebts.some((d) => d.balance > 0.5) && month < MAX_MONTHS) {
    month++;
    for (const debt of workingDebts) {
      if (debt.balance <= 0) continue;
      const interest = debt.isInterestFree ? 0 : debt.balance * (debt.annualRate / 100 / 12);
      totalInterest += interest;
      debt.balance += interest;
      const payment = Math.min(debt.minimumPayment, debt.balance);
      debt.balance -= payment;
      if (debt.balance < 0.5) debt.balance = 0;
    }
  }

  // Step 3 — Sanity cap: baseline interest should not exceed 5× total original debt.
  // If it does, something unexpected happened — return sentinel rather than a corrupt figure.
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  if (totalInterest > totalDebt * 5) {
    return -1;
  }

  return Math.round(totalInterest);
}

interface EmergencyFundConfig {
  target: number;
  current: number;
  monthlyAllocation: number;
}

interface AmortizationResult {
  schedule: ScheduleRow[];
  debtPayoffMonths: Map<string, number>;
  debtTotalInterest: Map<string, number>;
  totalInterestPaid: number;
}

function runAmortization(
  debtsInput: NormalizedDebt[],
  monthlyBudget: number,
  startDate: Date,
  efConfig?: EmergencyFundConfig
): AmortizationResult {
  const debtStates = debtsInput.map((d) => ({ ...d, balance: d.balance }));
  const schedule: ScheduleRow[] = [];
  const debtPayoffMonths = new Map<string, number>();
  const debtTotalInterest = new Map<string, number>(debtsInput.map((d) => [d.id, 0]));
  let totalInterestPaid = 0;
  let efBalance = efConfig ? efConfig.current : 0;

  for (let month = 1; month <= 480; month++) {
    const activeDebts = debtStates.filter((d) => d.balance > 0.5);
    if (activeDebts.length === 0) break;

    let budgetThisMonth = monthlyBudget;

    // Emergency fund allocation
    if (efConfig && efBalance < efConfig.target) {
      const allocation = Math.min(efConfig.monthlyAllocation, efConfig.target - efBalance);
      budgetThisMonth = Math.max(0, budgetThisMonth - allocation);
      efBalance += allocation;
    }

    // Accrue interest on all active debts
    const monthInterestByDebt = new Map<string, number>();
    // Capture balance after interest accrual (before any payment) — used to
    // clamp payment breakdown so closing-month entries never exceed the actual
    // balance that was present when the payment was applied.
    const balanceBeforePayment = new Map<string, number>();
    for (const d of debtStates) {
      if (d.balance <= 0) continue;
      const interest = computeMonthlyInterest(d.balance, d.annualRate, d.isInterestFree);
      d.balance += interest;
      totalInterestPaid += interest;
      const prev = debtTotalInterest.get(d.id) ?? 0;
      debtTotalInterest.set(d.id, prev + interest);
      monthInterestByDebt.set(d.id, interest);
      balanceBeforePayment.set(d.id, d.balance);
    }

    // Pay minimum on every active debt first
    const paymentsByDebt = new Map<string, number>();
    for (const d of debtStates) {
      if (d.balance <= 0.5) continue;
      const minPay = Math.min(d.minimumPayment, d.balance);
      paymentsByDebt.set(d.id, minPay);
      d.balance = Math.max(0, d.balance - minPay);
      budgetThisMonth = Math.max(0, budgetThisMonth - minPay);
    }

    // Cascade remaining budget to priority debts in order
    for (const d of debtStates) {
      if (budgetThisMonth <= 0) break;
      if (d.balance <= 0.5) continue;
      const extra = Math.min(budgetThisMonth, d.balance);
      const prev = paymentsByDebt.get(d.id) ?? 0;
      paymentsByDebt.set(d.id, prev + extra);
      d.balance = Math.max(0, d.balance - extra);
      budgetThisMonth = Math.max(0, budgetThisMonth - extra);
    }

    // Detect cleared debts
    const debtsCleared: string[] = [];
    for (const d of debtStates) {
      if (d.balance <= 0.5 && !debtPayoffMonths.has(d.id)) {
        d.balance = 0;
        debtPayoffMonths.set(d.id, month);
        debtsCleared.push(d.name);
      }
    }

    // Build payment breakdown
    // Clamp each debt's recorded payment to its pre-payment balance so the
    // final closing-month entry always shows the exact payoff amount, not an
    // over-allocated figure from the minimum-payment or cascade arithmetic.
    const paymentBreakdown: { name: string; amount: number }[] = [];
    let totalPaid = 0;
    let totalInterestThisMonth = 0;

    for (const d of debtsInput) {
      const allocated = paymentsByDebt.get(d.id) ?? 0;
      if (allocated > 0) {
        const preBalance = balanceBeforePayment.get(d.id) ?? allocated;
        const actualPaid = Math.min(allocated, preBalance);
        paymentBreakdown.push({ name: d.name, amount: Math.round(actualPaid) });
        totalPaid += actualPaid;
      }
      totalInterestThisMonth += monthInterestByDebt.get(d.id) ?? 0;
    }

    const remainingBalance = Math.round(
      Math.max(0, debtStates.reduce((s, d) => s + d.balance, 0))
    );
    const totalPayment = Math.round(totalPaid);
    const interestPaid = Math.round(totalInterestThisMonth);
    const principalPaid = Math.round(Math.max(0, totalPayment - interestPaid));

    schedule.push({
      month,
      date: formatMonthDate(addMonths(startDate, month - 1)),
      totalPayment,
      principalPaid,
      interestPaid,
      remainingBalance,
      debtsCleared,
      paymentBreakdown,
    });
  }

  return {
    schedule,
    debtPayoffMonths,
    debtTotalInterest,
    totalInterestPaid: Math.round(totalInterestPaid),
  };
}

function sampleSchedule(fullSchedule: ScheduleRow[], maxRows = 20): ScheduleRow[] {
  if (fullSchedule.length <= maxRows) return fullSchedule;

  // MANDATORY: month 1, final month, and every month where a debt is cleared.
  // Debt-clearance rows must always be visible so payment jumps are explained.
  const mandatoryMonths = new Set<number>();
  mandatoryMonths.add(fullSchedule[0].month);
  mandatoryMonths.add(fullSchedule[fullSchedule.length - 1].month);
  for (const row of fullSchedule) {
    if (row.debtsCleared.length > 0) mandatoryMonths.add(row.month);
  }

  const mandatoryRows = fullSchedule.filter((r) => mandatoryMonths.has(r.month));
  const remainingSlots = Math.max(0, maxRows - mandatoryRows.length);

  // OPTIONAL: fill remaining slots with monthly rows (≤12) then every-3rd-month rows
  const optionalRows: ScheduleRow[] = [];
  for (const row of fullSchedule) {
    if (mandatoryMonths.has(row.month)) continue;
    if (optionalRows.length >= remainingSlots) break;
    if (row.month <= 12 || row.month % 3 === 0) {
      optionalRows.push(row);
    }
  }

  // Merge, deduplicate, sort
  const combined = [...mandatoryRows, ...optionalRows];
  const seen = new Set<number>();
  return combined
    .filter((r) => { if (seen.has(r.month)) return false; seen.add(r.month); return true; })
    .sort((a, b) => a.month - b.month);
}

function extractMilestones(
  strategies: { safe: AmortizationResult; balanced: AmortizationResult; aggressive: AmortizationResult },
  startDate: Date
): { month: number; date: string; event: string }[] {
  const milestoneMap = new Map<number, Set<string>>();

  for (const result of [strategies.safe, strategies.balanced, strategies.aggressive]) {
    for (const row of result.schedule) {
      if (row.debtsCleared.length > 0) {
        if (!milestoneMap.has(row.month)) {
          milestoneMap.set(row.month, new Set());
        }
        for (const name of row.debtsCleared) {
          milestoneMap.get(row.month)!.add(`${name} cleared`);
        }
      }
    }
  }

  return Array.from(milestoneMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([month, events]) => ({
      month,
      date: formatMonthDate(addMonths(startDate, month - 1)),
      event: Array.from(events).join(", "),
    }));
}

export function extractMilestonesForStrategy(schedule: ScheduleRow[]): StrategyMilestone[] {
  const milestones: StrategyMilestone[] = [];

  function formatBreakdown(row: ScheduleRow): string {
    return row.paymentBreakdown
      .map((b) => `${b.name}: ₹${Math.round(b.amount).toLocaleString("en-IN")}`)
      .join(" | ");
  }

  for (const row of schedule) {
    if (row.debtsCleared.length > 0) {
      milestones.push({
        month: row.month,
        date: row.date,
        event: row.debtsCleared.map((name) => `${name} fully cleared`).join(" and "),
        paymentBreakdown: formatBreakdown(row),
        totalPayment: row.totalPayment,
      });
    }
  }

  // Always include month 1 as a starting milestone
  if (!milestones.find((m) => m.month === 1)) {
    const row1 = schedule[0];
    milestones.unshift({
      month: 1,
      date: row1?.date ?? "",
      event: "Repayment begins — first payments made",
      paymentBreakdown: row1 ? formatBreakdown(row1) : "",
      totalPayment: row1?.totalPayment ?? 0,
    });
  }

  // Always include final payoff month
  const lastRow = schedule[schedule.length - 1];
  if (lastRow && !milestones.find((m) => m.month === lastRow.month)) {
    milestones.push({
      month: lastRow.month,
      date: lastRow.date,
      event: "All debts cleared — debt-free achieved",
      paymentBreakdown: formatBreakdown(lastRow),
      totalPayment: lastRow.totalPayment,
    });
  }

  return milestones.sort((a, b) => a.month - b.month);
}

function computeSpendsOverview(
  formData: FormData,
  monthlyIncome: number
): ComputedPlan["spendsOverview"] {
  if (!Array.isArray(formData.expenseCategories) || formData.expenseCategories.length === 0) {
    return [];
  }

  const THRESHOLDS: Record<string, { cutDown: number; note: string }> = {
    rent: { cutDown: 35, note: "Consider if relocation or a flatmate could reduce this." },
    food: { cutDown: 15, note: "Meal prepping can reduce this by 20-30%." },
    fuel: { cutDown: 10, note: "Consider carpooling or public transport for part of commute." },
    utilities: { cutDown: 5, note: "Check for unused subscriptions or high electricity usage." },
    shopping: { cutDown: 8, note: "Pause non-essential purchases for the duration of payoff." },
    dining_out: { cutDown: 8, note: "Cooking at home more often typically cuts this bucket the fastest." },
    subscriptions: { cutDown: 4, note: "Audit OTT, apps, and gym — overlap and annual renewals add up." },
    education: { cutDown: 12, note: "Compare tuition, coaching, and upskilling to income; look for employer or tax benefits where applicable." },
    personal_care: { cutDown: 6, note: "Salon, grooming, and wellness — small trims add up without cutting essentials." },
    child_care: { cutDown: 15, note: "Daycare, school fees, activities — benchmark against peers; negotiate or phase extras if stretched." },
    healthcare: { cutDown: 8, note: "Ensure you have health insurance to prevent emergency spikes." },
    others: { cutDown: 6, note: "Categorise and review — untracked spending hides savings potential." },
  };
  const DEFAULT_THRESHOLD = { cutDown: 10, note: 'Review regularly to ensure it stays within budget.' };

  return formData.expenseCategories
    .filter((c) => c.enabled && (Number(c.amount) || 0) > 0)
    .map((c) => {
      const amount = Number(c.amount) || 0;
      const pct = monthlyIncome > 0 ? (amount / monthlyIncome) * 100 : 0;
      const thresholdEntry = THRESHOLDS[c.key] ?? DEFAULT_THRESHOLD;
      const threshold = thresholdEntry.cutDown;
      const isCutDown = pct > threshold;

      const onTrackSuggestion = `At ${pct.toFixed(1)}% of income — within range. ${thresholdEntry.note}`;
      const cutDownSuggestion = `At ${pct.toFixed(1)}% of income, above the ${threshold}% guideline. ${thresholdEntry.note}`;

      return {
        category: c.key,
        amount,
        status: (isCutDown ? "cut_down" : "on_track") as "on_track" | "cut_down",
        suggestion: isCutDown ? cutDownSuggestion : onTrackSuggestion,
      };
    });
}

export function computeAllStrategies(formData: FormData): ComputedPlan {
  const debts = normalizeDebts(formData);
  const monthlyIncome = Number(formData.monthlyIncome) || 0;
  const monthlyLiving = resolvedMonthlyLivingCosts(formData);
  const totalMinPayments = debts.reduce((s, d) => s + d.minimumPayment, 0);
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const surplus = Math.max(0, monthlyIncome - monthlyLiving - totalMinPayments);
  const monthlyBudget = totalMinPayments + surplus;
  const startDate = new Date();
  startDate.setDate(1);

  const baselineInterest = computeMinimumPaymentBaseline(debts);
  // -1 is the sentinel meaning "minimum payments never clear at least one debt"
  const baselineIsInfinite = baselineInterest === -1;
  let refinancePriorityDebts = buildRefinancePriorityList(debts);
  if (baselineIsInfinite && refinancePriorityDebts.length === 0) {
    for (const d of debts) {
      if (d.balance <= 0 || d.isInterestFree || d.annualRate <= 0) continue;
      refinancePriorityDebts.push({
        name: d.name,
        interestRateApr: Math.round(d.annualRate * 100) / 100,
        balance: Math.round(d.balance),
        type: d.type,
      });
    }
    refinancePriorityDebts.sort((a, b) => b.interestRateApr - a.interestRateApr || b.balance - a.balance);
  }
  if (!baselineIsInfinite) refinancePriorityDebts = [];

  // Compute liquid assets and investment assets
  const liquidAssetKeys: string[] = ["cash", "savings", "security_fund"];
  const investmentAssetKeys: string[] = ["investments"];
  const liquidAssets = (formData.assetCategories ?? [])
    .filter((c) => c.enabled && liquidAssetKeys.includes(c.key))
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const efCurrent = liquidAssets;

  // Strategy-specific EF configs
  const safeEfTarget = monthlyLiving * 6;
  const balancedEfTarget = monthlyLiving * 3;

  // Slightly asymmetric split so Safe always steers more to the EF runway than Balanced when
  // both are building reserves (avoids near-identical schedules on thin surplus).
  const safeAllocation = Math.min(surplus * 0.72, safeEfTarget / 8);
  const balancedAllocation = Math.min(surplus * 0.38, balancedEfTarget / 6);

  const safeEfConfig: EmergencyFundConfig | undefined =
    safeEfTarget > 0
      ? { target: safeEfTarget, current: efCurrent, monthlyAllocation: safeAllocation }
      : undefined;

  const balancedEfConfig: EmergencyFundConfig | undefined =
    balancedEfTarget > 0
      ? { target: balancedEfTarget, current: efCurrent, monthlyAllocation: balancedAllocation }
      : undefined;

  // Pre-compute spending overview (needed for aggressive budget calculation below)
  const spendsOverviewData = computeSpendsOverview(formData, monthlyIncome);

  // Aggressive strategy assumes 25% cuts to over-spending categories, releasing
  // extra budget each month that goes entirely toward debt repayment.
  const aggressiveSpendingSavings = Math.round(
    spendsOverviewData
      .filter((s) => s.status === "cut_down")
      .reduce((sum, s) => sum + s.amount * 0.25, 0)
  );
  const aggressiveBudget = monthlyBudget + aggressiveSpendingSavings;

  // Run amortizations
  const safeDebts = sortDebtsForStrategy(debts, "safe");
  const balancedDebts = sortDebtsForStrategy(debts, "balanced");
  const aggressiveDebts = sortDebtsForStrategy(debts, "aggressive");

  const safeResult = runAmortization(safeDebts, monthlyBudget, startDate, safeEfConfig);
  const balancedResult = runAmortization(balancedDebts, monthlyBudget, startDate, balancedEfConfig);
  const aggressiveResult = runAmortization(aggressiveDebts, aggressiveBudget, startDate);

  // Build StrategyResult for each strategy
  function buildStrategyResult(
    sortedDebts: NormalizedDebt[],
    result: AmortizationResult,
    strategy: "safe" | "balanced" | "aggressive",
    strategyBudget: number = monthlyBudget
  ): StrategyResult {
    const payoffMonths = result.schedule.length;
    const payoffDate =
      result.schedule.length > 0
        ? result.schedule[result.schedule.length - 1].date
        : formatMonthDate(startDate);

    // -1 propagates as sentinel: "minimum payments never clear this debt"
    const totalInterestSaved = baselineIsInfinite
      ? -1
      : Math.max(0, baselineInterest - result.totalInterestPaid);
    const dtiRatio = Math.min(1, monthlyIncome > 0 ? totalMinPayments / monthlyIncome : 0);

    // Row 1 = avalanche head (highest APR; ties match sortedDebts). Remaining rows follow
    // calendar payoff order so readers see who leaves the plan when (minimums can clear a
    // smaller lower-rate debt before surplus finishes a higher-rate one — e.g. Meera LIC vs Kotak).
    const debtOrderRaw = sortedDebts.map((d) => ({
      name: d.name,
      type: d.type,
      balance: Math.round(d.balance),
      interestRate: d.annualRate,
      payoffMonth: result.debtPayoffMonths.get(d.id) ?? payoffMonths,
      totalInterestPaid: Math.round(result.debtTotalInterest.get(d.id) ?? 0),
    }));
    const head = debtOrderRaw[0];
    const tail = debtOrderRaw
      .slice(1)
      .sort((a, b) => {
        if (a.payoffMonth !== b.payoffMonth) return a.payoffMonth - b.payoffMonth;
        if (b.interestRate !== a.interestRate) return b.interestRate - a.interestRate;
        return a.name.localeCompare(b.name);
      });
    const debtOrder = [head, ...tail].map((row, idx) => ({ ...row, priority: idx + 1 }));

    return {
      debtOrder,
      monthlySchedule: sampleSchedule(result.schedule),
      summary: {
        totalDebt: Math.round(totalDebt),
        monthlyIncome: Math.round(monthlyIncome),
        debtToIncomeRatio: Math.round(dtiRatio * 10000) / 10000,
        estimatedPayoffMonths: payoffMonths,
        estimatedPayoffDate: payoffDate,
        totalInterestSaved: Math.round(totalInterestSaved),
        totalInterestPaid: Math.round(result.totalInterestPaid),
        strategy,
        baselineIsInfinite,
        monthlyBudget: Math.round(strategyBudget),
      },
    };
  }

  const safe = buildStrategyResult(safeDebts, safeResult, "safe", monthlyBudget);
  const balanced = buildStrategyResult(balancedDebts, balancedResult, "balanced", monthlyBudget);
  const aggressive = buildStrategyResult(aggressiveDebts, aggressiveResult, "aggressive", aggressiveBudget);

  // Milestones from all 3 strategies (union — kept for backward compat)
  const milestones = extractMilestones(
    { safe: safeResult, balanced: balancedResult, aggressive: aggressiveResult },
    startDate
  );

  // Per-strategy milestones from full (unsampled) schedules
  const strategicMilestones = {
    safe: extractMilestonesForStrategy(safeResult.schedule),
    balanced: extractMilestonesForStrategy(balancedResult.schedule),
    aggressive: extractMilestonesForStrategy(aggressiveResult.schedule),
  };

  // EF months to target (using safe config as reference)
  const efTarget = safeEfTarget;
  const efMonthsToTarget =
    efTarget > efCurrent && safeAllocation > 0
      ? Math.ceil((efTarget - efCurrent) / safeAllocation)
      : 0;

  return {
    safe,
    balanced,
    aggressive,
    baselineInterest,
    baselineIsInfinite,
    milestones,
    strategicMilestones,
    spendsOverview: spendsOverviewData,
    liquidAssets: Math.round(liquidAssets),
    emergencyFundTarget: Math.round(efTarget),
    emergencyFundCurrent: Math.round(efCurrent),
    emergencyFundMonthsToTarget: efMonthsToTarget,
    efMonthlyAllocations: {
      safe: Math.round(safeAllocation),
      balanced: Math.round(balancedAllocation),
      aggressive: 0,
    },
    aggressiveSpendingSavings,
    refinancePriorityDebts,
  };
}
