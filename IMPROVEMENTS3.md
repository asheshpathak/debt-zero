# Cursor Prompt — Fix Strategy Narrative Contamination & Safe Debt Order

## Context

The amortization math is correct. The PDF multi-strategy output is working.
The remaining bugs are all in how Claude's narrative prompt is constructed —
specifically, milestone events and interest figures from other strategies are
leaking into the selected strategy's roadmap narrative.

Read `backend/src/services/claudeNarrative.ts` and
`backend/src/services/amortization.ts` fully before making any change.

---

## Bug 1 — Safe strategy debt priority order is wrong

**File:** `backend/src/services/amortization.ts`
**Function:** `sortDebtsForStrategy(debts, strategy)`

**Problem:** Safe strategy currently puts the ₹21L loan at priority #1 above
the ₹80K credit card. The credit card has a higher rate (18% vs 11.5%) and
a smaller balance — it should always be cleared first regardless of strategy.
The difference between strategies is how aggressively the *extra budget* is
deployed, not the order of obvious high-interest small debts.

**Fix:** Change the Safe sort logic. Safe should sort by:

```typescript
case 'safe':
  // Primary: clear highest-rate debts first (same as avalanche)
  // Safe distinction is in budget allocation (EF first), not debt order
  return [...debts].sort((a, b) => b.annualRate - a.annualRate);
```

The Safe strategy's conservative nature is expressed through the emergency
fund allocation diverting budget — not through an irrational debt ordering.
After this fix, all three strategies will clear the high-rate card first,
which is financially correct. The strategies will still differ meaningfully
in payoff speed and total interest because of the EF allocation difference.

---

## Bug 2 — Roadmap actions mix up events across strategies

**File:** `backend/src/services/claudeNarrative.ts`

**Root cause:** The milestone months passed to Claude's prompt are extracted
from all strategies combined (`extractMilestones` unions events across all
three). When Claude writes the Safe roadmap, it sees "SBI Prime cleared Month
1" (from Aggressive) and "SBI Prime cleared Month 2" (from Balanced) and
uses those events in Safe's narrative — even though under Safe the card isn't
cleared until Month 19.

**Fix — pass per-strategy milestones, not a union:**

Change `generateNarrative` to accept milestones scoped to the selected
strategy only:

```typescript
// Before
const milestones = extractMilestones(computed); // union across all strategies

// After — extract only from the selected strategy's schedule
const milestones = extractMilestonesForStrategy(
  computed[selectedStrategy].monthlySchedule
);
```

Add this function to `amortization.ts`:

```typescript
export function extractMilestonesForStrategy(
  schedule: ScheduleRow[]
): { month: number; date: string; event: string }[] {
  const milestones: { month: number; date: string; event: string }[] = [];

  for (const row of schedule) {
    if (row.debtsCleared.length > 0) {
      milestones.push({
        month: row.month,
        date: row.date,
        event: row.debtsCleared.map(name => `${name} fully cleared`).join(' and '),
      });
    }
  }

  // Always include month 1 as a starting milestone
  if (!milestones.find(m => m.month === 1)) {
    milestones.unshift({
      month: 1,
      date: schedule[0]?.date ?? '',
      event: 'Repayment begins — first payments made',
    });
  }

  // Always include final payoff month
  const lastRow = schedule[schedule.length - 1];
  if (lastRow && !milestones.find(m => m.month === lastRow.month)) {
    milestones.push({
      month: lastRow.month,
      date: lastRow.date,
      event: 'All debts cleared — debt-free achieved',
    });
  }

  return milestones;
}
```

---

## Bug 3 — Roadmap narrative context contains wrong strategy's numbers

**File:** `backend/src/services/claudeNarrative.ts`

**Problem:** The prompt currently injects all three strategy summaries into
context and lets Claude pick numbers freely. Claude picks the wrong ones when
writing roadmap actions — e.g. writing "you saved ₹5,71,420" (Balanced's
figure) into Safe's Month 18 narrative.

**Fix — in the prompt, expose ONLY the selected strategy's numbers in the
roadmap section:**

Split the prompt into two clearly separated zones:

```
ZONE A — COMPARISON CONTEXT (for insights and quickWins only):
Use these to write insights[] and quickWins[] that reference all strategies.

  Safe:       {safeMonths} months, saves ₹{safeInterestSaved}
  Balanced:   {balancedMonths} months, saves ₹{balancedInterestSaved}
  Aggressive: {aggressiveMonths} months, saves ₹{aggressiveInterestSaved}

ZONE B — SELECTED STRATEGY ONLY (for roadmapActions only):
Strategy: {selectedStrategy}
Payoff date: {selectedPayoffDate}
Total interest paid: ₹{selectedInterestPaid}
Interest saved: ₹{selectedInterestSaved}
Monthly payment (after EF phase): ₹{selectedMonthlyPayment}

MILESTONE MONTHS FOR {selectedStrategy} STRATEGY ONLY:
{for each milestone in selectedStrategyMilestones}
  Month {month} ({date}): {event}
{/for}

STRICT RULE — roadmapActions:
- roadmapActions keys must match EXACTLY the month numbers listed above.
- Each roadmapAction must ONLY reference events that occur in the
  {selectedStrategy} schedule above.
- NEVER reference a debt being cleared in a month where debtsCleared is
  empty in the schedule above.
- NEVER use interest saved or payoff date figures from Zone A in roadmapActions.
- Use ONLY Zone B figures inside roadmapActions.
```

