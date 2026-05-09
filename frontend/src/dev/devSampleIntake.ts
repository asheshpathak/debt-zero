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
          enabled: c.key === "child_care" ? false : true,
          amount:
            c.key === "rent" ? 28000 :
            c.key === "food" ? 12000 :
            c.key === "fuel" ? 6000 :
            c.key === "utilities" ? 4500 :
            c.key === "shopping" ? 8000 :
            c.key === "dining_out" ? 9000 :
            c.key === "subscriptions" ? 4200 :
            c.key === "education" ? 6500 :
            c.key === "personal_care" ? 3500 :
            c.key === "healthcare" ? 5500 :
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
        creditCards: [
          {
            id: "demo-cc-1",
            name: "HDFC Regalia Credit Card",
            balance: 485000,
            limit: 600000,
            interestRate: 42,
            minimumPayment: 12000,
          },
          {
            id: "demo-cc-2",
            name: "SBI SimplyCLICK",
            balance: 312000,
            limit: 400000,
            interestRate: 40.2,
            minimumPayment: 7800,
          },
          {
            id: "demo-cc-3",
            name: "Axis Flipkart Credit Card",
            balance: 198000,
            limit: 250000,
            interestRate: 41.5,
            minimumPayment: 5000,
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

