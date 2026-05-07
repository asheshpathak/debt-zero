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
  name: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  loans: LoanEntry[];
  creditCards: CreditCardEntry[];
  strategy: "avalanche" | "snowball";
  extraMonthlyBudget: number;
  targetMonths: number;
}
