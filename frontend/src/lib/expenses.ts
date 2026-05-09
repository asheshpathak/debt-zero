import type { ExpenseCategory, ExpenseCategoryKey } from "@/types";

/** Single source of truth for intake Step 3 + dashboard + PDF category names. */
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategoryKey, string> = {
  rent: "Rent / EMI (housing)",
  food: "Food & groceries",
  fuel: "Fuel / transport",
  utilities: "Utilities (power, water, broadband)",
  shopping: "Shopping & discretionary",
  dining_out: "Dining out & takeaway",
  subscriptions: "Subscriptions (OTT, apps, gym)",
  education: "Education & tuition",
  personal_care: "Personal care & grooming",
  healthcare: "Healthcare",
  child_care: "Child care & schooling",
  others: "Everything else",
};

export function expenseCategoryLabel(key: string): string {
  return EXPENSE_CATEGORY_LABELS[key as ExpenseCategoryKey] ?? key.replace(/_/g, " ");
}

export function sumEnabledExpenses(categories: ExpenseCategory[] | undefined): number {
  if (!categories?.length) return 0;
  return categories
    .filter((c) => c.enabled)
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);
}

export function defaultExpenseCategories(): ExpenseCategory[] {
  return [
    { key: "rent", enabled: true },
    { key: "food", enabled: true },
    { key: "fuel", enabled: true },
    { key: "utilities", enabled: true },
    { key: "shopping", enabled: true },
    { key: "dining_out", enabled: false },
    { key: "subscriptions", enabled: false },
    { key: "education", enabled: false },
    { key: "personal_care", enabled: false },
    { key: "healthcare", enabled: true },
    { key: "child_care", enabled: false },
    { key: "others", enabled: true },
  ];
}
