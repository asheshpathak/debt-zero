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
        age: 32,
        gender: "male",
        maritalStatus: "single",
        occupation: "Software Engineer",
        monthlyIncome: 120000,
        monthlyExpenses: undefined,
        expenseCategories: defaultExpenseCategories().map((c) => ({
          ...c,
          amount:
            c.key === "rent" ? 28000 :
            c.key === "food" ? 12000 :
            c.key === "fuel" ? 5000 :
            c.key === "utilities" ? 3500 :
            c.key === "healthcare" ? 2500 :
            c.key === "shopping" ? 6000 :
            c.key === "others" ? 3000 :
            undefined,
        })),
        assetCategories: defaultAssetCategories().map((c) => ({
          ...c,
          enabled: true,
          amount:
            c.key === "cash" ? 25000 :
            c.key === "savings" ? 90000 :
            c.key === "investments" ? 180000 :
            c.key === "security_fund" ? 60000 :
            c.key === "gold" ? 75000 :
            0,
        })),
        loans: [
          {
            id: "loan-0",
            name: "Axis Personal Loan",
            balance: 420000,
            interestRate: 14.5,
            monthlyEmi: 12500,
            remainingTenureMonths: 36,
            type: "personal",
            isCreditCardEmi: false,
            interestFree: false,
          },
        ],
        creditCards: [
          {
            id: "card-0",
            name: "HDFC Regalia",
            balance: 85000,
            limit: 300000,
            interestRate: 42,
            minimumPayment: 4250,
          },
        ],
        strategy: "balanced",
        extraMonthlyBudget: 5000,
        targetMonths: 0,
        creditScoreSkipped: true,
        creditScoreApprox: null,
        creditScoreBureau: "",
      };
  }
}

