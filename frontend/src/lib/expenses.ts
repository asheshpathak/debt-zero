import type { ExpenseCategory } from "@/types";

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
