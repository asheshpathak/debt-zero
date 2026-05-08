# Cursor Prompt — Fix Baseline Interest Calculation for Negative Amortization

## Context

The overflow sentinel fix reduced the crore figure but did not eliminate the
wrong baseline. The `computeMinimumPaymentBaseline` function is still running
its loop on negative amortization debts and producing inflated figures.

For Priya Sharma:
- HDFC CC: ₹1,20,000 at 42% → monthly interest ₹4,200 vs minimum ₹3,500 (deficit ₹700)
- Axis Flipkart: ₹85,000 at 36% → monthly interest ₹2,550 vs minimum ₹2,500 (deficit ₹50)

Both are negative amortization. The tiny ₹50 deficit on Axis Flipkart is
likely slipping through the guard due to a strict `<` comparison or a
floating point rounding issue.

Read `backend/src/services/amortization.ts` fully before changing anything.

---

## Fix — Replace the entire `computeMinimumPaymentBaseline` function

Delete the existing implementation and replace with the following:

```typescript
/**
 * Computes the total interest a user would pay making only minimum payments.
 * 
 * IMPORTANT: If ANY debt has a minimum payment <= its monthly interest charge,
 * that debt will NEVER be cleared under minimum payments (negative amortization).
 * In this case we cannot compute a meaningful baseline and return a sentinel.
 * 
 * The sentinel value of -1 means "minimum payments will never clear all debts".
 * Callers must check for -1 before using the result.
 */
export function computeMinimumPaymentBaseline(
  debts: NormalizedDebt[]
): number {
  // Step 1 — Screen every debt for negative amortization BEFORE running any loop.
  // Use a small epsilon (0.01) to catch floating point near-zero deficits.
  for (const debt of debts) {
    if (debt.isInterestFree) continue; // 0% debts always amortize correctly

    const monthlyInterest = debt.balance * (debt.annualRate / 100 / 12);
    const deficit = debt.minimumPayment - monthlyInterest;

    if (deficit <= 0.01) {
      // Minimum payment does not exceed monthly interest — debt grows forever.
      // Return sentinel immediately without running the loop at all.
      return -1;
    }
  }

  // Step 2 — All debts have positive amortization. Run the baseline loop.
  // Clone balances — do not mutate originals.
  const workingDebts = debts.map(d => ({ ...d, balance: d.balance }));
  let totalInterest = 0;
  let month = 0;
  const MAX_MONTHS = 480;

  while (workingDebts.some(d => d.balance > 0.5) && month < MAX_MONTHS) {
    month++;

    for (const debt of workingDebts) {
      if (debt.balance <= 0) continue;

      // Accrue interest
      const interest = debt.isInterestFree
        ? 0
        : debt.balance * (debt.annualRate / 100 / 12);

      totalInterest += interest;
      debt.balance += interest;

      // Pay minimum (clamped to remaining balance)
      const payment = Math.min(debt.minimumPayment, debt.balance);
      debt.balance -= payment;

      // Zero out floating point dust
      if (debt.balance < 0.5) debt.balance = 0;
    }
  }

  // Step 3 — Sanity cap: baseline interest should never exceed 5x total debt.
  // If it does, something is wrong — return sentinel rather than a corrupt figure.
  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  if (totalInterest > totalDebt * 5) {
    return -1;
  }

  return Math.round(totalInterest);
}
```

---

## Update callers of `computeMinimumPaymentBaseline`

**In `computeAllStrategies`**, update the interest saved calculation:

```typescript
const baselineInterest = computeMinimumPaymentBaseline(normalizedDebts);

// For each strategy's summary:
function computeInterestSaved(
  baselineInterest: number,
  strategyInterestPaid: number
): number {
  if (baselineInterest === -1) {
    // Sentinel — minimum payments never clear the debt
    // Interest saved is "effectively infinite" — display handled by UI
    return -1;
  }
  return Math.max(0, baselineInterest - strategyInterestPaid);
}

// Usage:
safe.summary.totalInterestSaved = computeInterestSaved(
  baselineInterest,
  safe.totalInterestPaid
);
balanced.summary.totalInterestSaved = computeInterestSaved(
  baselineInterest,
  balanced.totalInterestPaid
);
aggressive.summary.totalInterestSaved = computeInterestSaved(
  baselineInterest,
  aggressive.totalInterestPaid
);
```

---

## Update display layer

**In the PDF generator** (`frontend/src/lib/pdfGenerator.ts`),
wherever `totalInterestSaved` is rendered:

```typescript
function displayInterestSaved(value: number): string {
  if (value === -1) {
    return 'Min. payments never clear this debt';
  }
  return `Rs. ${Math.round(value).toLocaleString('en-IN')}`;
}
```

Apply `displayInterestSaved()` to:
- Page 1 summary "TOTAL INTEREST SAVED" field
- Strategy comparison table "Interest Saved" column
- Any narrative reference in the PDF

**In the dashboard** (`frontend/src/pages/Dashboard.tsx`),
apply the same guard to the interest saved stat card.

---

## Update Claude narrative prompt

**In `backend/src/services/claudeNarrative.ts`**,
when building the prompt, detect the sentinel and adjust:

```typescript
const interestSavedDisplay = (value: number, strategyName: string) => {
  if (value === -1) {
    return `Under minimum payments, one or more debts would never be cleared ` +
           `due to negative amortization. The ${strategyName} strategy eliminates ` +
           `all debts by Month ${summary.estimatedPayoffMonths}.`;
  }
  return `saves Rs.${Math.round(value).toLocaleString('en-IN')} vs minimum payments`;
};
```

Pass this string into the prompt instead of the raw number so Claude never
sees the sentinel value `-1` and never tries to format it as a rupee amount.

---

## Testing checklist

- [ ] Priya Sharma: `computeMinimumPaymentBaseline` returns `-1` immediately
      without running the loop — confirm by adding a console.log before
      the return in Step 1 and checking server logs.
- [ ] Priya Sharma PDF page 1: "TOTAL INTEREST SAVED" shows
      "Min. payments never clear this debt" — not a rupee figure.
- [ ] Priya Sharma strategy comparison table: "Interest Saved" column
      shows the sentinel message for all three strategies.
- [ ] Priya Sharma insights: Claude's narrative mentions that HDFC CC
      and Axis Flipkart have minimum payments below their monthly interest,
      naming both debts and their specific deficit amounts.
- [ ] Ashesh Pathak (no negative amortization): baseline loop runs normally,
      interest saved shows correct rupee figures — this fix must not
      affect users with well-formed minimums.
- [ ] Kavitha Nair (no credit cards): baseline returns a normal figure,
      no sentinel triggered.
- [ ] Mohammed Irfan (negative surplus): baseline still returns -1 if
      any debt has negative amortization, independent of the surplus issue.
- [ ] Sanity cap check: create a test case where a 0.1% APR loan with
      a ₹10,000 minimum on a ₹50,000 balance runs the baseline loop —
      confirm it does NOT return -1 (positive amortization, normal case).
- [ ] Epsilon check: create a test case where minimum payment is exactly
      equal to monthly interest (deficit = 0) — confirm it returns -1
      (balance would never reduce, just float at breakeven indefinitely).