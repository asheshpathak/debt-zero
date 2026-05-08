# Cursor Prompt — Fix Moderate Issues from Priya Sharma Stress Test

## Context

The amortization math is correct. The critical overflow bug (interest saved
showing crore figures) is being fixed separately. This prompt addresses the
four moderate issues found in the Priya Sharma stress test report.

Read `backend/src/services/amortization.ts`, `backend/src/services/claudeNarrative.ts`,
and `backend/src/services/planAssembler.ts` fully before making any change.

---

## Fix 1 — Milestone months always included in sampled schedule

**File:** `backend/src/services/amortization.ts`
**Function:** `sampleSchedule(fullSchedule, maxRows = 20)`

**Problem:** The schedule sampler is dropping months where debts are cleared.
In Priya's Balanced schedule, Axis Flipkart clears in Month 17 but that row
never appears — the schedule jumps 13 → 16 → 19 → 22. In the Safe schedule,
both credit card clearance months are missing entirely, causing an unexplained
payment jump from ₹16,940 to ₹28,000 with no cleared debt event visible.

A debt clearance is always a milestone. Users must see it regardless of the
sampling algorithm.

**Fix:** Add clearance months as a mandatory inclusion set before applying
any sampling logic:

```typescript
function sampleSchedule(fullSchedule: ScheduleRow[], maxRows = 20): ScheduleRow[] {
  if (fullSchedule.length <= maxRows) return fullSchedule;

  const totalMonths = fullSchedule[fullSchedule.length - 1].month;

  // MANDATORY rows — always included regardless of row cap
  const mandatoryMonths = new Set<number>();

  // 1. Always include month 1
  mandatoryMonths.add(fullSchedule[0].month);

  // 2. Always include final payoff month
  mandatoryMonths.add(fullSchedule[fullSchedule.length - 1].month);

  // 3. Always include every month where a debt is cleared
  for (const row of fullSchedule) {
    if (row.debtsCleared.length > 0) {
      mandatoryMonths.add(row.month);
    }
  }

  // OPTIONAL rows — fill remaining slots up to maxRows
  const mandatoryRows = fullSchedule.filter(r => mandatoryMonths.has(r.month));
  const remainingSlots = maxRows - mandatoryRows.length;

  if (remainingSlots <= 0) {
    // Mandatory rows alone exceed cap — return mandatory only, sorted
    return mandatoryRows.sort((a, b) => a.month - b.month);
  }

  // Fill optional slots: months 1–12 monthly, then every 3rd month
  const optionalCandidates = fullSchedule.filter(r => !mandatoryMonths.has(r.month));
  const optionalSelected: ScheduleRow[] = [];

  for (const row of optionalCandidates) {
    if (optionalSelected.length >= remainingSlots) break;
    if (row.month <= 12 || row.month % 3 === 0) {
      optionalSelected.push(row);
    }
  }

  // Merge mandatory + optional, sort by month ascending
  const combined = [
    ...mandatoryRows,
    ...optionalSelected,
  ];

  const seen = new Set<number>();
  const deduped = combined
    .filter(r => { if (seen.has(r.month)) return false; seen.add(r.month); return true; })
    .sort((a, b) => a.month - b.month);

  return deduped;
}
```

**Verification:** After this fix, every strategy schedule for Priya must
contain Month 12 (HDFC CC cleared), Month 17 (Axis Flipkart cleared in
Balanced), and the equivalent clearance months in Safe and Aggressive.
No debt clearance event should ever be invisible in any sampled schedule.

---

## Fix 2 — Final month payment breakdown for each debt shows closing amount

**File:** `backend/src/services/amortization.ts`
**Function:** `runAmortization()`

**Problem:** In the month a debt is cleared, the `paymentBreakdown` entry
for that debt shows a full regular payment amount rather than the actual
closing balance paid. In Priya's Month 12 Balanced roadmap, HDFC CC shows
₹4,775 in the payment split even though the debt is being closed that month
— giving the impression it received a regular payment rather than a final
payoff.

**Root cause:** The amortization loop applies the minimum payment first,
then cascades extra budget. When a debt hits zero, the `paymentBreakdown`
records the full minimum + extra allocated rather than clamping to the
actual remaining balance before it hit zero.

