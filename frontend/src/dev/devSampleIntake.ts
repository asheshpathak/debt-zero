import type { FormData } from "@/types";
import { defaultExpenseCategories } from "@/lib/expenses";
import { defaultAssetCategories } from "@/lib/assets";

export type DevSampleKey = "demo";

export function getDevSampleIntake(key: DevSampleKey = "demo"): FormData {
  switch (key) {
    case "demo":
    default:
      return {
        name: "Demo User",
        city: "Mumbai",
        age: 29,
        gender: "male",
        maritalStatus: "single",
        occupation: "Software Engineer",
        monthlyIncome: 180000,
        monthlyExpenses: undefined,
        expenseCategories: defaultExpenseCategories().map((c) => ({
          ...c,
          amount:
            c.key === "rent" ? 13000 :
            c.key === "food" ? 5000 :
            c.key === "fuel" ? 3000 :
            c.key === "utilities" ? 2500 :
            c.key === "shopping" ? 5000 :
            c.key === "personal_care" ? 1500 :
            c.key === "dining_out" ? 2000 :
            c.key === "others" ? 5000 :
            undefined,
        })),
        assetCategories: defaultAssetCategories().map((c) => ({
          ...c,
          enabled: true,
          amount:
            c.key === "cash" ? 20000 :
            c.key === "savings" ? 10000 :
            c.key === "investments" ? 550000 :
            c.key === "gold" ? 22000 :
            0,
        })),
        loans: [
          {
            id: "loan-0",
            name: "Axis Bank Personal Loan",
            balance: 2100000,
            interestRate: 11.5,
            monthlyEmi: 42200,
            remainingTenureMonths: 68,
            type: "personal",
            isCreditCardEmi: false,
            interestFree: false,
          },
          {
            id: "loan-1",
            name: "Family borrowing (BIL)",
            balance: 2000000,
            interestRate: 0,
            monthlyEmi: 0,
            remainingTenureMonths: 0,
            type: "other",
            isCreditCardEmi: false,
            interestFree: true,
          },
          {
            id: "loan-2",
            name: "Family borrowing (ex)",
            balance: 375000,
            interestRate: 0,
            monthlyEmi: 0,
            remainingTenureMonths: 0,
            type: "other",
            isCreditCardEmi: false,
            interestFree: true,
          },
        ],
        creditCards: [],
        strategy: "balanced",
        extraMonthlyBudget: 5000,
        targetMonths: 0,
        creditScoreSkipped: true,
        creditScoreApprox: null,
        creditScoreBureau: "",
      };
  }
}