---

## Bug 4 — Insights frame selected strategy negatively for Safe users

**File:** `backend/src/services/claudeNarrative.ts`

**Problem:** When the user selects Safe, the insight says:
*"The Balanced strategy clears debt by Oct 2027 saving ₹5,71,420 — ₹21,664
more than the Safe approach"* — framing Safe as the inferior choice to someone
who already chose it.

**Fix:** Add a rule to the insights section of the prompt:

```
INSIGHTS FRAMING RULE:
- Always frame the selected strategy ({selectedStrategy}) as the primary
  recommendation.
- You MAY mention other strategies numerically for context, but frame them
  as alternatives the user considered, not as superior choices.
- Correct framing: "The Safe strategy costs ₹21,664 more in interest than
  Balanced but fully funds your emergency reserve 4 months earlier —
  the right trade-off given your current reserves of only ₹30,000."
- Incorrect framing: "The Balanced strategy saves ₹21,664 more than Safe."
- The user chose {selectedStrategy}. Reinforce that choice, explain its
  specific benefit, quantify the trade-off honestly but not judgmentally.
```

---

## Bug 5 — Payment breakdown in roadmap actions uses wrong figures

**File:** `backend/src/services/claudeNarrative.ts`

**Problem:** The payment split shown in roadmap narrative (e.g.
"AXIs: ₹1,04,125 | SBI Prime: ₹5,000") is either invented by Claude or
copied from the wrong strategy's breakdown.

**Fix:** Do not ask Claude to write payment splits at all. Payment breakdowns
are already computed deterministically in `paymentBreakdown` (`bd` field) on
each `ScheduleRow`. Instead, inject them into the prompt as ground truth and
tell Claude to use them verbatim:

In the milestone data passed to Claude, include the pre-computed breakdown:

```typescript
milestones.map(m => {
  const row = schedule.find(r => r.month === m.month);
  const breakdown = row?.paymentBreakdown
    .map(b => `${b.name}: ₹${Math.round(b.amount).toLocaleString('en-IN')}`)
    .join(' | ') ?? '';
  return { ...m, paymentBreakdown: breakdown };
});
```

In the prompt:

```
MILESTONE MONTHS — include the payment split exactly as shown, verbatim:
Month {month} ({date}): {event}
  Payment split: {paymentBreakdown}   ← copy this exactly into your narrative
```

Add to the rules:

```
PAYMENT SPLIT RULE:
- Copy the payment split line verbatim into each roadmapAction.
- Do NOT recalculate or adjust any payment amounts.
- Format: "Payment split: DebtName1: ₹X | DebtName2: ₹Y"
```

---

## Final prompt structure after all fixes

The assembled prompt sent to Claude should follow this order:

```
IMPORTANT CONTEXT:
[selected strategy name, strong emphasis]

PROFILE:
[name, age, city, occupation, income, surplus]

DEBT SUMMARY:
[each debt with balance, rate, min payment]

ASSETS & RESERVES:
[liquid assets, investments, EF current, EF target, EF months]

ZONE A — ALL STRATEGY OUTCOMES (use only in insights and quickWins):
[safe / balanced / aggressive summary numbers]

ZONE B — SELECTED STRATEGY DETAIL (use only in roadmapActions):
[only selected strategy's payoff date, interest paid, interest saved]

MILESTONE MONTHS FOR {selectedStrategy} ONLY:
[month, date, event, paymentBreakdown — from selected strategy's schedule only]

SPENDING:
[per-category status and amount]

EMERGENCY FUND:
[current, target, monthly allocation for selected strategy, months to target]

LUMP SUM AVAILABLE:
[liquid assets minus ₹15,000 buffer]

--- RULES ---
[all existing rules from previous prompt]
[+ Zone A/B separation rule]
[+ payment split verbatim rule]
[+ insights framing rule]
[+ roadmapActions only reference selected strategy events]

--- OUTPUT SCHEMA ---
{
  "insights": [],
  "quickWins": [],
  "warnings": [],
  "roadmapActions": {}
}
```

---

## Testing checklist

- [ ] Generate with strategy = Safe. Month 1 roadmap must NOT say credit card
      is cleared. It should say first payments made and EF building begins.
- [ ] Generate with strategy = Safe. Month 19 roadmap should say both debts
      cleared (per the Safe schedule where both clear in Month 19).
- [ ] Generate with strategy = Safe. Interest saved figure in roadmapActions
      must be ₹5,49,852 — not ₹5,71,420 (Balanced) or ₹5,85,743 (Aggressive).
- [ ] Generate with strategy = Aggressive. Month 1 roadmap should say SBI Prime
      cleared. Months 2–18 should reference only AXIs loan.
- [ ] Generate with strategy = Balanced. Month 2 roadmap should say SBI Prime
      cleared. Month 18 should say AXIs cleared.
- [ ] Payment split in every roadmapAction matches the corresponding row's
      paymentBreakdown from the schedule exactly — no rounding differences.
- [ ] Safe debt priority order: SBI Prime (18%) is priority #1, AXIs (11.5%)
      is priority #2.
- [ ] Insights for Safe user frame Safe as the recommended path, mention
      Balanced only as a numbered comparison, not as a superior alternative.
- [ ] No roadmapAction references a debt being cleared in a month where
      debtsCleared is empty in the selected strategy's schedule.
- [ ] All three strategies still appear correctly in the PDF comparison table
      and per-strategy schedule pages.