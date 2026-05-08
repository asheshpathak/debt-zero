export type CreditScoreBureau = "cibil" | "experian" | "crif" | "unsure";

export type PayoffStrategy = "safe" | "balanced" | "aggressive";

export const PAYOFF_STRATEGY_OPTIONS: {
  value: PayoffStrategy;
  label: string;
  short: string;
}[] = [
  {
    value: "safe",
    label: "Safe",
    short: "Prioritizes building a Security Fund and handling low liquid funds before aggressive debt payments.",
  },
  {
    value: "balanced",
    label: "Balanced",
    short: "A hybrid approach balancing interest savings and emergency fund creation.",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    short: "Focuses all available cash flow on eliminating highest interest debts immediately.",
  },
];

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
  /** Empty until the user enters a value */
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
  /** Approximate current value (₹) — user estimates */
  amount?: number;
}

export interface LoanEntry {
  id: string;
  name: string;
  balance?: number;
  interestRate?: number;
  monthlyEmi?: number;
  /** Optional; omit when unknown */
  remainingTenureMonths?: number;
  type: "personal" | "home" | "car" | "education" | "credit_card_emi" | "other";
  isCreditCardEmi: boolean;
  interestFree: boolean;
}

export interface CreditCardEntry {
  id: string;
  name: string;
  balance?: number;
  limit?: number;
  interestRate?: number;
  minimumPayment?: number;
}

export interface FormData {
  name: string;
  city: string;
  age: number;
  gender: string;
  maritalStatus: MaritalStatus | "";
  occupation: string;
  monthlyIncome?: number;
  /** Kept in sync from expense categories for prompts and legacy fields */
  monthlyExpenses?: number;
  expenseCategories: ExpenseCategory[];
  assetCategories: AssetCategory[];
  loans: LoanEntry[];
  creditCards: CreditCardEntry[];
  /** Default for first generation; user can switch on the dashboard after unlock */
  strategy: PayoffStrategy;
  extraMonthlyBudget?: number;
  targetMonths?: number;
  /** If true, we do not collect or validate score fields */
  creditScoreSkipped: boolean;
  /** Approximate bureau score — only meaningful when creditScoreSkipped is false */
  creditScoreApprox?: number | null;
  /** Which bureau the number came from — optional ("unsure" allowed) */
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
  roadmapAction?: string;
  paymentBreakdown?: { name: string; amount: number }[];
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

export interface PlanSummary {
  totalDebt: number;
  monthlyIncome: number;
  debtToIncomeRatio: number;
  estimatedPayoffMonths: number;
  estimatedPayoffDate: string;
  totalInterestSaved: number;
  totalInterestPaid: number;
  baselineIsInfinite: boolean;
  strategy: string;
  /** Monthly repayment commitment for this strategy (may differ for Aggressive). */
  monthlyBudget?: number;
}

export interface PlanStrategySlice {
  summary: PlanSummary;
  monthlySchedule: MonthlyPayment[];
  debtOrder: DebtOrderItem[];
}

export interface SpendsOverviewItem {
  category: string;
  amount: number;
  suggestion: string;
  status: "on_track" | "cut_down";
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

/** Display-only fields from intake (loaded with GET /plan/:id). */
export interface PlanProfile {
  name: string;
  city: string;
  occupation: string;
}

export interface DebtPlan {
  id: string;
  submissionId: string;
  paid: boolean;
  planData: StoredPlanData | null;
  profile?: PlanProfile | null;
  formData?: FormData | null;
}