**Fix:** In the payment recording step of the loop, clamp each debt's
recorded payment to its pre-payment balance:

```typescript
// When recording paymentBreakdown for each debt this month:
const actualPaid = Math.min(amountAllocatedToDebt, balanceBeforePayment);
paymentBreakdown.push({ name: debt.name, amount: Math.round(actualPaid) });
```

Where `balanceBeforePayment` is the debt's balance captured BEFORE the
payment is applied that month (after interest accrual, before principal
reduction).

This ensures the final month of any debt shows the exact closing rupee
amount — not an over-allocated figure.

**Verification:** In Priya's Balanced Month 12, HDFC CC's payment breakdown
amount must equal exactly the remaining balance after interest accrues that
month (approximately ₹1,20,000 - 11 months of payments, which should be
a small residual in the hundreds or low thousands — not ₹4,775).

---

## Fix 3 — Month 1 roadmap narrative uses correct total payment for selected strategy

**File:** `backend/src/services/claudeNarrative.ts`

**Problem:** The Month 1 roadmap action for Priya's Balanced report says
"payments totaling Rs.28,000" — which is the Aggressive strategy's monthly
payment. The Balanced Month 1 actual total is ₹21,680.

**Root cause:** The milestone data passed to Claude for roadmap actions
includes a `totalPayment` figure, but it is either missing from the Month 1
milestone or Claude is inferring it from Zone A comparison data where
Aggressive's ₹28,000 is visible.

**Fix — two changes:**

**Change A:** Ensure every milestone row passed to Claude explicitly includes
the `totalPayment` from that month's schedule row:

```typescript
// In claudeNarrative.ts, when building milestones for the prompt:
const milestonesForPrompt = selectedStrategyMilestones.map(m => {
  const scheduleRow = selectedSchedule.find(r => r.month === m.month);
  return {
    month: m.month,
    date: m.date,
    event: m.event,
    totalPayment: scheduleRow ? Math.round(scheduleRow.totalPayment) : null,
    paymentBreakdown: m.paymentBreakdown,
  };
});
```

**Change B:** Add an explicit rule to the prompt under the roadmap section:

```
MILESTONE MONTHS FOR {selectedStrategy} STRATEGY:
Month {month} ({date}): {event}
  Total payment this month: ₹{totalPayment}   ← use ONLY this figure for total
  Payment split: {paymentBreakdown}            ← copy verbatim

TOTAL PAYMENT RULE:
- When describing total payments in any roadmapAction, use ONLY the
  "Total payment this month" figure shown above for that specific month.
- NEVER use a total payment figure from another month or another strategy.
- If Month 1 shows ₹21,680 — write ₹21,680, not ₹28,000 or any other amount.
```

---

## Fix 4 — Interest saved display when baseline is infinite or implausibly large

**File:** `backend/src/services/amortization.ts`
**Function:** `computeMinimumPaymentBaseline()`

**Problem (overflow — root cause of the crore figure):**
At 42% APR on ₹1,20,000, monthly interest = ₹4,200. Priya's HDFC CC minimum
payment is ₹3,500 — which is LESS than the monthly interest. This means under
minimum-only payments, the balance grows every month. The baseline loop runs
for 480 months accumulating an astronomically compounding balance, producing
a `baselineInterest` figure in the hundreds of crores.

**This fix addresses both the overflow and the display:**

**Step 1 — Detect negative amortization per debt before running baseline:**

```typescript
function isNegativeAmortization(debt: NormalizedDebt): boolean {
  const monthlyInterest = computeMonthlyInterest(debt.balance, debt.annualRate);
  return debt.minimumPayment < monthlyInterest;
}
```

**Step 2 — Handle negative amortization in baseline loop:**

