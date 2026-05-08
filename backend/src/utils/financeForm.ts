import type { FormData, PayoffStrategy } from "../types";

/** Sum enabled expense categories when present (falls back to flat monthlyExpenses). */
export function resolvedMonthlyLivingCosts(formData: FormData): number {
  if (Array.isArray(formData.expenseCategories) && formData.expenseCategories.length > 0) {
    return formData.expenseCategories
      .filter((c) => c.enabled)
      .reduce((s, c) => s + (Number(c.amount) || 0), 0);
  }
  return Number(formData.monthlyExpenses) || 0;
}

export function formDataForStrategy(formData: FormData, strategy: PayoffStrategy): FormData {
  return {
    ...formData,
    monthlyExpenses: resolvedMonthlyLivingCosts(formData),
    strategy,
  };
}
