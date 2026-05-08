# Cursor Prompt — DebtClear Architecture Rebuild

## Context

This is a debt repayment SaaS (DebtClear) built with:
- **Backend**: Node.js + TypeScript, Express, Supabase (service role only), Anthropic SDK
- **Frontend**: React + TypeScript, Firebase auth, Recharts, Tailwind
- **Key files**: `backend/src/services/claude.ts`, `backend/src/services/generateStoredPlan.ts`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/lib/planData.ts`, `backend/src/types/index.ts`, `frontend/src/types/index.ts`

The current system asks Claude to compute the full amortization schedule (numbers, interest, balances, payoff dates). Claude gets the math wrong — interest figures are fabricated, running balances don't compound correctly, months go missing. We are rebuilding so that all math is computed deterministically in TypeScript, and Claude only writes narrative text (insights, warnings, quick wins, per-month roadmap actions).

Read the existing files before making changes. Do not delete any existing types or database schema. Preserve the `PlanDataV2` shape — the dashboard and PDF export depend on it.

---

## Task 1 — Create `backend/src/services/amortization.ts`

Create a new file. Do not modify any existing file yet.

This module exports one main function: `computeAllStrategies(formData: FormData): ComputedPlan`.

### Types to define internally (also export them):

```typescript
export interface NormalizedDebt {
  id: string;
  name: string;
  balance: number;          // current outstanding
  annualRate: number;       // e.g. 14.5 for 14.5%
  minimumPayment: number;   // EMI for loans, min due for cards
  type: 'loan' | 'credit_card';
  isInterestFree: boolean;
}

export interface ScheduleRow {
  month: number;
  date: string;             // "Mon YYYY" e.g. "Jun 2026"
  totalPayment: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
  debtsCleared: string[];   // debt names cleared this month
  paymentBreakdown: { name: string; amount: number }[];
}

export interface StrategyResult {
  debtOrder: {
    name: string;
    type: string;
    balance: number;
    interestRate: number;
    payoffMonth: number;
    totalInterestPaid: number;
    priority: number;
  }[];
  monthlySchedule: ScheduleRow[];   // max 20 rows, milestone-sampled
  summary: {
    totalDebt: number;
    monthlyIncome: number;
    debtToIncomeRatio: number;      // always decimal e.g. 0.26
    estimatedPayoffMonths: number;
    estimatedPayoffDate: string;    // "Mon YYYY"
    totalInterestSaved: number;     // vs minimum-payment baseline
    totalInterestPaid: number;
    strategy: 'safe' | 'balanced' | 'aggressive';
  };
}

