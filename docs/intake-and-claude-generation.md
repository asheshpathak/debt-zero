# Intake form, Claude prompt, and plan response

This document describes every field collected in the **Create Plan** questionnaire, how those fields are folded into the **debt roadmap generation prompt**, the **expected JSON response** persisted as `plans.plan_data`, and the **LLM configuration** including token limits.

Canonical TypeScript definitions: `frontend/src/types/index.ts` and `backend/src/types/index.ts` (aligned in shape; backend uses stricter numeric types post-normalization).

---

## Wizard steps → inputs

The flow is nine steps (`frontend/src/pages/CreatePlan.tsx`).

| Step | Label | Form fields / arrays |
|------|-------|---------------------|
| 1 · PROFILE | `name`, `city`, `age` (≥ 18), `gender`, `occupation` |
| 2 · INCOME | `monthlyIncome` (₹, validated ≥ 1000 in UI) |
| 3 · SPEND | `expenseCategories[]` — each `{ key, enabled, amount? }`; keys: `rent`, `food`, `fuel`, `utilities`, `shopping`, `healthcare`, `others` |
| 4 · LOANS | `loans[]` — each `LoanEntry`: `id`, `name`, `balance`, `interestRate`, `monthlyEmi`, `remainingTenureMonths?`, `type` (`personal` \| `home` \| `car` \| `education` \| `credit_card_emi` \| `other`), `isCreditCardEmi`, `interestFree` |
| 5 · CARDS | `creditCards[]` — each `CreditCardEntry`: `id`, `name`, `balance`, `limit`, `interestRate`, `minimumPayment` |
| 6 · TARGETS | `strategy` (default payoff method), `extraMonthlyBudget`, `targetMonths` |
| 7 · ASSETS | `assetCategories[]` — each `{ key, enabled, amount? }`; keys: `cash`, `savings`, `investments`, `security_fund`, `property`, `gold`, `others` |
| 8 · CREDIT | `creditScoreSkipped`, and if not skipped: `creditScoreApprox` (300–900), `creditScoreBureau` (`cibil` \| `experian` \| `crif` \| `unsure`) |
| 9 · REVIEW | Read-only summary; submit triggers backend intake + later generation |

### Derived / normalized on submit

`buildPayload` in `CreatePlan.tsx` trims strings, coerces numbers, recomputes `monthlyExpenses` from **enabled** expense categories (`sumEnabledExpenses`), normalizes loans/cards/assets, and clears credit fields when `creditScoreSkipped` is true. The same logical shape is validated on `POST /plan/submit` in `backend/src/routes/plan.ts`.

---

## Model and API parameters

| Setting | Value | Source |
|--------|--------|--------|
| **Model** | `claude-sonnet-4-5` | `backend/src/services/claude.ts` |
| **Max output tokens** | `16384` | `max_tokens` on `client.messages.create` |
| **Messages** | Single user message (full prompt as one string) | Same file |
| **Stop / failure** | If `stop_reason === "max_tokens"`, generation throws (response truncated) | Same file |

---

## Token usage (“currently”)

- The app **does not** log or persist `input_tokens`, `output_tokens`, or `cache_*` usage from the Anthropic API.
- **`max_tokens: 16384`** is only an **upper bound on the completion**; actual output length varies per case. Large multi-strategy JSON can approach this cap and trigger truncation errors.
- The Messages API response object includes usage fields (per Anthropic’s API); you can record `message.usage` in code or observability if you add instrumentation later.

---

## Prompt structure

Generation uses **one** call: `generateDebtPlan(formData)` (`backend/src/services/claude.ts`). The user message is built as follows.

### Opening line

Fixed instruction to act as a certified financial planner, produce **four** prioritisation methods in **one** response, **JSON only** (no markdown).

### PROFILE block

- `name`, `city`, `age`, `gender`, `occupation`
- Credit line from `creditScoreSkipped` / `creditScoreApprox` / `creditScoreBureau` (with bureau labels)

### CASHFLOW block

- Monthly take-home: `monthlyIncome`
- Expense breakdown from `expenseCategories` (enabled rows) via `expenseBreakdown`, or legacy-style flat living if no categories
- Rolled-up non-debt living: `resolvedMonthlyLivingCosts(formData)` (stored as `monthlyLiving`)
- Derived: surplus = income − living − Σ EMI − Σ card minimums
- `extraMonthlyBudget`
- Derived: **available monthly** toward debts = minimums + optional extra

