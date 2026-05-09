import type { ExpenseCategoryKey } from "../types";

/** Human-readable names for expense keys (intake Step 3, Claude prompt, PDFs). */
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
