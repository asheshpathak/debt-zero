export type PayoffStrategy = "safe" | "balanced" | "aggressive";

export type CreditScoreBureau = "cibil" | "experian" | "crif" | "unsure";

export type MaritalStatus = "single" | "married" | "divorced" | "widowed" | "separated";

export type ExpenseCategoryKey =
  | "rent"
  | "food"
  | "fuel"
  | "utilities"
  | "shopping"
  | "healthcare"
  | "subscriptions"
  | "dining_out"
  | "education"
  | "personal_care"
  | "child_care"
  | "others";

export interface ExpenseCategory {
  key: ExpenseCategoryKey;
  enabled: boolean;
  amount?: number;
}

export type AssetCategoryKey =
  | "cash"
  | "savings"
  | "investments"
  | "security_fund"
  | "property"
  | "gold"
  | "others";

export interface AssetCategory {
  key: AssetCategoryKey;
  enabled: boolean;
  amount?: number;
}

export interface LoanEntry {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  monthlyEmi: number;
  remainingTenureMonths: number;
  type: "personal" | "home" | "car" | "education" | "credit_card_emi" | "other";
  isCreditCardEmi: boolean;
  interestFree: boolean;
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
  city: string;
  age: number;
  gender: string;
  maritalStatus?: MaritalStatus | "";
  occupation: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  expenseCategories: ExpenseCategory[];
  assetCategories: AssetCategory[];
  loans: LoanEntry[];
  creditCards: CreditCardEntry[];
  strategy: PayoffStrategy;
  extraMonthlyBudget: number;
  targetMonths: number;
  creditScoreSkipped: boolean;
  creditScoreApprox?: number | null;
  creditScoreBureau?: CreditScoreBureau | "";
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

export interface SpendsOverviewItem {
  category: string;
  amount: number;
  status: "on_track" | "cut_down";
  suggestion: string;
}

export interface PlanSummary {
  totalDebt: number;
  monthlyIncome: number;
  /** Always stored as decimal (0.26 = 26% DTI). Never > 1. */
  debtToIncomeRatio: number;
  estimatedPayoffMonths: number;
  estimatedPayoffDate: string;
  totalInterestSaved: number;
  /** Total interest paid under this strategy (used for strategy comparison). */
  totalInterestPaid: number;
  strategy: string;
  /** Monthly repayment commitment for this strategy (may differ for Aggressive). */
  monthlyBudget?: number;
}

export interface PlanStrategySlice {
  summary: PlanSummary;
  monthlySchedule: MonthlyPayment[];
  debtOrder: DebtOrderItem[];
}

export interface PlanDataShared {
  insights: string[];
  quickWins: string[];
  warnings: string[];
  spendsOverview?: SpendsOverviewItem[];
}

export const PLAN_DATA_VERSION = 2 as const;

export interface PlanDataV2 {
  version: typeof PLAN_DATA_VERSION;
  defaultStrategy: PayoffStrategy;
  shared: PlanDataShared;
  strategies: Partial<Record<PayoffStrategy, PlanStrategySlice>>;
}

export interface PlanDataLegacy {
  summary: PlanSummary;
  monthlySchedule: MonthlyPayment[];
  debtOrder: DebtOrderItem[];
  insights: string[];
  quickWins: string[];
  warnings: string[];
}

export type StoredPlanData = PlanDataV2 | PlanDataLegacy;
