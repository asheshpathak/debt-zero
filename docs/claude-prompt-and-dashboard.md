# Claude Prompt, Generation Strategy & Dashboard Construction

> Source of truth: `backend/src/services/claude.ts`, `backend/src/services/generateStoredPlan.ts`, `frontend/src/pages/Dashboard.tsx`

---

## Table of Contents

1. [High-level flow](#1-high-level-flow)
2. [The prompt — what is sent to Claude](#2-the-prompt--what-is-sent-to-claude)
   - [2.1 Role & persona](#21-role--persona)
   - [2.2 Profile block](#22-profile-block)
   - [2.3 Cashflow block](#23-cashflow-block)
   - [2.4 Assets block](#24-assets-block)
   - [2.5 Debt blocks](#25-debt-blocks)
   - [2.6 Strategy instructions](#26-strategy-instructions)
   - [2.7 Schedule rules & math constraints](#27-schedule-rules--math-constraints)
   - [2.8 Shared narrative block](#28-shared-narrative-block)
   - [2.9 Required JSON shape](#29-required-json-shape)
3. [How the prompt is sent (API call)](#3-how-the-prompt-is-sent-api-call)
4. [What Claude returns](#4-what-claude-returns)
   - [4.1 Top-level shape](#41-top-level-shape)
   - [4.2 Per-strategy slice shape](#42-per-strategy-slice-shape)
   - [4.3 Compact key mapping](#43-compact-key-mapping)
   - [4.4 Response parsing](#44-response-parsing)
5. [Generation strategy — incremental / on-demand](#5-generation-strategy--incremental--on-demand)
   - [5.1 Payment unlock flow](#51-payment-unlock-flow)
   - [5.2 `runUnlockGeneration` sequencing](#52-rununlockgeneration-sequencing)
   - [5.3 `skipShared` optimisation](#53-skipshared-optimisation)
   - [5.4 On-demand regeneration](#54-on-demand-regeneration)
6. [Dashboard construction](#6-dashboard-construction)
   - [6.1 Auth & data fetch](#61-auth--data-fetch)
   - [6.2 Data normalisation — `getPlanView`](#62-data-normalisation--getplanview)
   - [6.3 Tabs and what each renders](#63-tabs-and-what-each-renders)
   - [6.4 Multi-strategy comparison chart](#64-multi-strategy-comparison-chart)
   - [6.5 PDF export](#65-pdf-export)
   - [6.6 Stale plan detection](#66-stale-plan-detection)
7. [Database schema (relevant tables)](#7-database-schema-relevant-tables)
8. [Known quirks & discrepancies](#8-known-quirks--discrepancies)

---

## 1. High-level flow

```
User fills intake form (CreatePlan.tsx)
        │
        ▼
POST /plan/submit  →  inserts debt_submissions (form_data jsonb)
                       inserts plans (paid: false, plan_data: null)
                       returns { submissionId: <plan UUID> }
        │
        ▼
User pays via Razorpay (Teaser.tsx)
        │
        ▼
POST /payment/verify  →  marks plan.paid = true
                          calls runUnlockGeneration(planId) async
        │
        ▼
runUnlockGeneration
  1. generates primary strategy (user's chosen strategy) → awaited
  2. generates the other two strategies → backgrounded (void)
        │
        ▼
generateAndPersistPlan(planId, strategy)
  1. fetches form_data from debt_submissions
  2. calls generateDebtPlan(formData, strategy, skipShared)  ← Anthropic SDK
  3. merges new strategy slice into existing plan_data in Supabase
        │
        ▼
Frontend polls GET /plan/:id every 2 s until plan_data is non-null
        │
        ▼
Dashboard renders plan_data
```

---

## 2. The prompt — what is sent to Claude

There is **no separate system prompt**. Everything is packed into a single `user` role message. The prompt string is assembled in `generateDebtPlan()` inside `backend/src/services/claude.ts`.

### 2.1 Role & persona

```
You are a certified financial planner. Analyse the following debt situation
and produce payoff projections for FOUR different prioritisation methods in
one response. Return ONLY valid JSON, no markdown, no explanation.
```

> Note: the preamble says "FOUR" but only three strategies (`safe`, `balanced`, `aggressive`) are defined. This is a copy-paste artefact that does not affect output because Claude is explicitly told which keys to produce.

---

### 2.2 Profile block

```
PROFILE:
- Name: <fd.name>
- City: <fd.city | "not specified">
- Age: <fd.age>
- Gender: <fd.gender>
- Occupation: <fd.occupation>
- Self-reported bureau score: ~<score> via <bureau>   ← or "user skipped"
```

---

### 2.3 Cashflow block

```
CASHFLOW:
- Monthly take-home income: ₹<fd.monthlyIncome>
<expenseBreakdown>          ← either per-category lines or a flat total
- Total non-debt living (rolled up): ₹<monthlyLiving>
- Monthly surplus after living + all minimum/EMI obligations: ₹<surplus>
- Extra budget user commits beyond minimums: ₹<fd.extraMonthlyBudget>
```

`expenseBreakdown()` returns either:
- **Categorised** — a line per enabled `expenseCategory` (key + amount), if the user used the category UI.
- **Flat** — `Total non-debt living costs (flat): ₹N`, if no categories were supplied.

`surplus = monthlyIncome − monthlyLiving − totalEmi − totalMinPayment`

---

### 2.4 Assets block

```
ASSETS (optional, approximate):
<assetBreakdown>
```

`assetBreakdown()` returns either:
- **Per-bucket** — enabled asset categories with amounts + a sum total.
- **"not provided"** — if no `assetCategories` exist (legacy intake or skipped).
- **"user opted out"** — if all categories are disabled.

---

### 2.5 Debt blocks

**Loans & EMI debt** — one line per loan:

```
- <name> (<type>[; flags]): Balance ₹N, Rate R% p.a., EMI ₹M, <tenure>
```

Flags: `credit_card_emi`, `interest_free` (only if applicable).

**Revolving credit cards** — one line per card:

```
- <name>: Balance ₹N, Limit ₹L, Rate R% p.a., Minimum due ₹M
```

---

### 2.6 Strategy instructions

When generating **all three strategies** (first call after payment):

```
METHODS — build a full projection ONLY for the following key(s):

### safe
Prioritize safety. If the user is low on liquid cash or lacks a Security
Fund, delay heavy extra debt payments. Direct extra cash to build a
reasonable emergency fund first (months 1-N). Only pay minimums on debts
until the fund is secure, then attack debts.

### balanced
A hybrid approach: split extra surplus cash between gradually building an
emergency fund (if needed) and accelerating debt payments (using avalanche
or snowball).

### aggressive
Focus all available cash flow strictly on eliminating the highest-interest
debts immediately to minimize total interest paid. Disregard building an
emergency fund entirely to maximize debt payoff speed.
```

When regenerating **one strategy** (on-demand), only that strategy's block is included.

The prompt also enforces relative ordering:

```
STRATEGY DIFFERENTIATION (CRITICAL):
- Aggressive MUST result in the FASTEST debt payoff (lowest estimatedPayoffMonths)
  and MOST totalInterestSaved.
- Safe MUST result in the SLOWEST debt payoff (highest estimatedPayoffMonths).
- Balanced MUST sit exactly in between.
```

**Repayment budget block:**

```
DEBT REPAYMENT BUDGET:
- Required minimums/EMIs each month: ₹<totalEmi + totalMinPayment>
- Extra committed beyond minimums: ₹<extraBudget>
- Monthly surplus available for acceleration: ₹<max(0, surplus)>
- Total monthly toward debts: ₹<totalEmi + totalMinPayment + extraBudget>
- CASCADE RULE: When a debt is fully paid off, its freed payment is
  immediately redirected to the next priority debt in this strategy.
Start date: <current month in "Mon YYYY" format>
```

---

### 2.7 Schedule rules & math constraints

```
SCHEDULE RULES (apply to each strategy's monthlySchedule independently):
- Hard max 20 rows.
- Include months 1–12 monthly if payoff ≤ 12 months.
- Otherwise: months 1–12 monthly, then every 3rd month until payoff.
- Always include the final payoff month.
- Trim to the 20 most informative rows (prefer milestone months).
- Short key mapping: m, dt, tp, pp, ip, rb, cl (see §4.3 below).
- MATH RULE: As long as rb > 0 for interest-bearing loans, ip MUST be > 0.
```

---

### 2.8 Shared narrative block

Only generated on the **first call** (when `skipShared = false`). On subsequent single-strategy calls `skipShared = true` and the prompt instructs Claude to return empty arrays.

When generating:

```
SHARED NARRATIVE (strategy-agnostic):
- insights: 3-5 key insights. IMPORTANT: Include an insight about building
  a Security Fund if one doesn't exist.
- spendsOverview: categorize non-debt living costs as "on_track" or
  "cut_down" with actionable suggestion.
- quickWins: 2-3 immediate actions
- warnings: debt risks or concerns, empty array if none
```

---

### 2.9 Required JSON shape

The prompt specifies the exact structure Claude must return:

```json
{
  "version": 2,
  "defaultStrategy": "safe|balanced|aggressive",
  "shared": {
    "insights": ["string", ...],
    "spendsOverview": [
      { "category": "...", "amount": 0, "suggestion": "...", "status": "on_track|cut_down" }
    ],
    "quickWins": ["string", ...],
    "warnings": ["string", ...]
  },
  "strategies": {
    "safe":       { ...strategySlice },
    "balanced":   { ...strategySlice },
    "aggressive": { ...strategySlice }
  }
}
```

Each strategy slice must conform to:

```json
{
  "summary": {
    "totalDebt": 0,
    "monthlyIncome": 0,
    "debtToIncomeRatio": 0.38,
    "estimatedPayoffMonths": 0,
    "estimatedPayoffDate": "Mon YYYY",
    "totalInterestSaved": 0,
    "strategy": "balanced"
  },
  "monthlySchedule": [
    { "m": 1, "dt": "Jun 2025", "tp": 0, "pp": 0, "ip": 0, "rb": 0, "cl": [], "rm": "...", "bd": [{ "n": "Debt Name", "a": 0 }] }
  ],
  "debtOrder": [
    { "name": "...", "type": "loan|credit_card", "balance": 0, "interestRate": 0, "payoffMonth": 0, "totalInterestPaid": 0, "priority": 1 }
  ]
}
```

**Field definitions enforced in the prompt:**

| Field | Rule |
|-------|------|
| `totalInterestSaved` | (Baseline min-payment total interest) minus (this strategy's total interest). Must be **> 0** for all strategies. Never 0 unless all debts are interest-free. |
| `debtToIncomeRatio` | Decimal fraction 0–1 (e.g. `0.38` = 38% DTI). |
| `totalDebt` | Must equal `₹<totalLoanDebt + totalCardDebt>` exactly. |
| `strategies.*.summary.strategy` | Must equal the parent key string. |

---

## 3. How the prompt is sent (API call)

```typescript
// backend/src/services/claude.ts

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const message = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: Math.min(4096 + debtCount * 1200, 16384),
  messages: [{ role: "user", content: prompt }],
});
```

| Parameter | Value |
|-----------|-------|
| Model | `claude-sonnet-4-5` |
| `max_tokens` | `min(4096 + (loanCount + cardCount) × 1200, 16384)` |
| Structure | Single `user` message — no system prompt |
| SDK | `@anthropic-ai/sdk` (official Node SDK) |
| Auth | `ANTHROPIC_API_KEY` env variable |

If `message.stop_reason === "max_tokens"` the call throws immediately rather than returning a truncated plan.

---

## 4. What Claude returns

### 4.1 Top-level shape

```json
{
  "version": 2,
  "defaultStrategy": "balanced",
  "shared": { "insights": [], "spendsOverview": [], "quickWins": [], "warnings": [] },
  "strategies": { "safe": {}, "balanced": {}, "aggressive": {} }
}
```

### 4.2 Per-strategy slice shape

```json
{
  "summary": {
    "totalDebt": 1200000,
    "monthlyIncome": 85000,
    "debtToIncomeRatio": 0.42,
    "estimatedPayoffMonths": 28,
    "estimatedPayoffDate": "Sep 2027",
    "totalInterestSaved": 42000,
    "strategy": "balanced"
  },
  "monthlySchedule": [...],
  "debtOrder": [...]
}
```

### 4.3 Compact key mapping

Claude returns schedule rows in compact form to save tokens:

| Short key | Expanded field |
|-----------|---------------|
| `m`  | `month` |
| `dt` | `date` |
| `tp` | `totalPayment` |
| `pp` | `principalPaid` |
| `ip` | `interestPaid` |
| `rb` | `remainingBalance` |
| `cl` | `debtsCleared` (array of strings) |
| `rm` | `roadmapAction` (narrative text for the month) |
| `bd` | `paymentBreakdown` → `[{ n: string, a: number }]` |

These are expanded by `expandScheduleRow()` and `expandCompactPlan()` before the plan is validated and stored.

### 4.4 Response parsing

```
raw text  →  regex /\{[\s\S]*\}/  →  JSON.parse  →  expandCompactPlan()  →  assertMultiStrategyPayload()
```

`assertMultiStrategyPayload()` throws if:
- `version !== 2`
- `strategies` or `shared` keys are missing
- `shared` is missing `insights`, `quickWins`, or `warnings` arrays
- Any expected strategy key is absent or its slice is missing `summary`, `monthlySchedule`, or `debtOrder`

---

## 5. Generation strategy — incremental / on-demand

### 5.1 Payment unlock flow

```
POST /payment/verify
  │
  ├── verifies Razorpay signature
  ├── marks plan.paid = true
  └── void runUnlockGeneration(planId)   ← fire-and-forget
```

### 5.2 `runUnlockGeneration` sequencing

```
runUnlockGeneration(planId):
  1. load form_data, get user's chosen strategy (e.g. "balanced")
  2. AWAIT generateAndPersistPlan(planId, "balanced")   ← blocks until done
  3. void generateAndPersistPlan(planId, "safe")        ← background
  4. void generateAndPersistPlan(planId, "aggressive")  ← background
```

The primary strategy is written first so the dashboard can render as soon as possible. The other two are written in the background and appear on the dashboard when ready (user can click them to trigger on-demand generation if they haven't landed yet).

### 5.3 `skipShared` optimisation

`generateAndPersistPlan` reads the current `plan_data` before calling Claude. If `plan_data.shared.insights` already has content, it passes `skipShared = true` to `generateDebtPlan()`.

When `skipShared = true`:
- The prompt instructs Claude to return **empty arrays** for all shared fields.
- `max_tokens` is not reduced, but the prompt is shorter.
- After generation, `finalPlanData` is assembled by merging the existing `shared` with the new strategy slice:

```typescript
finalPlanData = {
  ...existingPlanData,
  strategies: {
    ...existingPlanData.strategies,
    ...newPlanData.strategies,       // only the newly requested slice
  },
};
```

### 5.4 On-demand regeneration

```
POST /plan/:id/regenerate  { strategy: "aggressive" }
  │
  └── generateAndPersistPlan(planId, "aggressive")
        │
        └── generateDebtPlan(formData, "aggressive", skipShared=true)
              │
              └── sends prompt with ONLY the aggressive block
                  returns plan with strategies: { aggressive: {...} }
```

The frontend triggers this when the user clicks a strategy card whose slice is not yet present in `plan.planData.strategies`.

---

## 6. Dashboard construction

**File:** `frontend/src/pages/Dashboard.tsx`  
**Route:** `/dashboard/:submissionId`  
**Auth:** Firebase — unauthenticated users are redirected to `/teaser/:submissionId`.

### 6.1 Auth & data fetch

```
useEffect → fetchPlan()
  GET /plan/:submissionId   (Authorization: Bearer <Firebase ID token>)
  │
  ├── if !paid → redirect to /teaser/:submissionId
  ├── if paid && !planData → start polling every 2 s (show TerminalProgress)
  └── if paid && planData → render dashboard
```

`api.ts` injects the Firebase `getIdToken()` on every request via an Axios interceptor.

### 6.2 Data normalisation — `getPlanView`

```typescript
const view = getPlanView(plan.planData, uiStrategy);
const { summary, monthlySchedule, debtOrder, insights, quickWins, warnings } = view;
```

`getPlanView` (in `lib/planData.ts`) normalises both `PlanDataV2` (current) and legacy formats into a single `NormalizedPlanView`. For V2 data it picks the strategy slice matching `uiStrategy`, falling back to `defaultStrategy`, then the first available slice.

The `shared` object (insights, quickWins, warnings, spendsOverview) is always sourced from `plan.planData.shared` — it is strategy-agnostic.

### 6.3 Tabs and what each renders

The dashboard has five tabs: **Overview**, **Roadmap**, **Schedule**, **Debts**, **Insights**.

**Overview tab**

| Section | Data source | What it shows |
|---------|-------------|---------------|
| 4 stat cards | `summary` | Total Debt, Payoff (months + date), Interest Saved, DTI% |
| Strategy selector (3 cards) | `plan.planData.strategies` | Estimated months + interest saved per strategy; click to switch or trigger generation |
| Multi-strategy balance chart | All strategy `monthlySchedule` | Recharts `LineChart` overlaying remaining balance curves for all available strategies |

**Roadmap tab**

Renders a vertical timeline from `monthlySchedule`. Each entry shows:
- Month number + date
- `roadmapAction` — the narrative text Claude wrote for that month
- `paymentBreakdown` — per-debt payment amounts

**Schedule tab**

Three sub-sections at the top (strategy name, payoff date, monthly payment), then the repayment table:
- **Mobile/tablet**: collapsible card-per-month with principal/interest progress bar
- **Desktop**: grid table with columns: `#`, Date, Total Payment, Principal, Interest, Total Balance, Paid Off

Defaults to showing only the first row; a chevron button expands all rows.

**Debts tab**

Priority-ordered debt cards from `debtOrder`. Each card shows:
- Debt name, type, interest rate
- Current balance (coloured by priority)
- Progress bar (payoff month relative to total months)
- Payoff month number + total interest paid under this strategy

**Insights tab**

| Section | Data source |
|---------|-------------|
| 3 summary stat tiles | `summary` (best strategy, payoff date, interest saved) |
| Spends Overview | `shared.spendsOverview` — per-category status badge + suggestion |
| Key Insights | `shared.insights` — bullet list with lightbulb icon |
| Quick Wins | `shared.quickWins` — bullet list with zap icon |
| Warnings | `shared.warnings` — bullet list with triangle icon |

### 6.4 Multi-strategy comparison chart

Built by `multiStrategyChartData` (a `useMemo`):

```
For each strategy slice in plan.planData.strategies:
  For each row in slice.monthlySchedule:
    dateMap[row.date][strategyKey] = row.remainingBalance

→ Array sorted by month number, used as Recharts data
```

Each strategy gets a `<Line>` with its colour (`safe=#22c55e`, `balanced=#f59e0b`, `aggressive=#ef4444`). The active strategy is drawn as a solid line; others are dashed.

### 6.5 PDF export

On "Export PDF" button click, the component dynamically imports `../lib/pdfGenerator` and calls `generateFinancialReport(plan, uiStrategy)`. This keeps the PDF library out of the initial bundle.

### 6.6 Stale plan detection

The dashboard detects plans generated with an outdated prompt if all strategies have `totalInterestSaved === 0` AND all strategies have identical `estimatedPayoffMonths`:

```typescript
const planDataIsStale =
  allStrategySummaries.every((s) => s.summary.totalInterestSaved === 0) &&
  new Set(allStrategySummaries.map((s) => s.summary.estimatedPayoffMonths)).size === 1;
```

When stale, a yellow warning banner is shown with a "Regenerate now" button.

---

## 7. Database schema (relevant tables)

```sql
-- Anonymous intake data — never exposed to frontend
debt_submissions (
  id uuid PRIMARY KEY,
  form_data jsonb NOT NULL,   -- full FormData object
  created_at timestamptz
)

-- One plan per submission; owned by a Firebase UID after payment
plans (
  id uuid PRIMARY KEY,
  submission_id uuid REFERENCES debt_submissions,
  user_id text REFERENCES users(firebase_uid),
  paid boolean DEFAULT false,
  plan_data jsonb,            -- PlanDataV2 JSON once generated; null until then
  created_at timestamptz
)

-- Payment audit trail
payments (
  id uuid PRIMARY KEY,
  plan_id uuid REFERENCES plans,
  user_id text,
  razorpay_order_id text UNIQUE,
  razorpay_payment_id text,
  status text CHECK (status IN ('pending','paid','failed'))
)
```

All three tables have RLS enabled with `USING (false)` policies — the backend exclusively uses the Supabase **service role** key. The frontend never touches Supabase directly.

---

## 8. Known quirks & discrepancies

| # | Location | Issue |
|---|----------|-------|
| 1 | Prompt preamble | Says "FOUR different prioritisation methods" but only three strategy keys exist (`safe`, `balanced`, `aggressive`). |
| 2 | `runUnlockGeneration` | The parameter is called `submissionId` in comments and API bodies but is actually the **plan UUID** throughout. |
| 3 | `/plan/submit` response | Returns `{ submissionId }` but the value is the **plan** `id`, not the `debt_submissions` id. |
| 4 | `docs/intake-and-claude-generation.md` | Documents four legacy strategies (`avalanche`, `snowball`, etc.), 60-row schedules, and a fixed `max_tokens: 16384`. All three are outdated — prefer `claude.ts` as source of truth. |
| 5 | README | Lists model as `claude-opus-4-5`; `claude.ts` actually uses `claude-sonnet-4-5`. |
| 6 | DTI normalisation | Claude sometimes returns DTI as a decimal (0.38) and sometimes as a percent (38). The dashboard normalises both: `ratio < 2 ? ratio * 100 : ratio`. |
