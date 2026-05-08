import Anthropic from "@anthropic-ai/sdk";
import type { FormData } from "../types";
import type { ComputedPlan, StrategyMilestone } from "./amortization";
import { resolvedMonthlyLivingCosts } from "../utils/financeForm";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface NarrativeResult {
  insights: string[];
  quickWins: string[];
  warnings: string[];
  roadmapActions: Record<string, string>;
}

const SAFE_DEFAULTS: NarrativeResult = {
  insights: [],
  quickWins: [],
  warnings: [],
  roadmapActions: {},
};

const MINIMUM_CASH_BUFFER = 15000;

function buildNarrativePrompt(
  formData: FormData,
  computed: ComputedPlan,
  selectedStrategy: 'safe' | 'balanced' | 'aggressive'
): string {
  const monthlyLiving = resolvedMonthlyLivingCosts(formData);
  const monthlyIncome = Number(formData.monthlyIncome) || 0;

  const totalMinPayments =
    formData.loans.reduce((s, l) => s + (Number(l.monthlyEmi) || 0), 0) +
    formData.creditCards.reduce((s, c) => s + (Number(c.minimumPayment) || 0), 0);

  const surplus = Math.max(0, monthlyIncome - monthlyLiving - totalMinPayments);
  const monthlyBudget = totalMinPayments + surplus;

  const safeToSpendLumpSum = Math.max(0, computed.liquidAssets - MINIMUM_CASH_BUFFER);
  const efMonthlyAllocation = computed.efMonthlyAllocations[selectedStrategy];
  const selectedStrategyLabel =
    selectedStrategy === 'aggressive' ? 'Aggressive' :
    selectedStrategy === 'balanced' ? 'Balanced' : 'Safe';

  // Aggressive monthly budget = base budget + spending savings from 25% cuts
  const aggressiveSpendingSavings = computed.aggressiveSpendingSavings ?? 0;
  const aggressiveBudget = monthlyBudget + aggressiveSpendingSavings;

  const totalCardBalance = formData.creditCards.reduce((s, c) => s + (Number(c.balance) || 0), 0);
  const totalCardLimit = formData.creditCards.reduce((s, c) => s + (Number(c.limit) || 0), 0);
  const utilizationPct = totalCardLimit > 0 ? Math.round((totalCardBalance / totalCardLimit) * 100) : 0;
  const hasCards = formData.creditCards.length > 0 && totalCardBalance > 0;

  const dtiPct = Math.round(computed.safe.summary.debtToIncomeRatio * 100);

  const allDebts = [
    ...formData.loans
      .filter((l) => (Number(l.balance) || 0) > 0)
      .map((l) => ({
        name: l.name,
        type: "loan",
        balance: Number(l.balance) || 0,
        rate: l.interestFree ? 0 : Number(l.interestRate) || 0,
        minPayment: Number(l.monthlyEmi) || 0,
      })),
    ...formData.creditCards
      .filter((c) => (Number(c.balance) || 0) > 0)
      .map((c) => ({
        name: c.name,
        type: "credit card",
        balance: Number(c.balance) || 0,
        rate: Number(c.interestRate) || 0,
        minPayment: Number(c.minimumPayment) || 0,
      })),
  ].sort((a, b) => b.rate - a.rate);

  const highestRateDebt = allDebts[0];
  const totalDebt = allDebts.reduce((s, d) => s + d.balance, 0);

  const investmentAssets = (formData.assetCategories ?? [])
    .filter((c) => c.enabled && c.key === "investments")
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);

  // Investment offset analysis: compare investments vs non-home debt
  const nonHomeDebt = allDebts
    .filter((d) => d.type !== "loan" || !d.name.toLowerCase().includes("home"))
    .reduce((s, d) => s + d.balance, 0);
  const homeDebt = totalDebt - nonHomeDebt;
  const investmentCoversNonHomeDebt = investmentAssets >= nonHomeDebt && nonHomeDebt > 0;
  const investmentPartialCover = !investmentCoversNonHomeDebt && investmentAssets > 0 && nonHomeDebt > 0 &&
    investmentAssets >= nonHomeDebt * 0.5;

  const { safe, balanced, aggressive } = computed;
  const selectedResult = computed[selectedStrategy];
  const baselineIsInfinite = computed.baselineIsInfinite ?? false;

  const maxPayoffMonth = Math.max(0, ...selectedResult.debtOrder.map((d) => d.payoffMonth));
  const ageNum = Number(formData.age) || 0;
  const approxAgeAtDebtFree = ageNum + maxPayoffMonth / 12;
  const cashSavingsLiquidity = (formData.assetCategories ?? [])
    .filter((c) => c.enabled && (c.key === "cash" || c.key === "savings"))
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const educationLoans = (formData.loans ?? []).filter(
    (l) => l.type === "education" && (Number(l.balance) || 0) > 0
  );
  const educationLoanSummary =
    educationLoans.length === 0
      ? "none"
      : educationLoans
          .map((l) => {
            const bal = Math.round(Number(l.balance) || 0).toLocaleString("en-IN");
            const emi = Math.round(Number(l.monthlyEmi) || 0).toLocaleString("en-IN");
            const r = l.interestFree ? 0 : Number(l.interestRate) || 0;
            return `${l.name}: ~₹${bal} @ ${r}% APR, EMI ₹${emi}/mo`;
          })
          .join(" | ");
  // Any material education loan: surface FD/cash vs keeping the loan (designed stress path).
  const educationLiquidityStressTest = educationLoans.length > 0;
  const retirementTimingFlag =
    maxPayoffMonth > 0 &&
    (approxAgeAtDebtFree >= 58.5 || (ageNum >= 50 && maxPayoffMonth >= 36 && homeDebt > 0));

  // Identify which debts are in a negative-amortization death spiral
  const negativeAmortDebts = [
    ...formData.loans
      .filter((l) => {
        const bal = Number(l.balance) || 0;
        const rate = l.interestFree ? 0 : Number(l.interestRate) || 0;
        const minPay = Number(l.monthlyEmi) || 0;
        const monthlyInterest = bal * (rate / 100 / 12);
        return bal > 0 && minPay <= monthlyInterest && monthlyInterest > 0;
      })
      .map((l) => ({
        name: l.name,
        minPayment: Number(l.monthlyEmi) || 0,
        monthlyInterest: Math.round((Number(l.balance) || 0) * ((Number(l.interestRate) || 0) / 100 / 12)),
      })),
    ...formData.creditCards
      .filter((c) => {
        const bal = Number(c.balance) || 0;
        const rate = Number(c.interestRate) || 0;
        const minPay = Number(c.minimumPayment) || 0;
        const monthlyInterest = bal * (rate / 100 / 12);
        return bal > 0 && minPay <= monthlyInterest && monthlyInterest > 0;
      })
      .map((c) => ({
        name: c.name,
        minPayment: Number(c.minimumPayment) || 0,
        monthlyInterest: Math.round((Number(c.balance) || 0) * ((Number(c.interestRate) || 0) / 100 / 12)),
      })),
  ];

  const debtLines = allDebts
    .map((d) => `- ${d.name} (${d.type}): ₹${Math.round(d.balance).toLocaleString("en-IN")} at ${d.rate}% APR, min ₹${Math.round(d.minPayment).toLocaleString("en-IN")}/month`)
    .join("\n");

  const spendLines = computed.spendsOverview
    .map((s) => {
      const pct = monthlyIncome > 0 ? ((s.amount / monthlyIncome) * 100).toFixed(1) : "0.0";
      return `- ${s.category}: ₹${s.amount.toLocaleString("en-IN")}/month (${pct}% of income) — ${s.status.replace("_", " ")}`;
    })
    .join("\n");

  // Per-strategy milestones scoped to the selected strategy only
  const selectedMilestones: StrategyMilestone[] =
    computed.strategicMilestones?.[selectedStrategy] ?? [];

  const milestoneLines = selectedMilestones
    .map((m) =>
      `Month ${m.month} (${m.date}): ${m.event}\n` +
      `  Total payment this month: ₹${Math.round(m.totalPayment).toLocaleString("en-IN")}\n` +
      `  Payment split: ${m.paymentBreakdown}`
    )
    .join("\n");

  const creditCardUtilizationLine = hasCards
    ? `- Credit card utilization: ${utilizationPct}% (₹${Math.round(totalCardBalance).toLocaleString("en-IN")} of ₹${Math.round(totalCardLimit).toLocaleString("en-IN")} limit)`
    : "";

  return `You are a financial coach writing personalised guidance for a debt repayment report.
All numbers below are pre-computed and mathematically correct. Do NOT invent, alter, or
re-calculate any numbers. Reference them exactly as given.
Return ONLY valid JSON matching the schema at the end. No markdown, no explanation.

IMPORTANT CONTEXT — READ FIRST:
- The user's SELECTED strategy is: ${selectedStrategyLabel}
- All narrative, roadmap actions, and recommendations MUST refer to this strategy by name.
- Never mention or recommend a different strategy name in insights, quickWins, or roadmapActions.

PROFILE:
- Name: ${formData.name}, Age: ${formData.age}, City: ${formData.city || "not specified"}
- Occupation: ${formData.occupation}
- Marital status: ${formData.maritalStatus || "not specified"}
- Monthly income: ₹${Math.round(monthlyIncome).toLocaleString("en-IN")}
- Monthly living expenses: ₹${Math.round(monthlyLiving).toLocaleString("en-IN")}
- Monthly surplus (after living + all minimums): ₹${Math.round(surplus).toLocaleString("en-IN")}

DEBT SUMMARY:
- Total debt: ₹${Math.round(totalDebt).toLocaleString("en-IN")}
- Number of debts: ${allDebts.length}
- Highest interest debt: ${highestRateDebt ? `${highestRateDebt.name} at ${highestRateDebt.rate}% APR` : "none"}
- DTI ratio: ${dtiPct}% (monthly minimums / income)${hasCards ? `\n${creditCardUtilizationLine}` : ""}

ASSETS & RESERVES:
- Liquid assets (cash + savings): ₹${computed.liquidAssets.toLocaleString("en-IN")}
- Investments: ₹${Math.round(investmentAssets).toLocaleString("en-IN")}
- Non-home debt total: ₹${Math.round(nonHomeDebt).toLocaleString("en-IN")}
- Home loan total: ₹${Math.round(homeDebt).toLocaleString("en-IN")}
${investmentCoversNonHomeDebt
  ? `⚠ INVESTMENT OFFSET OPPORTUNITY: Investments (₹${Math.round(investmentAssets).toLocaleString("en-IN")}) fully cover all non-home debt (₹${Math.round(nonHomeDebt).toLocaleString("en-IN")}). In one of your insights[], you MUST flag this clearly: the user could potentially liquidate part of their investments to eliminate all non-home debt immediately, saving years of interest. Present this as an option to evaluate — not a directive — acknowledging tax implications and opportunity cost of exiting investments. Do NOT mandate it.`
  : investmentPartialCover
  ? `ℹ PARTIAL INVESTMENT OFFSET: Investments (₹${Math.round(investmentAssets).toLocaleString("en-IN")}) cover ${Math.round((investmentAssets / nonHomeDebt) * 100)}% of non-home debt (₹${Math.round(nonHomeDebt).toLocaleString("en-IN")}). In one of your insights[], mention that partial liquidation could meaningfully accelerate payoff of the highest-rate debts.`
  : ""}

LIFECYCLE / RETIREMENT ANCHOR (use exact figures; cite in insights[] when FLAG applies):
- Current age: ${ageNum || "not specified"}
- Under ${selectedStrategyLabel}, all debts clear by month ${maxPayoffMonth} of the plan (${selectedResult.summary.estimatedPayoffDate}).
- Approximate age when the last debt clears if the plan holds: ${approxAgeAtDebtFree.toFixed(1)} years (planning anchor only — not legal retirement advice).
${retirementTimingFlag
  ? `⚠ RETIREMENT-RUNWAY FLAG: At least ONE insight[] MUST explicitly connect this timeline to remaining earning years or retirement readiness (reference age ${ageNum} and ~${approxAgeAtDebtFree.toFixed(1)} yrs at payoff). If a home loan is present, name how many years/months of payments remain before typical retirement ages (58–62). Tone: constructive, not alarmist.`
  : "ℹ Optional: if age + payoff horizon still warrants a light career-runway note, you may include it in one insight — not mandatory."}

EDUCATION LOAN vs CASH / FD-LIKE SAVINGS:
- Education-type loans: ${educationLoanSummary}
- Cash + savings (FD-like liquidity; excludes investments & gold): ₹${Math.round(cashSavingsLiquidity).toLocaleString("en-IN")}
${educationLiquidityStressTest
  ? `⚠ EDUCATION / FD TRADE-OFF FLAG: At least ONE insight[] MUST discuss the trade-off between keeping this education loan at its stated cost versus deploying part of cash/savings (FD-like liquidity) to reduce principal or stress — use the balances above. Acknowledge lock-in, penalties, and emergency-cash needs; do not mandate breaking FDs.`
  : ""}

ZONE A — ALL STRATEGY OUTCOMES (use ONLY for insights[] and quickWins[] — never in roadmapActions):
- Safe: ₹${Math.round(monthlyBudget).toLocaleString("en-IN")}/month, payoff in ${safe.summary.estimatedPayoffMonths} months (${safe.summary.estimatedPayoffDate}), total interest paid ₹${safe.summary.totalInterestPaid.toLocaleString("en-IN")}, ${baselineIsInfinite ? "minimum payments alone will NEVER clear this debt — no valid savings figure exists" : `saves ₹${safe.summary.totalInterestSaved.toLocaleString("en-IN")} vs minimum payments`}
- Balanced: ₹${Math.round(monthlyBudget).toLocaleString("en-IN")}/month, payoff in ${balanced.summary.estimatedPayoffMonths} months (${balanced.summary.estimatedPayoffDate}), total interest paid ₹${balanced.summary.totalInterestPaid.toLocaleString("en-IN")}, ${baselineIsInfinite ? "minimum payments alone will NEVER clear this debt — no valid savings figure exists" : `saves ₹${balanced.summary.totalInterestSaved.toLocaleString("en-IN")} vs minimum payments`}
- Aggressive: ₹${Math.round(aggressiveBudget).toLocaleString("en-IN")}/month${aggressiveSpendingSavings > 0 ? ` (assumes 25% cut to overspend categories)` : ""}, payoff in ${aggressive.summary.estimatedPayoffMonths} months (${aggressive.summary.estimatedPayoffDate}), total interest paid ₹${aggressive.summary.totalInterestPaid.toLocaleString("en-IN")}, ${baselineIsInfinite ? "minimum payments alone will NEVER clear this debt — no valid savings figure exists" : `saves ₹${aggressive.summary.totalInterestSaved.toLocaleString("en-IN")} vs minimum payments`}

ZONE B — SELECTED STRATEGY DETAIL (use ONLY for roadmapActions — never mix Zone A figures here):
Strategy: ${selectedStrategyLabel}
Payoff date: ${selectedResult.summary.estimatedPayoffDate}
Total months: ${selectedResult.summary.estimatedPayoffMonths}
Total interest paid: ₹${selectedResult.summary.totalInterestPaid.toLocaleString("en-IN")}
Interest saved vs minimum payments: ${baselineIsInfinite ? "incalculable — minimum payments never clear the debt" : `₹${selectedResult.summary.totalInterestSaved.toLocaleString("en-IN")}`}
Monthly budget: ₹${Math.round(selectedStrategy === 'aggressive' ? aggressiveBudget : monthlyBudget).toLocaleString("en-IN")}/month${selectedStrategy === 'aggressive' && aggressiveSpendingSavings > 0 ? ` (base ₹${Math.round(monthlyBudget).toLocaleString("en-IN")} + ₹${aggressiveSpendingSavings.toLocaleString("en-IN")} freed by cutting overspend categories 25%)` : ""}${
  baselineIsInfinite && negativeAmortDebts.length > 0
    ? `\n\nNEGATIVE AMORTIZATION WARNING:\n${negativeAmortDebts.map((d) =>
        `- ${d.name}: minimum payment ₹${d.minPayment.toLocaleString("en-IN")}/month is LESS than its monthly interest charge of ₹${d.monthlyInterest.toLocaleString("en-IN")} — this debt grows every month under minimum-only payments and will never be cleared without a structured plan.`
      ).join("\n")}\nIn insights[], communicate this clearly: state the debt name, its minimum payment, its monthly interest, and the fact that the ${selectedStrategyLabel} plan eliminates it in a specific month. Do NOT quote any "interest saved" crore figure — the baseline comparison is not meaningful here.`
    : ""
}

MILESTONE MONTHS FOR ${selectedStrategyLabel.toUpperCase()} STRATEGY ONLY
(write one roadmapAction per month listed below — use ONLY these months as keys):
${milestoneLines || "(none)"}

SPENDING (rule-based status already determined):
${spendLines || "(no expense categories provided)"}

EMERGENCY FUND:
- Current: ₹${computed.emergencyFundCurrent.toLocaleString("en-IN")}
- Target: ₹${computed.emergencyFundTarget.toLocaleString("en-IN")}
- Monthly allocation toward EF under ${selectedStrategyLabel} strategy: ₹${Math.round(efMonthlyAllocation).toLocaleString("en-IN")}
- Months to reach target: ${computed.emergencyFundMonthsToTarget}

LUMP SUM AVAILABLE FOR IMMEDIATE ACTION:
- Liquid assets: ₹${computed.liquidAssets.toLocaleString("en-IN")} (cash + savings only, not investments)
- Minimum cash buffer to retain: ₹${MINIMUM_CASH_BUFFER.toLocaleString("en-IN")}
- Safe lump sum available right now: ₹${safeToSpendLumpSum.toLocaleString("en-IN")}

DEBTS (in order of interest rate, highest first):
${debtLines || "(none)"}

---
RULES:

ZONE SEPARATION RULE:
- insights[] and quickWins[] may reference Zone A numbers to compare strategies.
- roadmapActions must ONLY use Zone B numbers (payoff date, interest saved, monthly budget).
- NEVER use Safe/Balanced/Aggressive interest figures from Zone A inside any roadmapAction.

ROADMAP ACTIONS RULE:
- roadmapActions keys must match EXACTLY the month numbers listed in Zone B milestones above.
- Each roadmapAction must ONLY reference events that occur in the ${selectedStrategyLabel} schedule above.
- NEVER reference a debt being cleared in a month where debtsCleared is empty in the schedule.
- NEVER use interest saved or payoff date figures from Zone A in roadmapActions.
- Use ONLY Zone B figures inside roadmapActions.
- If Zone B "Interest saved" says "incalculable", do NOT quote any interest saved figure
  in roadmapActions — omit it entirely or reference the negative amortization warning instead.

TOTAL PAYMENT RULE (CRITICAL — prevents wrong figures):
- When describing the total payments made in any roadmapAction, use ONLY the
  "Total payment this month" figure shown for that specific month in Zone B above.
- NEVER use a total payment figure from another month or from another strategy.
- NEVER infer or recalculate total payments from Zone A comparison data.
- Example: if Month 1 shows "Total payment this month: ₹21,680" — write ₹21,680,
  not ₹28,000 or any other amount, even if other strategies show ₹28,000.

PAYMENT SPLIT RULE:
- Copy the "Payment split:" line verbatim into each roadmapAction.
- Do NOT recalculate or adjust any payment amounts.
- Format: "Payment split: DebtName1: ₹X | DebtName2: ₹Y"

INSIGHTS FRAMING RULE:
- Always frame the selected strategy (${selectedStrategyLabel}) as the primary recommendation.
- You MAY mention other strategies numerically for context, but frame them as alternatives the
  user considered — not as superior choices.
- Correct framing: "The ${selectedStrategyLabel} strategy costs ₹X more in interest than Balanced
  but fully funds your emergency reserve N months earlier — the right trade-off given your
  current reserves of only ₹${computed.emergencyFundCurrent.toLocaleString("en-IN")}."
- Incorrect framing: "The Balanced strategy saves ₹X more than ${selectedStrategyLabel}."
- The user chose ${selectedStrategyLabel}. Reinforce that choice, explain its specific benefit,
  quantify the trade-off honestly but not judgmentally.

EF MONTHLY AMOUNT RULE:
- In quickWins, if you mention building the emergency fund, the monthly amount MUST be exactly
  ₹${Math.round(efMonthlyAllocation).toLocaleString("en-IN")} — do not calculate or suggest any other figure.

LUMP SUM RULE:
- Any quickWin suggesting an immediate/this-week payment MUST NOT exceed
  ₹${safeToSpendLumpSum.toLocaleString("en-IN")}. If safeToSpendLumpSum is 0 or negative, do not suggest
  any lump sum payment — suggest redirecting monthly surplus instead.

WARNINGS RULE:
- Include a warning only if:
  - liquidAssets < 1 month of living expenses
  - credit card utilization > 30%
  - DTI > 40%
  - any debt rate > 24%
  - surplus < 10% of income
- Empty array [] if none of the above apply.

---
Return this exact JSON structure (no markdown, no explanation — raw JSON only):
{
  "insights": [
    // 3 to 5 strings. Each MUST cite a specific number from the data above.
    // Cover: surplus strength, emergency fund gap if any, highest-interest debt cost,
    //        strategy recommendation with the interest saved figure,
    //        spending pattern observation if any category is cut_down.
    // If RETIREMENT-RUNWAY FLAG or EDUCATION/FD FLAG appeared above, satisfy those MUSTs here.
  ],
  "quickWins": [
    // 2 to 3 strings. Must be actionable within 7 days.
    // Reference specific rupee amounts the user can actually afford given their surplus.
  ],
  "warnings": [
    // See WARNINGS RULE above. Empty array [] if none apply.
  ],
  "roadmapActions": {
    // One key per milestone month in Zone B above.
    // Key is the month number as a string e.g. "1", "2", "19".
    // Value: 2-3 sentences. Motivational, specific, reference what is happening
    //        that month in the ${selectedStrategyLabel} plan (debt cleared, EF milestone, etc.)
    //        Include the verbatim "Payment split:" line as the final sentence.
  }
}`;
}

function validateNarrativeResult(obj: unknown): obj is NarrativeResult {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    Array.isArray(o.insights) &&
    Array.isArray(o.quickWins) &&
    Array.isArray(o.warnings) &&
    typeof o.roadmapActions === "object" &&
    o.roadmapActions !== null &&
    !Array.isArray(o.roadmapActions)
  );
}

export async function generateNarrative(
  formData: FormData,
  computed: ComputedPlan,
  selectedStrategy: 'safe' | 'balanced' | 'aggressive'
): Promise<NarrativeResult> {
  try {
    const prompt = buildNarrativePrompt(formData, computed, selectedStrategy);

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return SAFE_DEFAULTS;

    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!validateNarrativeResult(parsed)) return SAFE_DEFAULTS;

    return parsed;
  } catch {
    return SAFE_DEFAULTS;
  }
}