export interface ComputedPlan {
  safe: StrategyResult;
  balanced: StrategyResult;
  aggressive: StrategyResult;
  baselineInterest: number;         // min-payment-only total interest, used for savings calc
  milestones: { month: number; date: string; event: string }[]; // for Claude prompt
  spendsOverview: {
    category: string;
    amount: number;
    status: 'on_track' | 'cut_down';
    suggestion: string;
  }[];
  liquidAssets: number;
  emergencyFundTarget: number;
  emergencyFundCurrent: number;
  emergencyFundMonthsToTarget: number;
}
```

### Algorithm requirements:

**`normalizeDebts(formData)`**
- Combine `formData.loans` and `formData.creditCards` into `NormalizedDebt[]`
- For loans: `minimumPayment = loan.monthlyEmi`
- For credit cards: `minimumPayment = card.minimumPayment`
- Exclude any debt where `balance <= 0`

**`computeMonthlyInterest(balance, annualRate)`**
- `return balance * (annualRate / 100 / 12)`
- Return 0 if `isInterestFree === true`

**`sortDebtsForStrategy(debts, strategy)`**
- `aggressive`: sort by `annualRate` descending (avalanche — kills interest fastest)
- `balanced`: sort by a combined score: `(annualRate / maxRate * 0.6) + ((maxBalance - balance) / maxBalance * 0.4)` descending (hybrid)
- `safe`: sort by `minimumPayment` descending (free up cash flow fastest once emergency fund is built)

**`computeMinimumPaymentBaseline(debts)`**
- Run amortization paying only minimums (no extra budget)
- Return total interest paid across all debts to payoff
- Cap at 480 months

**`runAmortization(debts, monthlyBudget, startDate, emergencyFundConfig?)`**

```
emergencyFundConfig: {
  target: number;          // e.g. 6 * monthlyLiving
  current: number;         // cash + savings assets
  monthlyAllocation: number; // how much per month to divert to EF
}
```

Loop logic (per month):
1. `budgetThisMonth = monthlyBudget`
2. If emergency fund not yet reached target: subtract `emergencyFundConfig.monthlyAllocation` from budget (floor at 0). Track EF balance separately.
3. For each debt (in priority order): accrue interest → `debt.balance += computeMonthlyInterest(debt.balance, debt.annualRate)`
4. Pay minimum on every debt first: `pay = min(debt.minimumPayment, debt.balance)`, subtract from balance and from `budgetThisMonth`
5. With remaining budget: cascade to priority #1 debt, then #2, etc.
6. Detect cleared debts (`balance <= 0.5`), zero them out, record `debtsCleared`
7. Record `paymentBreakdown` — per-debt amounts paid this month
8. Compute `totalPayment`, `principalPaid`, `interestPaid`, `remainingBalance` for the row
9. Stop when all debts cleared or month >= 480

**Strategy-specific configs:**

| Strategy | emergencyFundConfig | extraBudget allocation |
|----------|--------------------|-----------------------|
| `safe` | target = 6 × monthlyLiving, allocation = min(surplus × 0.7, target/8) | remaining surplus after EF allocation |
| `balanced` | target = 3 × monthlyLiving, allocation = min(surplus × 0.4, target/6) | remaining surplus after EF allocation |
| `aggressive` | none — no emergency fund diversion | full surplus toward debts |

Where `surplus = monthlyIncome - monthlyLiving - totalMinPayments`.

**`sampleSchedule(fullSchedule, maxRows = 20)`**
- If payoff <= 12 months: return all rows (already ≤ 20)
- Otherwise:
  - Always include months 1–12
  - Then every 3rd month until payoff
  - Always include the final payoff month
  - Deduplicate and sort by month
  - If still > 20 rows: keep months 1–6, then every Nth month to fit within 20, always keep final month
- Return sampled rows

**`extractMilestones(allStrategies)`**
- Union of all `debtsCleared` events across all strategies
- Format as `{ month, date, event: "SBI Credit Card cleared" }`
- Used to tell Claude which months need a roadmap narrative

**`computeSpendsOverview(formData)`**
- For each enabled expense category, compute `pct = amount / monthlyIncome * 100`
- `cut_down` if: rent > 35%, food > 15%, shopping > 10%, others > 12%, any single category > 20%
- `on_track` otherwise
- Write a one-line rule-based suggestion string (no LLM): e.g. "Excellent — at X% of income, no action needed" or "Consider reducing by ₹N to free up debt repayment capacity"

**`computeAllStrategies(formData)`**
- Call `normalizeDebts`
- Compute `monthlyLiving` from enabled expense categories (same as existing `resolvedMonthlyLivingCosts`)
- Compute `surplus = monthlyIncome - monthlyLiving - totalMinPayments`
- Compute `baselineInterest` via `computeMinimumPaymentBaseline`
- Run amortization for all 3 strategies
- For each strategy: `totalInterestSaved = baselineInterest - strategy.totalInterestPaid`; clamp to 0 minimum
- `debtToIncomeRatio = totalMinPayments / monthlyIncome` (always decimal, never > 1 clamp)
- Sample schedules to 20 rows
- Return `ComputedPlan`

---

## Task 2 — Create `backend/src/services/claudeNarrative.ts`

New file. This replaces the narrative-generation parts of `claude.ts`.

Export one function: `generateNarrative(formData: FormData, computed: ComputedPlan): Promise<NarrativeResult>`

```typescript
export interface NarrativeResult {
  insights: string[];
  quickWins: string[];
  warnings: string[];
  roadmapActions: Record<string, string>; // key = month number as string
}
```

**Build the prompt as follows** (all values interpolated from `formData` and `computed`):

```
You are a financial coach writing personalised guidance for a debt repayment report.
All numbers below are pre-computed and mathematically correct. Do NOT invent, alter, or
re-calculate any numbers. Reference them exactly as given.
Return ONLY valid JSON matching the schema at the end. No markdown, no explanation.

PROFILE:
- Name: {formData.name}, Age: {formData.age}, City: {formData.city}
- Occupation: {formData.occupation}
- Monthly income: ₹{formData.monthlyIncome}
- Monthly living expenses: ₹{monthlyLiving}
- Monthly surplus (after living + all minimums): ₹{surplus}

DEBT SUMMARY:
- Total debt: ₹{totalDebt}
- Number of debts: {debtCount}
- Highest interest debt: {highestRateDebt.name} at {highestRateDebt.rate}% APR
- DTI ratio: {dtiPct}% (monthly minimums / income)
{if cards} - Credit card utilization: {utilizationPct}% (₹{cardBalance} of ₹{cardLimit} limit){/if}