### ASSETS block

From `assetBreakdown(formData)` over enabled `assetCategories`.

### DEBT blocks

- **Loans**: one bullet per loan with type, optional flags (`credit_card_emi`, `interest_free`), balance, rate, EMI, tenure text
- **Cards**: balance, limit, rate, minimum

### Targets

- `targetMonths` (or “not specified”)

### METHODS section

Four fixed strategy keys with fixed instruction text:

| Key | Instruction summary |
|-----|---------------------|
| `avalanche` | Highest APR first |
| `snowball` | Smallest balance first |
| `hybrid` | Weight APR and balance |
| `cash_flow_boost` | Prioritise freeing monthly breathing room |

### Schedule rules

- Per strategy `monthlySchedule`: **maximum 60 entries**
- If payoff > 60 months: months 1–12 every month, then quarterly samples until payoff, **always include final payoff month**

### Shared narrative expectations

- `insights`: 3–5 items, reference spending categories where cuts could free cash
- `quickWins`: 2–3 items
- `warnings`: risks or `[]`

### Closing constraints

- Exact top-level JSON shape (see below)
- Each `strategies.*.summary.strategy` must equal that slice’s key (e.g. `"avalanche"`)
- Rupee amounts realistic for India
- Total debt in summaries should align with input (~₹`totalDebt`)

### Dynamic values in prompt

- `defaultStrategy` from form `strategy` (must be one of the four keys; otherwise coerced to `avalanche` in code)
- `availableMonthly + extraBudget`, `surplus`, `totalDebt`
- `Start date`: `new Date().toLocaleString("en-IN", { month: "short", year: "numeric" })` at request time (server local clock)

---

## Expected response: `PlanDataV2`

Parsed from the **first JSON object** in the model text (`/\{[\s\S]*\}/`), then validated by `assertMultiStrategyPayload`.

### Top level

```json
{
  "version": 2,
  "defaultStrategy": "avalanche | snowball | hybrid | cash_flow_boost",
  "shared": {
    "insights": ["string"],
    "quickWins": ["string"],
    "warnings": ["string"]
  },
  "strategies": {
    "avalanche": { "summary": {}, "monthlySchedule": [], "debtOrder": [] },
    "snowball": { "summary": {}, "monthlySchedule": [], "debtOrder": [] },
    "hybrid": { "summary": {}, "monthlySchedule": [], "debtOrder": [] },
    "cash_flow_boost": { "summary": {}, "monthlySchedule": [], "debtOrder": [] }
  }
}
```

After parse, code forces `version = 2` and normalizes `defaultStrategy` if invalid.

### `summary` (per strategy)

| Field | Type |
|-------|------|
| `totalDebt` | number |
| `monthlyIncome` | number |
| `debtToIncomeRatio` | number |
| `estimatedPayoffMonths` | number |
| `estimatedPayoffDate` | string (`"Mon YYYY"`) |
| `totalInterestSaved` | number |
| `strategy` | string (must match parent key) |

### `monthlySchedule[]` (per strategy)

| Field | Type |
|-------|------|
| `month` | number |
| `date` | string |
| `totalPayment` | number |
| `principalPaid` | number |
| `interestPaid` | number |
| `remainingBalance` | number |
| `debtsCleared` | string[] |

### `debtOrder[]` (per strategy)

| Field | Type |
|-------|------|
| `name` | string |
| `type` | string (`loan` \| `credit_card` in prompt) |
| `balance` | number |
| `interestRate` | number |
| `payoffMonth` | number |
| `totalInterestPaid` | number |
| `priority` | number |

---

## Where this runs

- **Intake**: `POST /plan/submit` → `debt_submissions.form_data`, `plans` row with `plan_data: null` until unlock.
- **Generation**: After payment (or dev skip), `generateAndPersistPlan` → `generateDebtPlan` → `plans.plan_data` updated with `PlanDataV2`.

---

## File reference

| Concern | Path |
|---------|------|
| Claude call, prompt, model, `max_tokens` | `backend/src/services/claude.ts` |
| Timing logs `[generate] ... start / done` | `backend/src/services/generateStoredPlan.ts` |
| Form types (frontend) | `frontend/src/types/index.ts` |
| Form types (backend) | `backend/src/types/index.ts` |