```typescript
function computeMinimumPaymentBaseline(debts: NormalizedDebt[]): {
  baselineInterest: number;
  hasNegativeAmortization: boolean;
  negativeAmortizationDebts: string[];
} {
  const negativeDebts = debts.filter(isNegativeAmortization);

  if (negativeDebts.length > 0) {
    // Cannot compute a meaningful baseline — minimum payments never clear these debts
    // Return a capped sentinel value and flag the condition
    return {
      baselineInterest: -1,  // sentinel: means "infinite / unclearable"
      hasNegativeAmortization: true,
      negativeAmortizationDebts: negativeDebts.map(d => d.name),
    };
  }

  // Normal baseline computation for well-formed minimums
  // ... existing loop logic ...
  return {
    baselineInterest: totalInterestAccumulated,
    hasNegativeAmortization: false,
    negativeAmortizationDebts: [],
  };
}
```

**Step 3 — In `computeAllStrategies`, propagate the flag:**

```typescript
const baselineResult = computeMinimumPaymentBaseline(normalizedDebts);

// For totalInterestSaved in each strategy summary:
const totalInterestSaved = baselineResult.hasNegativeAmortization
  ? null   // null = "incalculable" — display handled separately
  : Math.max(0, baselineResult.baselineInterest - strategy.totalInterestPaid);
```

**Step 4 — In `planAssembler.ts`, handle null interest saved in the PDF/display:**

```typescript
// When assembling summary for display:
summary.totalInterestSaved = computed.totalInterestSaved ?? -1;
// -1 is the sentinel that the PDF renderer and dashboard interpret as special display
```

**Step 5 — In the PDF generator and dashboard, display the sentinel correctly:**

```typescript
// Wherever totalInterestSaved is rendered:
function formatInterestSaved(value: number): string {
  if (value === -1 || value === null) {
    return 'Minimum payments will never clear this debt';
  }
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}
```

**Step 6 — In Claude's narrative prompt, pass the flag:**

```
INTEREST SAVED NOTE:
{if hasNegativeAmortization}
⚠ One or more debts ({negativeAmortizationDebtNames}) have minimum payments
below their monthly interest charge. Under minimum payments alone, these
debts would grow forever and never be cleared. Do not state a specific
"interest saved" figure for the baseline comparison — instead, in insights,
communicate: "Your {debtName} minimum payment of ₹X is less than the
₹Y monthly interest it accrues — this debt is designed to grow under
minimum payments. The {selectedStrategy} plan eliminates it in Month {n}."
{/if}
```

---

## Testing checklist

- [ ] Priya Sharma Balanced schedule contains Month 12 (HDFC CC cleared)
      and Month 17 (Axis Flipkart cleared) — neither may be absent.
- [ ] Priya Sharma Safe schedule contains the equivalent clearance months
      for both cards — the ₹16,940 → ₹28,000 jump must be explained by
      a visible clearance event in the row immediately before it.
- [ ] Priya Sharma Aggressive schedule contains Month 8 (HDFC CC) and
      Month 12 (Axis Flipkart) clearance rows.
- [ ] In any strategy, no sampled schedule may contain a payment amount
      jump of more than 30% between consecutive rows without a
      debtsCleared event on the lower row explaining the cascade.
- [ ] Month 12 Balanced payment breakdown for HDFC CC shows the actual
      closing balance amount — a small residual — not a full ₹4,775.
- [ ] Month 1 Balanced roadmap narrative states ₹21,680 as total payment,
      not ₹28,000.
- [ ] Month 1 Aggressive roadmap narrative states ₹28,000 as total payment.
- [ ] Month 1 Safe roadmap narrative states ₹16,940 as total payment.
- [ ] Interest saved for Priya shows "Minimum payments will never clear
      this debt" — not a crore figure — for all three strategies.
- [ ] The negative amortization warning appears in Claude's narrative
      specifically naming HDFC CC and explaining that its minimum payment
      (₹3,500) is below its monthly interest (₹4,200).
- [ ] For Ashesh's report (no negative amortization), interest saved still
      shows correct rupee figures — this fix must not break the normal case.
- [ ] For Kavitha (no credit cards, low rates), interest saved shows
      normally — `hasNegativeAmortization = false`.
- [ ] `sampleSchedule` never returns more than 20 rows even when mandatory
      clearance months are numerous (e.g. 5 debts = 5 mandatory clearance
      rows + month 1 + final = 7 mandatory, leaving 13 optional slots).