ASSETS & RESERVES:
- Liquid assets (cash + savings): ₹{liquidAssets}
- Investments: ₹{investmentAssets}
- Emergency fund current: ₹{efCurrent}, target: ₹{efTarget}
- Months to build emergency fund: {efMonths}

STRATEGY OUTCOMES (pre-computed):
- Safe: payoff in {safeMonths} months ({safeDate}), total interest paid ₹{safeInterestPaid}, saves ₹{safeInterestSaved} vs minimum payments
- Balanced: payoff in {balancedMonths} months ({balancedDate}), total interest paid ₹{balancedInterestPaid}, saves ₹{balancedInterestSaved} vs minimum payments
- Aggressive: payoff in {aggressiveMonths} months ({aggressiveDate}), total interest paid ₹{aggressiveInterestPaid}, saves ₹{aggressiveInterestSaved} vs minimum payments

DEBTS (in order of interest rate, highest first):
{for each debt}: - {name} ({type}): ₹{balance} at {rate}% APR, min ₹{minPayment}/month

SPENDING (rule-based status already determined):
{for each expense}: - {category}: ₹{amount}/month ({pct}% of income) — {status}

MILESTONE MONTHS (write a roadmapAction for each month listed):
{for each milestone}: Month {month} ({date}): {event}

---

Return this exact JSON structure:
{
  "insights": [
    // 3 to 5 strings. Each MUST cite a specific number from the data above.
    // Cover: surplus strength, emergency fund gap if any, highest-interest debt cost,
    //        best strategy recommendation with the interest saved figure,
    //        spending pattern observation if any category is cut_down.
  ],
  "quickWins": [
    // 2 to 3 strings. Must be actionable within 7 days.
    // Reference specific rupee amounts the user can actually afford given their surplus.
    // Do not suggest amounts exceeding liquid assets for lump-sum actions.
  ],
  "warnings": [
    // Specific risks only. Include if:
    // - liquidAssets < 1 month of living expenses
    // - credit card utilization > 30%
    // - DTI > 40%
    // - any debt rate > 24%
    // - surplus < 10% of income
    // Empty array [] if none of the above apply.
  ],
  "roadmapActions": {
    // One key per milestone month provided above.
    // Key is the month number as a string e.g. "1", "3", "12".
    // Value: 2-3 sentences. Motivational, specific, reference what is happening
    //        financially that month (debt cleared, emergency fund milestone, etc.)
  }
}
```

**API call config:**
```typescript
const message = await client.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 1500,
  messages: [{ role: 'user', content: prompt }],
});
```

Parse response: extract JSON with `/\{[\s\S]*\}/`, `JSON.parse`. Validate that `insights`, `quickWins`, `warnings` are arrays and `roadmapActions` is an object. If validation fails, return safe defaults (empty arrays, empty object) rather than throwing — the math is already correct, narrative failure is non-fatal.

---

## Task 3 — Create `backend/src/services/planAssembler.ts`

New file. Merges computed math + Claude narrative into the `PlanDataV2` shape the rest of the system expects.

```typescript
import { ComputedPlan, StrategyResult } from './amortization';
import { NarrativeResult } from './claudeNarrative';

