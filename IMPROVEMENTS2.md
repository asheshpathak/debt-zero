# Cursor Prompt — DebtClear Narrative Fixes & Multi-Strategy PDF

## Context

The amortization engine is working correctly. All math is accurate. This prompt
fixes the remaining issues in the narrative layer (Claude) and expands the PDF
to include all three strategies.

Read all referenced files before making any change. Do not touch the amortization
engine (`amortization.ts`) — those numbers are correct and must not be altered.

---

## Fix 1 — Pass selected strategy explicitly to Claude narrative prompt

**File:** `backend/src/services/claudeNarrative.ts`

**Problem:** Claude is writing "Balanced strategy" in roadmap actions and insights
even when the user selected "Aggressive". The selected strategy name is not being
passed clearly enough in the prompt.

**Fix:** In the prompt string, add a bolded unambiguous line at the very top of
the context block, before PROFILE:

```
IMPORTANT CONTEXT — READ FIRST:
- The user's SELECTED strategy is: {selectedStrategy} (e.g. "Aggressive")
- All narrative, roadmap actions, and recommendations MUST refer to this strategy by name.
- Never mention or recommend a different strategy name in insights, quickWins, or roadmapActions.
- You may compare strategies numerically (e.g. "the aggressive approach saves ₹X more than safe")
  but always frame the selected strategy as the user's chosen path.
```

Also pass `selectedStrategy` as a parameter into `generateNarrative()`:

```typescript
export async function generateNarrative(
  formData: FormData,
  computed: ComputedPlan,
  selectedStrategy: 'safe' | 'balanced' | 'aggressive'  // add this
): Promise<NarrativeResult>
```

Update all callers of `generateNarrative` in `generateStoredPlan.ts` to pass
`formData.strategy` (or the default strategy) as the third argument.

---

## Fix 2 — Pre-compute emergency fund monthly allocation, inject into prompt

**File:** `backend/src/services/amortization.ts`

**Problem:** Claude is inventing the EF monthly allocation figure (e.g. ₹26,612)
instead of using the value computed by the amortization engine.

**Fix:** Export `emergencyFundMonthlyAllocation` explicitly in `ComputedPlan` for
each strategy:

```typescript
export interface ComputedPlan {
  // ... existing fields ...
  safe: StrategyResult & { efMonthlyAllocation: number };
  balanced: StrategyResult & { efMonthlyAllocation: number };
  aggressive: StrategyResult & { efMonthlyAllocation: number };
}
```

Or add it as a top-level field per strategy since aggressive = 0:

```typescript
efMonthlyAllocations: {
  safe: number;
  balanced: number;
  aggressive: number;   // always 0
};
```

The value for each strategy is the `emergencyFundConfig.monthlyAllocation` already
computed inside `runAmortization`. Surface it rather than recomputing.

**File:** `backend/src/services/claudeNarrative.ts`

In the prompt, replace any generic EF mention with the pre-computed figure:

```
EMERGENCY FUND:
- Current: ₹{efCurrent}
- Target: ₹{efTarget}
- Monthly allocation toward EF under {selectedStrategy} strategy: ₹{efMonthlyAllocation}
- Months to reach target: {efMonths}

RULE: In quickWins, if you mention building the emergency fund, the monthly
amount MUST be exactly ₹{efMonthlyAllocation} — do not calculate or suggest
any other figure.
```

---

## Fix 3 — Enforce minimum cash buffer in quick wins

**File:** `backend/src/services/claudeNarrative.ts`

**Problem:** Claude suggested a ₹20,000 lump-sum payment when liquid assets are
only ₹30,000, leaving just ₹10,000 in cash — below a safe buffer.

**Fix:** Compute a `safeToSpendLumpSum` value in `planAssembler.ts` or
`claudeNarrative.ts` before building the prompt:

```typescript
const MINIMUM_CASH_BUFFER = 15000; // always keep at least ₹15,000 in hand
const safeToSpendLumpSum = Math.max(0, liquidAssets - MINIMUM_CASH_BUFFER);
```

Inject into the prompt:

```
LUMP SUM AVAILABLE FOR IMMEDIATE ACTION:
- Liquid assets: ₹{liquidAssets} (cash + savings only, not investments)
- Minimum cash buffer to retain: ₹15,000
- Safe lump sum available right now: ₹{safeToSpendLumpSum}

RULE: Any quickWin suggesting an immediate/this-week payment MUST NOT exceed
₹{safeToSpendLumpSum}. If safeToSpendLumpSum is 0 or negative, do not suggest
any lump sum payment — suggest redirecting monthly surplus instead.
```

---

## Fix 4 — Tighten spending overview thresholds

**File:** `backend/src/services/amortization.ts`  
**Function:** `computeSpendsOverview(formData)`

**Problem:** The `others` category at 5.6% income was marked "On Track / Excellent"
when it deserves scrutiny. All categories were marked excellent — the thresholds
are too lenient and the suggestions are generic.

**Replace the threshold table with this:**

```typescript
const THRESHOLDS: Record<string, { cutDown: number; note: string }> = {
  rent:        { cutDown: 35, note: 'Consider if relocation or a flatmate could reduce this.' },
  food:        { cutDown: 15, note: 'Meal prepping can reduce this by 20–30%.' },
  fuel:        { cutDown: 10, note: 'Consider carpooling or public transport for part of commute.' },
  utilities:   { cutDown: 5,  note: 'Check for unused subscriptions or high electricity usage.' },
  shopping:    { cutDown: 8,  note: 'Pause non-essential purchases for the duration of payoff.' },
  healthcare:  { cutDown: 8,  note: 'Ensure you have health insurance to prevent emergency spikes.' },
  others:      { cutDown: 6,  note: 'Categorise and review — untracked spending hides savings potential.' },
};
```

