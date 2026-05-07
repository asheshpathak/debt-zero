export interface LoanEntry {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  monthlyEmi: number;
  type: "personal" | "home" | "car" | "education" | "other";
}

export interface CreditCardEntry {
  id: string;
  name: string;
  balance: number;
  limit: number;
  interestRate: number;
  minimumPayment: number;
}

export interface FormData {
  // Step 1 - Income & Expenses
  monthlyIncome: number;
  monthlyExpenses: number;
  name: string;
  // Step 2 - Loans
  loans: LoanEntry[];
  // Step 3 - Credit Cards
  creditCards: CreditCardEntry[];
  // Step 4 - Goals
  strategy: "avalanche" | "snowball";
  extraMonthlyBudget: number;
  targetMonths: number;
}

export interface DebtPlan {
  id: string;
  submissionId: string;
  paid: boolean;
  planData: {
    summary: {
      totalDebt: number;
      monthlyIncome: number;
      debtToIncomeRatio: number;
      estimatedPayoffMonths: number;
      estimatedPayoffDate: string;
      totalInterestSaved: number;
      strategy: string;
    };
    monthlySchedule: MonthlyPayment[];
    debtOrder: DebtOrderItem[];
    insights: string[];
    quickWins: string[];
    warnings: string[];
  };
}

export interface MonthlyPayment {
  month: number;
  date: string;
  totalPayment: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
  debtsCleared: string[];
}

export interface DebtOrderItem {
  name: string;
  type: string;
  balance: number;
  interestRate: number;
  payoffMonth: number;
  totalInterestPaid: number;
  priority: number;
}