export function assemblePlanData(
  computed: ComputedPlan,
  narrative: NarrativeResult,
  defaultStrategy: 'safe' | 'balanced' | 'aggressive'
): PlanDataV2 {
  // Map each StrategyResult into the PlanDataV2 strategy slice
  // Inject narrative.roadmapActions[month] into each ScheduleRow as `rm`
  // Inject narrative into shared block
  // Return full PlanDataV2
}
```

The `monthlySchedule` rows must use the compact key format (`m`, `dt`, `tp`, `pp`, `ip`, `rb`, `cl`, `rm`, `bd`) matching the existing `expandScheduleRow()` mapping so nothing downstream breaks.

`spendsOverview` comes from `computed.spendsOverview` (rule-based, not from Claude).

---

## Task 4 — Rewrite `backend/src/services/generateStoredPlan.ts`

Replace the body of `generateAndPersistPlan` and `runUnlockGeneration` with the new pipeline. Keep the function signatures identical so no routes need changing.

**New `generateAndPersistPlan(planId, strategy)` flow:**

```
1. Fetch form_data from debt_submissions
2. computeAllStrategies(formData)          ← deterministic, no API call
3. generateNarrative(formData, computed)   ← one Claude call, ~1,500 tokens max
4. assemblePlanData(computed, narrative, defaultStrategy)
5. Upsert plan_data into plans table
```

Remove the `skipShared` optimisation entirely — it is no longer needed because Claude is called once per plan total, not once per strategy. All three strategies are computed in the same synchronous amortization call.

**New `runUnlockGeneration(planId)` flow:**

```
1. generateAndPersistPlan(planId)   ← single await, produces all 3 strategies at once
```

Remove the background fire-and-forget for individual strategies. The on-demand regeneration endpoint (`POST /plan/:id/regenerate`) can remain but should now call `generateAndPersistPlan` which recomputes everything — it is fast because math is local.

---

## Task 5 — Update `backend/src/services/claude.ts`

This file can be dramatically simplified. It should now only contain:

1. The Anthropic client initialisation
2. Re-export or delegate to `claudeNarrative.ts`

Remove `generateDebtPlan()` entirely. Remove all prompt-building logic, all strategy instruction text, all JSON shape specifications. Those are replaced by `claudeNarrative.ts`.

Keep the client singleton so other files can import it if needed.

---

## Task 6 — Update `backend/src/types/index.ts`

Add the new types from `amortization.ts` if they are not already present. Do not remove any existing types. Ensure `PlanDataV2` still has:

```typescript
interface PlanDataV2 {
  version: 2;
  defaultStrategy: 'safe' | 'balanced' | 'aggressive';
  shared: {
    insights: string[];
    quickWins: string[];
    warnings: string[];
    spendsOverview: SpendsOverviewItem[];
  };
  strategies: {
    safe?: StrategySlice;
    balanced?: StrategySlice;
    aggressive?: StrategySlice;
  };
}
```

The `StrategySlice` shape must remain identical to what `expandScheduleRow()` and `getPlanView()` on the frontend already expect.

---

## Task 7 — Update `frontend/src/lib/planData.ts`

No structural changes needed. Verify that `getPlanView` and `expandScheduleRow` handle the `rm` (roadmapAction) and `bd` (paymentBreakdown) fields correctly for the Roadmap tab. If `rm` is missing on a row, default to empty string. No other changes.

---

## Task 8 — Update `frontend/src/pages/Dashboard.tsx`

The dashboard shape does not change. However:

1. Remove the stale-plan detection logic (`planDataIsStale` check based on `totalInterestSaved === 0`) — with deterministic math this will never happen.

2. The strategy selector currently triggers on-demand generation if a strategy slice is missing. Keep this UI but change the behaviour: since all 3 strategies are now always generated together, the slice will always be present. The click handler can simply switch `uiStrategy` without any API call.

3. The Roadmap tab renders `row.roadmapAction` (expanded from `rm`). Verify it renders correctly. If `roadmapAction` is an empty string (non-milestone months that weren't sent to Claude), render nothing for that field rather than an empty paragraph.

4. No changes to chart colours, tab structure, PDF export, or auth logic.

---

## Constraints & rules

- Do not change any Supabase table schema or RLS policies.
- Do not change any route paths or HTTP method signatures.
- Do not change Firebase auth logic.
- Do not change the PDF generator.
- Preserve all existing TypeScript strict-mode compliance — no `any` except where it already exists.
- All monetary values stored and computed in full rupees (integers where possible), rounded with `Math.round()` before storage.
- `debtToIncomeRatio` must always be stored as a decimal (0.26 not 26). The frontend already normalises both formats but going forward always emit decimal.
- After changes, the existing `assertMultiStrategyPayload()` validator must still pass on the assembled output. Update it only if a field it checks is being renamed — do not relax its checks.
- Add a `// COMPUTED — do not send to LLM` JSDoc comment on every field in `StrategyResult` to make the boundary clear for future developers.

---

## Testing checklist (verify manually after rebuild)

- [ ] A plan with 1 loan + 1 credit card produces correct month-1 interest: `balance × (rate/100/12)`
- [ ] A plan where credit card clears in month 2 shows `debtsCleared: ["Card Name"]` on that row
- [ ] `totalInterestSaved` is always > 0 and always `aggressive > balanced > safe` (or equal if surplus is 0)
- [ ] `estimatedPayoffMonths` ordering: `aggressive <= balanced <= safe` always
- [ ] `debtToIncomeRatio` is always between 0 and 1
- [ ] Schedule has at most 20 rows
- [ ] Final schedule row always has `remainingBalance = 0`
- [ ] Claude call uses max 1,500 output tokens and prompt is under 800 input tokens for a typical 2-debt case
- [ ] If Claude call fails, the plan still saves with empty narrative arrays (math is preserved)
- [ ] `spendsOverview` is populated without any Claude involvement
- [ ] Existing dashboard renders without any frontend code changes (only backend changed)