**Change the suggestion logic:**

```typescript
// Always write a category-specific suggestion, never a generic one
const onTrackNote = THRESHOLDS[key]?.note ?? 'Monitor monthly.';
const onTrackSuggestion = `At ${pct.toFixed(1)}% of income — within range. ${onTrackNote}`;
const cutDownSuggestion = `At ${pct.toFixed(1)}% of income, above the ${threshold}% guideline. ${THRESHOLDS[key].note}`;

return {
  category: key,
  amount,
  status: pct > threshold ? 'cut_down' : 'on_track',
  suggestion: pct > threshold ? cutDownSuggestion : onTrackSuggestion,
};
```

Remove the word "Excellent" from all auto-generated suggestions — it's hollow
when every category gets it. Reserve positive framing only for categories that
are meaningfully low (< half the threshold).

---

## Fix 5 — Add all three strategies to the PDF report

**File:** `frontend/src/lib/pdfGenerator.ts`  
(or wherever `generateFinancialReport` lives)

**Problem:** The PDF currently only shows the selected/default strategy. Users
paid for a plan with three strategies and cannot see the others in the exported
report.

**Add a new section after the existing single-strategy content:**

### 5a — Strategy comparison summary table

Add a page (or section) titled **"Strategy Comparison"** with a table:

| Strategy | Payoff Date | Months | Total Interest | Interest Saved |
|----------|------------|--------|---------------|---------------|
| Safe     | ...        | ...    | ...           | ...           |
| Balanced | ...        | ...    | ...           | ...           |
| Aggressive | ...      | ...    | ...           | ...           |

Highlight the selected/recommended strategy row with a light background.

Source data: `plan.planData.strategies.safe.summary`,
`plan.planData.strategies.balanced.summary`,
`plan.planData.strategies.aggressive.summary`.

Guard each strategy: `if (plan.planData.strategies[key]?.summary)` before
accessing — a strategy slice may be null if generation failed.

### 5b — Per-strategy debt order section

For each available strategy, add a subsection:

```
[Strategy Name] — Debt Priority Order
# | Debt Name | Type | Balance | Rate | Payoff Month | Interest Paid
```

Same table structure as the existing single-strategy debt order table. Reuse
the existing table-drawing helper — just call it three times with different data.

### 5c — Per-strategy repayment schedule

For each available strategy, add its schedule table with all columns:
Month | Date | Total Paid | Principal | Interest | Balance | Cleared

Label each table clearly: **"Safe Strategy — Monthly Schedule"** etc.

These can be on separate pages or in collapsible sections depending on the PDF
library being used. If using jsPDF or pdfMake, add a `doc.addPage()` between
strategies to keep them clean.

### 5d — Update `generateFinancialReport` signature if needed

If the function currently accepts `(plan, uiStrategy)`, keep the signature but
use `uiStrategy` only to determine which strategy to highlight in the comparison
table — not to filter which strategies are included.

---

## Fix 6 — Verify strategy name flows through to PDF narrative

**File:** `frontend/src/lib/pdfGenerator.ts`

In the existing single-strategy summary section (page 1 "Summary at a Glance"),
the strategy shown must match `uiStrategy` passed in — not `plan.planData.defaultStrategy`.

Check every place the strategy name is rendered in the PDF and ensure it reads
from `uiStrategy` parameter, not from a hardcoded default or `shared.insights`
text.

---

## Constraints

- Do not modify `amortization.ts` math logic — only surface the
  `efMonthlyAllocation` value that is already computed internally.
- Do not change any route, database schema, or auth logic.
- Do not change dashboard UI — these are backend narrative and PDF-only changes.
- All three strategies must already exist in `plan.planData.strategies` by the
  time the PDF is generated (they do, since the rebuild generates all three
  together). Do not add any new API calls in the PDF generator.
- `MINIMUM_CASH_BUFFER` of ₹15,000 should be a named constant at the top of
  the file, not a magic number inline.
- Keep the `safeToSpendLumpSum` computation in the backend (narrative builder),
  not in the frontend — the frontend never does financial logic.

---

## Testing checklist

- [ ] Generate a plan with strategy = "Aggressive". Verify every narrative
      sentence says "Aggressive", never "Balanced" or "Safe".
- [ ] Generate a plan with strategy = "Safe". Verify insights recommend Safe
      and roadmap month 1 says Safe.
- [ ] User with liquid assets ₹30,000: quick win must not suggest lump sum > ₹15,000.
- [ ] User with liquid assets ₹10,000: no lump sum quick win at all.
- [ ] User with liquid assets ₹2,00,000: lump sum quick win up to ₹1,85,000 is acceptable.
- [ ] `others` category at 7% income → status = cut_down.
- [ ] `others` category at 5% income → status = on_track, suggestion is specific not generic.
- [ ] No category suggestion contains the word "Excellent" unless pct < threshold/2.
- [ ] PDF export contains three schedule tables, one per strategy.
- [ ] PDF strategy comparison table highlights the selected strategy.
- [ ] PDF renders correctly if one strategy slice is missing (guard null access).
- [ ] EF monthly allocation in quick wins matches the figure from the amortization engine exactly.