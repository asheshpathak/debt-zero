/**
 * Batch-export Debt Zero PDF reports (same layout as dashboard `generateFinancialReport`).
 *
 * Run from the backend folder (loads ./.env):
 *   npx tsx scripts/batch-export-report-pdfs.ts --out ./batch-pdf-out profiles/*.json
 *   npx tsx scripts/batch-export-report-pdfs.ts --out ./out ./fixtures/   # all *.json in dir
 *   npx tsx scripts/batch-export-report-pdfs.ts --force-rebuild -o ./out ./batch-profiles/*.json
 *
 * Env: ANTHROPIC_API_KEY (required to build from formData or with --force-rebuild; not needed when
 *      rendering embedded planData only, without recomputing.)
 *
 * Pipeline: imports production code from ../src (computeAllStrategies, generateNarrative,
 * assemblePlanData, expandCompactPlan) -- same as post-unlock generation in the API.
 * Debt priority row #1 is the highest-rate debt (surplus target); rows #2+ follow payoff month
 * from computeAllStrategies. Rebuild PDFs after backend amortization changes.
 *
 * ---------------------------------------------------------------------------
 * JSON structure (each file is one person)
 * ---------------------------------------------------------------------------
 *
 * Option A -- Intake only (script runs amortization + Claude narrative + PDF; no DB, no auth):
 *
 * {
 *   "strategy": "balanced",
 *   "profile": {
 *     "name": "Rohan Mehta",
 *     "city": "Mumbai",
 *     "occupation": "Software engineer"
 *   },
 *   "formData": {
 *     "name": "Rohan Mehta",
 *     "city": "Mumbai",
 *     "age": 34,
 *     "gender": "male",
 *     "maritalStatus": "single",
 *     "occupation": "Software engineer",
 *     "monthlyIncome": 120000,
 *     "expenseCategories": [ { "key": "rent", "enabled": true, "amount": 28000 }, ... ],
 *     "assetCategories": [ { "key": "cash", "enabled": true, "amount": 50000 }, ... ],
 *     "loans": [
 *       {
 *         "id": "loan-1",
 *         "name": "Personal loan",
 *         "balance": 420000,
 *         "interestRate": 14.5,
 *         "monthlyEmi": 12500,
 *         "remainingTenureMonths": 36,
 *         "type": "personal",
 *         "isCreditCardEmi": false,
 *         "interestFree": false
 *       }
 *     ],
 *     "creditCards": [
 *       {
 *         "id": "card-1",
 *         "name": "HDFC Regalia",
 *         "balance": 85000,
 *         "limit": 300000,
 *         "interestRate": 42,
 *         "minimumPayment": 4250
 *       }
 *     ],
 *     "strategy": "balanced",
 *     "extraMonthlyBudget": 5000,
 *     "targetMonths": 0,
 *     "creditScoreSkipped": true
 *   }
 * }
 *
 * - `strategy` on the wrapper sets defaultStrategy / Claude narrative target (roadmap text).
 *   The PDF lists all three strategies (comparison + per-strategy sections). Defaults to formData.strategy or "balanced".
 * - `profile` is optional if formData has name/city/occupation (derived for the cover).
 * - Omit loan/card `id` strings if you like; the script fills `loan-0`, `card-0`, etc.
 *
 * Option B -- Pre-generated plan (no API call; use an exported planData object, compact or expanded):
 *
 * {
 *   "strategy": "balanced",
 *   "profile": { "name": "...", "city": "...", "occupation": "..." },
 *   "formData": { ... same fields as app ... },
 *   "planData": { "version": 2, "defaultStrategy": "balanced", "shared": {...}, "strategies": {...} }
 * }
 *
 * Option C -- Shorthand: the entire JSON file may be the form object at the root (no wrapper).
 * In that case `strategy` defaults to formData.strategy or "balanced".
 *
 * Flags:  --force-rebuild | -F   Ignore embedded planData; rebuild from formData (needs API key).
 *
 * ---------------------------------------------------------------------------
 */

import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import jsPDF from "jspdf";
import type {
  FormData,
  PlanDataV2,
  PlanDataShared,
  PayoffStrategy,
  LoanEntry,
  CreditCardEntry,
  DebtOrderItem,
  SpendsOverviewItem,
} from "../src/types";
import { computeAllStrategies } from "../src/services/amortization";
import { generateNarrative } from "../src/services/claudeNarrative";
import { assemblePlanData } from "../src/services/planAssembler";
import { expandCompactPlan } from "../src/services/claude";
import { formDataForStrategy } from "../src/utils/financeForm";
import { expenseCategoryLabel } from "../src/utils/expenseCategoryLabels";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const STRATEGIES: PayoffStrategy[] = ["safe", "balanced", "aggressive"];

const PDF_STRATEGY_ORDER: PayoffStrategy[] = ["safe", "balanced", "aggressive"];
const PDF_STRATEGY_LABELS: Record<PayoffStrategy, string> = {
  safe: "Safe",
  balanced: "Balanced",
  aggressive: "Aggressive",
};

function pickReferenceSummary(v2: PlanDataV2, uiStrategy: PayoffStrategy) {
  const keys: PayoffStrategy[] = [
    uiStrategy,
    v2.defaultStrategy,
    "balanced",
    "safe",
    "aggressive",
  ];
  const tried = new Set<PayoffStrategy>();
  for (const k of keys) {
    if (tried.has(k)) continue;
    tried.add(k);
    const s = v2.strategies[k]?.summary;
    if (s) return s;
  }
  return undefined;
}

// --- Defaults (match frontend CreatePlan / lib/expenses / lib/assets) ---

function defaultExpenseCategories(): FormData["expenseCategories"] {
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

function defaultAssetCategories(): FormData["assetCategories"] {
  return [
    { key: "cash", enabled: true },
    { key: "savings", enabled: true },
    { key: "investments", enabled: true },
    { key: "security_fund", enabled: true },
    { key: "property", enabled: true },
    { key: "gold", enabled: true },
    { key: "others", enabled: true },
  ];
}

function sumEnabledExpenses(categories: FormData["expenseCategories"] | undefined): number {
  if (!categories?.length) return 0;
  return categories.filter((c) => c.enabled).reduce((s, c) => s + (Number(c.amount) || 0), 0);
}

function normalizeLoan(l: Record<string, unknown>, i: number): LoanEntry {
  return {
    id: typeof l.id === "string" ? l.id : `loan-${i}`,
    name: String(l.name ?? "").trim(),
    balance: Number(l.balance) || 0,
    interestRate: l.interestFree ? 0 : Number(l.interestRate) || 0,
    monthlyEmi: Number(l.monthlyEmi) || 0,
    remainingTenureMonths:
      l.remainingTenureMonths === undefined || l.remainingTenureMonths === null
        ? 0
        : Math.max(0, Number(l.remainingTenureMonths)),
    type: (l.type as LoanEntry["type"]) || "personal",
    isCreditCardEmi: Boolean(l.isCreditCardEmi),
    interestFree: Boolean(l.interestFree),
  };
}

function normalizeCard(c: Record<string, unknown>, i: number): CreditCardEntry {
  return {
    id: typeof c.id === "string" ? c.id : `card-${i}`,
    name: String(c.name ?? "").trim(),
    balance: Number(c.balance) || 0,
    limit: Number(c.limit) || 0,
    interestRate: Number(c.interestRate) || 0,
    minimumPayment: Number(c.minimumPayment) || 0,
  };
}

/** Same normalization as POST /plan/submit body handling in routes/plan.ts */
function normalizeFormPayload(raw: Record<string, unknown>): FormData {
  const creditSkipped = raw.creditScoreSkipped !== false;
  const loans = Array.isArray(raw.loans)
    ? (raw.loans as Record<string, unknown>[]).map((l, i) => normalizeLoan(l, i))
    : [];
  const creditCards = Array.isArray(raw.creditCards)
    ? (raw.creditCards as Record<string, unknown>[]).map((c, i) => normalizeCard(c, i))
    : [];
  let strategy = (raw.strategy as PayoffStrategy) || "balanced";
  if (!STRATEGIES.includes(strategy)) strategy = "balanced";

  let expenseCategories =
    Array.isArray(raw.expenseCategories) && raw.expenseCategories.length > 0
      ? (raw.expenseCategories as FormData["expenseCategories"])
      : defaultExpenseCategories();

  expenseCategories = expenseCategories.map((row) => ({ ...row, amount: row.amount !== undefined ? Number(row.amount) : row.amount }));

  let assetCategories = Array.isArray(raw.assetCategories) ? [...(raw.assetCategories as FormData["assetCategories"])] : defaultAssetCategories();
  if (!Array.isArray(raw.assetCategories) || raw.assetCategories.length === 0) {
    assetCategories = defaultAssetCategories();
  }
  assetCategories = assetCategories.map((c) => ({
    ...c,
    amount: c.amount !== undefined ? Math.max(0, Number(c.amount)) : c.amount,
  }));

  const base: FormData = {
    name: String(raw.name ?? "").trim(),
    city: String(raw.city ?? "").trim(),
    age: Number(raw.age) || 18,
    gender: String(raw.gender ?? ""),
    maritalStatus: (raw.maritalStatus as FormData["maritalStatus"]) ?? "",
    occupation: String(raw.occupation ?? "").trim(),
    monthlyIncome: Number(raw.monthlyIncome) || 0,
    monthlyExpenses: sumEnabledExpenses(expenseCategories),
    expenseCategories,
    assetCategories,
    loans,
    creditCards,
    strategy,
    extraMonthlyBudget: Math.max(0, Number(raw.extraMonthlyBudget) || 0),
    targetMonths: Math.max(0, Number(raw.targetMonths) || 0),
    creditScoreSkipped: creditSkipped,
    creditScoreApprox: creditSkipped ? null : (raw.creditScoreApprox ?? null) as number | null,
    creditScoreBureau: creditSkipped ? "" : String(raw.creditScoreBureau ?? ""),
  };

  return formDataForStrategy(base, strategy);
}

function validateFormData(fd: FormData): string | null {
  if (!fd.name.trim()) return "Name is required.";
  if (!fd.city.trim()) return "City is required.";
  if (!fd.age || fd.age < 18) return "Valid age is required.";
  if (!fd.gender) return "Gender is required.";
  if (!fd.occupation.trim()) return "Occupation is required.";
  const income = Number(fd.monthlyIncome);
  if (!Number.isFinite(income) || income < 1000) return "Valid monthly income is required.";
  const hasLoan = (fd.loans?.length ?? 0) > 0;
  const hasCard = (fd.creditCards?.length ?? 0) > 0;
  if (!hasLoan && !hasCard) return "Add at least one loan or credit card.";
  for (const l of fd.loans ?? []) {
    const bal = Number(l.balance);
    if (!Number.isFinite(bal) || bal < 1) return "Each loan needs a valid outstanding balance greater than zero.";
    const emiRaw = Number(l.monthlyEmi);
    if (l.interestFree) {
      const emi = !Number.isFinite(emiRaw) ? 0 : emiRaw;
      if (emi < 0) {
        return "Interest-free / informal loans need a valid monthly payment (0 is allowed if there is no fixed EMI yet).";
      }
    } else if (!Number.isFinite(emiRaw) || emiRaw < 1) {
      return "Each loan needs a valid monthly EMI greater than zero.";
    }
    const rate = Number(l.interestRate);
    if (l.interestFree) {
      if (rate !== 0) return "Interest-free loans must have 0% rate.";
    } else if (!Number.isFinite(rate) || rate < 0.1) {
      return "Each loan needs a valid interest rate or mark it interest-free.";
    }
    if (l.remainingTenureMonths !== undefined && l.remainingTenureMonths !== null) {
      const ten = Number(l.remainingTenureMonths);
      if (!Number.isFinite(ten) || ten < 0) return "Remaining tenure cannot be negative.";
    }
  }
  for (const c of fd.creditCards ?? []) {
    const bal = Number(c.balance);
    if (!Number.isFinite(bal) || bal < 1) return "Each card needs a valid balance greater than zero.";
    const rate = Number(c.interestRate);
    if (!Number.isFinite(rate) || rate < 0.1) return "Each card needs a valid interest rate.";
    const minp = Number(c.minimumPayment);
    if (!Number.isFinite(minp) || minp < 1) return "Each card needs a minimum payment greater than zero.";
  }
  const extra = Number(fd.extraMonthlyBudget);
  if (fd.extraMonthlyBudget !== undefined && fd.extraMonthlyBudget !== null && (!Number.isFinite(extra) || extra < 0)) {
    return "Extra monthly budget cannot be negative.";
  }
  const tm = Number(fd.targetMonths);
  if (fd.targetMonths !== undefined && fd.targetMonths !== null && (!Number.isFinite(tm) || tm < 0)) {
    return "Target months cannot be negative.";
  }
  return null;
}

interface LooseInputFile {
  strategy?: PayoffStrategy;
  profile?: { name?: string; city?: string; occupation?: string };
  formData?: Record<string, unknown>;
  planData?: unknown;
}

function unwrapInputFile(raw: unknown): LooseInputFile {
  if (!raw || typeof raw !== "object") throw new Error("Invalid JSON root (expected object).");
  const o = raw as Record<string, unknown>;
  const hasShell = Boolean(o.formData || o.planData || o.profile);
  if (!hasShell && (typeof o.name === "string" || o.monthlyIncome !== undefined || Array.isArray(o.loans))) {
    return { formData: o, strategy: o.strategy as PayoffStrategy | undefined };
  }
  return o as LooseInputFile;
}

function profileFromStores(
  file: LooseInputFile,
  formData: FormData | null
): { name: string; city: string; occupation: string } {
  const pf = file.profile;
  const name =
    (typeof pf?.name === "string" && pf.name.trim()) ||
    formData?.name?.trim() ||
    "Client";
  const city = (typeof pf?.city === "string" && pf.city.trim()) || formData?.city?.trim() || "";
  const occupation =
    (typeof pf?.occupation === "string" && pf.occupation.trim()) || formData?.occupation?.trim() || "";
  return { name, city, occupation };
}

async function buildPlanDataV2(
  formData: FormData,
  emphasis: PayoffStrategy
): Promise<PlanDataV2> {
  const computed = computeAllStrategies(formData);
  const narrative = await generateNarrative(formData, computed, emphasis);
  const assembled = assemblePlanData(computed, narrative, emphasis);
  return expandCompactPlan(assembled) as PlanDataV2;
}

interface DebtPlanForPdf {
  profile?: { name: string; city: string; occupation: string };
  formData?: FormData | null;
  planData: PlanDataV2;
}

type MonthlyPaymentPdf = {
  month: number;
  date: string;
  totalPayment: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
  debtsCleared: string[];
  roadmapAction?: string;
  paymentBreakdown?: { name: string; amount: number }[];
};

// --- PDF layout (mirror frontend/src/lib/pdfGenerator.ts; Node writes buffer) ---

function sanitize(text: string): string {
  return text
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, " - ")
    .replace(/\u2026/g, "...")
    .replace(/\u20B9/g, "Rs.")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x00-\x7F]/g, "");
}

function inr(n: number): string {
  return "Rs. " + Math.round(n).toLocaleString("en-IN");
}

function displayInterestSaved(n: number): string {
  if (n === -1) return "Min. payments never clear this debt";
  return inr(n);
}

function pct(n: number): string {
  const v = n < 2 ? n * 100 : n;
  return v.toFixed(1) + "%";
}

const C = {
  brand: [40, 42, 80] as [number, number, number],
  accent: [79, 70, 229] as [number, number, number],
  green: [16, 163, 127] as [number, number, number],
  red: [220, 53, 69] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
  text: [30, 30, 40] as [number, number, number],
  muted: [110, 115, 140] as [number, number, number],
  bg: [248, 249, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  tableBg: [243, 244, 248] as [number, number, number],
  line: [210, 215, 225] as [number, number, number],
};

class ReportBuilder {
  pdf: jsPDF;
  y = 0;
  pageNum = 0;
  readonly W = 210;
  readonly H = 297;
  readonly ML = 22;
  readonly MR = 22;
  readonly MT = 20;
  readonly MB = 30;
  readonly CW: number;

  constructor() {
    this.pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    this.CW = this.W - this.ML - this.MR;
    this.y = this.MT;
    this.pageNum = 1;
  }

  needSpace(mm: number) {
    if (this.y + mm > this.H - this.MB) {
      this.newPage();
    }
  }

  newPage() {
    this.pdf.addPage();
    this.pageNum++;
    this.y = this.MT;
    this.drawPageNumber();
  }

  drawPageNumber() {
    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(...C.muted);
    this.pdf.text(`Page ${this.pageNum}`, this.W - this.MR, this.H - 10, { align: "right" });
    this.pdf.text("Debt Zero Financial Diagnostic", this.ML, this.H - 10);
  }

  heading(text: string, color: [number, number, number] = C.brand) {
    this.needSpace(14);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(...color);
    this.pdf.text(sanitize(text), this.ML, this.y);
    this.y += 3;
    this.pdf.setDrawColor(...color);
    this.pdf.setLineWidth(0.6);
    this.pdf.line(this.ML, this.y, this.ML + this.CW, this.y);
    this.y += 7;
  }

  subheading(text: string, color: [number, number, number] = C.accent) {
    this.needSpace(10);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.setFontSize(10.5);
    this.pdf.setTextColor(...color);
    this.pdf.text(sanitize(text), this.ML, this.y);
    this.y += 6;
  }

  bodyText(text: string, indent = 0) {
    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(...C.text);
    const clean = sanitize(text);
    const maxW = this.CW - indent - 5;
    const lines: string[] = this.pdf.splitTextToSize(clean, maxW);
    const lineH = 4.2;
    this.needSpace(lines.length * lineH + 2);
    this.pdf.text(lines, this.ML + indent, this.y);
    this.y += lines.length * lineH + 2;
  }

  bulletList(items: string[], color: [number, number, number] = C.text) {
    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFontSize(9);
    const lineH = 4.2;
    const bulletIndent = 7;
    for (const item of items) {
      const clean = sanitize(item);
      const maxW = this.CW - bulletIndent - 5;
      const lines: string[] = this.pdf.splitTextToSize(clean, maxW);
      this.needSpace(lines.length * lineH + 3);
      this.pdf.setFillColor(...color);
      this.pdf.circle(this.ML + 2.5, this.y - 1.2, 0.8, "F");
      this.pdf.setTextColor(...C.text);
      this.pdf.text(lines, this.ML + bulletIndent, this.y);
      this.y += lines.length * lineH + 2;
    }
    this.y += 2;
  }

  spacer(mm = 6) {
    this.y += mm;
  }

  divider() {
    this.needSpace(6);
    this.pdf.setDrawColor(...C.line);
    this.pdf.setLineWidth(0.3);
    this.pdf.line(this.ML, this.y, this.ML + this.CW, this.y);
    this.y += 5;
  }

  statRow(label: string, val: string) {
    this.needSpace(7);
    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(...C.muted);
    this.pdf.text(label, this.ML, this.y);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(...C.text);
    this.pdf.text(val, this.ML + 55, this.y);
    this.y += 6;
  }

  table(
    headers: string[],
    rows: string[][],
    colWidths: number[],
    options?: {
      highlightCol?: number;
      redCol?: number;
      boldCol?: number;
    }
  ) {
    const minRowH = 6.5;
    const lineH = 3.85;
    const headerH = 7;
    const cellPadX = 2;

    const drawHeaders = () => {
      this.needSpace(headerH + 2);
      this.pdf.setFillColor(...C.brand);
      this.pdf.rect(this.ML, this.y - 4.5, this.CW, headerH, "F");
      this.pdf.setFont("helvetica", "bold");
      this.pdf.setFontSize(8);
      this.pdf.setTextColor(...C.white);
      let x = this.ML + cellPadX;
      for (let i = 0; i < headers.length; i++) {
        this.pdf.text(headers[i], x, this.y);
        x += colWidths[i];
      }
      this.y += headerH - 1;
    };

    drawHeaders();

    for (let r = 0; r < rows.length; r++) {
      this.pdf.setFontSize(8.5);
      const cellLines: string[][] = [];
      let maxLines = 1;
      for (let c = 0; c < rows[r].length; c++) {
        if (c === options?.boldCol) {
          this.pdf.setFont("helvetica", "bold");
        } else {
          this.pdf.setFont("helvetica", "normal");
        }
        const w = Math.max(8, colWidths[c] - cellPadX * 2);
        const lines = this.pdf.splitTextToSize(sanitize(rows[r][c]), w);
        cellLines.push(lines);
        maxLines = Math.max(maxLines, lines.length);
      }
      const rowH = Math.max(minRowH, maxLines * lineH + 3);

      if (this.y - 4 + rowH > this.H - this.MB) {
        this.newPage();
        drawHeaders();
      }

      const rowTop = this.y - 4;
      if (r % 2 === 0) {
        this.pdf.setFillColor(...C.tableBg);
        this.pdf.rect(this.ML, rowTop, this.CW, rowH, "F");
      }

      let x = this.ML + cellPadX;
      for (let c = 0; c < rows[r].length; c++) {
        if (c === options?.highlightCol) {
          this.pdf.setTextColor(...C.green);
        } else if (c === options?.redCol) {
          this.pdf.setTextColor(...C.red);
        } else {
          this.pdf.setTextColor(...C.text);
        }
        if (c === options?.boldCol) {
          this.pdf.setFont("helvetica", "bold");
        } else {
          this.pdf.setFont("helvetica", "normal");
        }
        this.pdf.setFontSize(8.5);
        const lines = cellLines[c];
        const textBlockH = lines.length * lineH;
        let ty = rowTop + (rowH - textBlockH) / 2 + 3.2;
        for (let li = 0; li < lines.length; li++) {
          this.pdf.text(lines[li], x, ty);
          ty += lineH;
        }
        x += colWidths[c];
      }
      this.y = rowTop + rowH + 2;
    }
    this.y += 4;
  }

  kvGrid(pairs: [string, string][]) {
    const colW = this.CW / 2;
    for (let i = 0; i < pairs.length; i += 2) {
      this.needSpace(12);
      this.pdf.setFont("helvetica", "normal");
      this.pdf.setFontSize(8);
      this.pdf.setTextColor(...C.muted);
      this.pdf.text(sanitize(pairs[i][0]).toUpperCase(), this.ML, this.y);
      this.pdf.setFont("helvetica", "bold");
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(...C.text);
      this.pdf.text(sanitize(pairs[i][1]), this.ML, this.y + 5.5);

      if (i + 1 < pairs.length) {
        this.pdf.setFont("helvetica", "normal");
        this.pdf.setFontSize(8);
        this.pdf.setTextColor(...C.muted);
        this.pdf.text(sanitize(pairs[i + 1][0]).toUpperCase(), this.ML + colW, this.y);
        this.pdf.setFont("helvetica", "bold");
        this.pdf.setFontSize(11);
        this.pdf.setTextColor(...C.text);
        this.pdf.text(sanitize(pairs[i + 1][1]), this.ML + colW, this.y + 5.5);
      }
      this.y += 12;
    }
  }
}

function generateFinancialReportBuffer(plan: DebtPlanForPdf, strategy: PayoffStrategy): Buffer {
  const v2 = plan.planData as PlanDataV2;
  const shared: PlanDataShared = v2.shared;
  const summary = pickReferenceSummary(v2, strategy);
  if (!summary) throw new Error("Plan has no strategy summaries to render.");

  const spends: SpendsOverviewItem[] = shared.spendsOverview ?? [];

  const r = new ReportBuilder();

  r.pdf.setFillColor(...C.brand);
  r.pdf.rect(0, 0, r.W, 44, "F");
  r.pdf.setFillColor(...C.accent);
  r.pdf.rect(0, 44, r.W, 2, "F");

  r.pdf.setFont("helvetica", "bold");
  r.pdf.setFontSize(22);
  r.pdf.setTextColor(...C.white);
  r.pdf.text("Financial Diagnostic Report", r.ML, 18);

  r.pdf.setFont("helvetica", "normal");
  r.pdf.setFontSize(10);
  r.pdf.setTextColor(180, 185, 210);
  r.pdf.text("Debt Zero  |  Personalised Debt Payoff Plan", r.ML, 26);

  r.pdf.setFont("helvetica", "bold");
  r.pdf.setFontSize(10);
  r.pdf.setTextColor(...C.white);
  const name = plan.profile?.name || "Client";
  r.pdf.text(name, r.W - r.MR, 18, { align: "right" });
  r.pdf.setFont("helvetica", "normal");
  r.pdf.setFontSize(9);
  r.pdf.setTextColor(180, 185, 210);
  const meta = [plan.profile?.city, plan.profile?.occupation].filter(Boolean).join("  |  ");
  if (meta) r.pdf.text(meta, r.W - r.MR, 26, { align: "right" });
  r.pdf.text(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }), r.W - r.MR, 34, { align: "right" });

  r.y = 56;

  r.needSpace(26);
  r.pdf.setFillColor(255, 248, 220);
  r.pdf.setDrawColor(...C.amber);
  r.pdf.setLineWidth(0.35);
  r.pdf.roundedRect(r.ML, r.y - 2, r.CW, 22, 1.5, 1.5, "FD");
  r.pdf.setFont("helvetica", "bold");
  r.pdf.setFontSize(9);
  r.pdf.setTextColor(...C.amber);
  r.pdf.text(sanitize("Important: Not SEBI-registered"), r.ML + 3, r.y + 4);
  r.pdf.setFont("helvetica", "normal");
  r.pdf.setFontSize(8);
  r.pdf.setTextColor(...C.text);
  const sebiCover = sanitize(
    "Debt Zero is not registered with SEBI in any capacity (including as an investment adviser or research analyst). " +
      "This document is educational debt-planning output only. It is not investment advice and not a recommendation " +
      "regarding securities. Consult a SEBI-registered professional for regulated investment advice."
  );
  const sebiCoverLines = r.pdf.splitTextToSize(sebiCover, r.CW - 6);
  r.pdf.text(sebiCoverLines, r.ML + 3, r.y + 9);
  r.y += 24 + (sebiCoverLines.length - 1) * 3.2;
  r.spacer(2);

  r.heading("Summary at a Glance");

  r.bodyText(
    "Safe, Balanced, and Aggressive paths are computed from the same profile. " +
      "Shared figures below; the table compares payoff timing and interest across all three.",
    0
  );
  r.spacer(2);

  r.kvGrid([
    ["Total Outstanding Debt", inr(summary.totalDebt)],
    ["Monthly Income", inr(summary.monthlyIncome)],
    ["Debt-to-Income Ratio", pct(summary.debtToIncomeRatio)],
  ]);

  r.spacer(4);

  r.subheading("Strategy comparison", C.brand);
  r.bodyText(
    "Monthly budget, payoff date, and interest differ by strategy. Use the detailed sections " +
      "later in this report for each path.",
    0
  );
  r.spacer(2);

  const compHeaders = ["Strategy", "Monthly Budget", "Payoff Date", "Months", "Total Interest", "Interest Saved"];
  const compCols = [28, 32, 34, 16, 32, r.CW - 28 - 32 - 34 - 16 - 32];
  const compRows: string[][] = [];
  for (const sk of PDF_STRATEGY_ORDER) {
    const sv = v2.strategies[sk];
    if (!sv?.summary) continue;
    compRows.push([
      PDF_STRATEGY_LABELS[sk],
      sv.summary.monthlyBudget != null ? inr(sv.summary.monthlyBudget) : "�",
      sv.summary.estimatedPayoffDate,
      String(sv.summary.estimatedPayoffMonths),
      inr(sv.summary.totalInterestPaid),
      displayInterestSaved(sv.summary.totalInterestSaved),
    ]);
  }
  if (compRows.length > 0) {
    r.table(compHeaders, compRows, compCols, { boldCol: 0 });
  }

  r.spacer(4);

  const fd = plan.formData;
  if (fd) {
    r.heading("Your Financial Profile");

    r.subheading("Personal Information", C.brand);
    r.kvGrid([
      ["Full Name", fd.name || "-"],
      ["City", fd.city || "-"],
      ["Age", fd.age ? String(fd.age) : "-"],
      ["Gender", fd.gender || "-"],
      ["Occupation", fd.occupation || "-"],
    ]);
    r.spacer(2);

    r.subheading("Income & Monthly Expenses", C.brand);
    const incomeExpensePairs: [string, string][] = [
      ["Monthly Income", fd.monthlyIncome ? inr(fd.monthlyIncome) : "-"],
    ];
    if (fd.extraMonthlyBudget) {
      incomeExpensePairs.push(["Extra Budget for Debt", inr(fd.extraMonthlyBudget)]);
    }
    if (fd.targetMonths) {
      incomeExpensePairs.push(["Target Months to Debt-Free", String(fd.targetMonths)]);
    }
    const enabledExpenses = (fd.expenseCategories ?? []).filter((c) => c.enabled && c.amount);
    for (const e of enabledExpenses) {
      const label = e.key.charAt(0).toUpperCase() + e.key.slice(1).replace(/_/g, " ");
      incomeExpensePairs.push([label, inr(e.amount!)]);
    }
    r.kvGrid(incomeExpensePairs);
    r.spacer(2);

    const loans = fd.loans ?? [];
    if (loans.length > 0) {
      r.subheading("Loans & EMI Debt (" + loans.length + ")", C.brand);
      const loanHeaders = ["Loan Name", "Balance", "Rate", "EMI", "Type"];
      const loanCols = [42, 30, 18, 28, r.CW - 42 - 30 - 18 - 28];
      const loanRows = loans.map((l: LoanEntry) => [
        l.name || "-",
        l.balance ? inr(l.balance) : "-",
        l.interestRate ? String(l.interestRate) + "%" : "-",
        l.monthlyEmi ? inr(l.monthlyEmi) : "-",
        l.type ? String(l.type).replace(/_/g, " ") : "-",
      ]);
      r.table(loanHeaders, loanRows, loanCols, { boldCol: 0 });
    }

    const cards = fd.creditCards ?? [];
    if (cards.length > 0) {
      r.subheading("Credit Cards (" + cards.length + ")", C.brand);
      const cardHeaders = ["Card Name", "Outstanding", "Limit", "Rate", "Min. Payment"];
      const cardCols = [40, 28, 28, 18, r.CW - 40 - 28 - 28 - 18];
      const cardRows = cards.map((c: CreditCardEntry) => [
        c.name || "-",
        c.balance ? inr(c.balance) : "-",
        c.limit ? inr(c.limit) : "-",
        c.interestRate ? String(c.interestRate) + "%" : "-",
        c.minimumPayment ? inr(c.minimumPayment) : "-",
      ]);
      r.table(cardHeaders, cardRows, cardCols, { boldCol: 0 });
    }

    const enabledAssets = (fd.assetCategories ?? []).filter((a) => a.enabled && a.amount);
    if (enabledAssets.length > 0) {
      r.subheading("Assets & Reserves", C.brand);
      const assetHeaders = ["Asset Type", "Approximate Value"];
      const assetCols = [r.CW / 2, r.CW / 2];
      const assetRows = enabledAssets.map((a) => [
        a.key.charAt(0).toUpperCase() + a.key.slice(1).replace(/_/g, " "),
        inr(a.amount!),
      ]);
      r.table(assetHeaders, assetRows, assetCols);
    }

    r.spacer(4);
  }

  if (shared.warnings && shared.warnings.length > 0) {
    r.heading("Warnings & Risk Flags", C.red);
    r.bulletList(shared.warnings, C.red);
  }

  if (shared.insights && shared.insights.length > 0) {
    r.heading("Key Insights");
    r.bulletList(shared.insights, C.accent);
  }

  if (shared.quickWins && shared.quickWins.length > 0) {
    r.heading("Recommended Actions (Quick Wins)", C.green);
    r.bulletList(shared.quickWins, C.green);
  }

  if (spends.length > 0) {
    r.heading("Spending Overview");
    const spendHeaders = ["Category", "Amount", "Status", "Suggestion"];
    const spendCols = [30, 28, 24, r.CW - 30 - 28 - 24];
    const spendRows = spends.map((s: SpendsOverviewItem) => [
      expenseCategoryLabel(s.category),
      inr(s.amount),
      s.status === "on_track" ? "On Track" : "Cut Down",
      s.suggestion,
    ]);
    r.table(spendHeaders, spendRows, spendCols);
  }

  r.heading("Repayment detail by strategy");
  r.bodyText(
    "Each strategy below has its own payoff order, month-by-month schedule, and (where generated) " +
      "action roadmap. Narrative milestones exist only for the strategy used at generation time " +
      "(see plan default); other paths still show full numbers.",
    0
  );
  r.spacer(2);

  const debtHeaders = ["#", "Debt Name", "Type", "Balance", "Rate", "Interest Paid", "Payoff Mth"];
  const debtCols = [8, 40, 22, 28, 18, 30, 28];
  const schedHeaders = ["Mth", "Date", "Total Paid", "Principal", "Interest", "Balance", "Cleared"];
  const schedCols = [12, 22, 26, 26, 24, 28, r.CW - 12 - 22 - 26 - 26 - 24 - 28];

  for (const sk of PDF_STRATEGY_ORDER) {
    const sv = v2.strategies[sk];
    if (!sv?.debtOrder || !sv?.monthlySchedule) continue;
    const label = PDF_STRATEGY_LABELS[sk];
    const debtOrder = sv.debtOrder as DebtOrderItem[];
    const schedule = sv.monthlySchedule as MonthlyPaymentPdf[];

    r.heading(`${label} Strategy -- Debt Priority Order`);
    r.bodyText(
      "Under " +
        label +
        ", priority 1 is the highest-rate debt for extra payments; priorities 2+ are ordered by payoff month so the table matches when each debt leaves the plan.",
      0
    );
    r.spacer(2);
    const debtRows = debtOrder.map((d: DebtOrderItem, i: number) => [
      String(i + 1),
      d.name,
      d.type === "credit_card" ? "Card" : d.type.charAt(0).toUpperCase() + d.type.slice(1),
      inr(d.balance),
      String(d.interestRate) + "%",
      inr(d.totalInterestPaid),
      "Month " + String(d.payoffMonth),
    ]);
    r.table(debtHeaders, debtRows, debtCols, { boldCol: 1 });

    r.heading(`${label} Strategy -- Monthly Repayment Schedule`);
    r.bodyText(
      "Each row is one month: principal, interest, remaining balance, and any debts cleared.",
      0
    );
    r.spacer(2);
    const schedRows = schedule.map((m: MonthlyPaymentPdf) => [
      String(m.month),
      m.date,
      inr(m.totalPayment),
      inr(m.principalPaid),
      inr(m.interestPaid),
      inr(m.remainingBalance),
      m.debtsCleared?.length ? m.debtsCleared.join(", ") : "-",
    ]);
    r.table(schedHeaders, schedRows, schedCols, { highlightCol: 3, redCol: 4, boldCol: 2 });

    const roadmapRows = schedule.filter((m: MonthlyPaymentPdf) => m.roadmapAction);
    if (roadmapRows.length > 0) {
      r.heading(`${label} Strategy -- Action Roadmap`);
      r.bodyText(
        "Step-by-step coaching for key months under the " + label + " strategy.",
        0
      );
      r.spacer(2);
      for (const m of roadmapRows) {
        r.needSpace(16);
        r.subheading("Month " + String(m.month) + " -- " + m.date, C.accent);
        const narrativeText = m.roadmapAction!.replace(/Payment split:[^\n]*/gi, "").trim();
        if (narrativeText) r.bodyText(narrativeText, 4);

        if (m.paymentBreakdown && m.paymentBreakdown.length > 0) {
          r.pdf.setFont("helvetica", "normal");
          r.pdf.setFontSize(8);
          r.pdf.setTextColor(...C.muted);
          const breakdownStr = m.paymentBreakdown
            .map((b: { name: string; amount: number }) => b.name + ": " + inr(b.amount))
            .join("  |  ");
          const cleanBreakdown = sanitize("Payment split: " + breakdownStr);
          const maxW = r.CW - 12;
          const lines = r.pdf.splitTextToSize(cleanBreakdown, maxW);
          r.needSpace(lines.length * 3.8 + 4);
          r.pdf.text(lines, r.ML + 6, r.y);
          r.y += lines.length * 3.8 + 4;
        }
      }
    }
  }

  const totalPages = r.pdf.getNumberOfPages();
  const sebiFooter = sanitize(
    "Debt Zero is not registered with SEBI (Securities and Exchange Board of India). " +
      "This report is for general debt planning information only. It is not investment advice, " +
      "not a research report, and not a recommendation to buy, sell, or hold any security."
  );
  for (let i = 1; i <= totalPages; i++) {
    r.pdf.setPage(i);
    r.pdf.setFont("helvetica", "normal");
    r.pdf.setFontSize(6.5);
    r.pdf.setTextColor(...C.muted);
    const sebiLines = r.pdf.splitTextToSize(sebiFooter, r.W - r.ML - r.MR);
    const sebiStartY = r.H - 22 - (sebiLines.length - 1) * 3.1;
    r.pdf.text(sebiLines, r.ML, sebiStartY);
    r.pdf.setFontSize(8);
    r.pdf.text(`Page ${String(i)} of ${String(totalPages)}`, r.W - r.MR, r.H - 10, { align: "right" });
    r.pdf.text("Debt Zero Financial Diagnostic", r.ML, r.H - 10);
    r.pdf.setDrawColor(...C.line);
    r.pdf.setLineWidth(0.2);
    r.pdf.line(r.ML, r.H - 14, r.W - r.MR, r.H - 14);
  }

  const buf = r.pdf.output("arraybuffer");
  return Buffer.from(buf);
}

// --- CLI ---

function parseArgs(argv: string[]): { outDir: string; inputs: string[]; forceRebuild: boolean } {
  const inputs: string[] = [];
  let outDir = path.resolve(process.cwd(), "batch-pdf-out");
  let forceRebuild = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out" || a === "-o") {
      outDir = path.resolve(process.cwd(), argv[++i] ?? ".");
      continue;
    }
    if (a === "--force-rebuild" || a === "-F") {
      forceRebuild = true;
      continue;
    }
    if (!a.startsWith("-")) inputs.push(path.resolve(process.cwd(), a));
  }
  if (inputs.length === 0) {
    console.error(
      "Usage: npx tsx scripts/batch-export-report-pdfs.ts [--out DIR] [--force-rebuild] <file.json|dir> ..."
    );
    process.exit(1);
  }
  return { outDir, inputs, forceRebuild };
}

function expandInputs(paths: string[]): string[] {
  const files: string[] = [];
  for (const p of paths) {
    if (!fs.existsSync(p)) {
      console.warn(`Skip missing path: ${p}`);
      continue;
    }
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const name of fs.readdirSync(p)) {
        if (!name.endsWith(".json")) continue;
        files.push(path.join(p, name));
      }
    } else {
      files.push(p);
    }
  }
  return files;
}

async function processOneJson(filePath: string, outDir: string, forceRebuild: boolean): Promise<void> {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  const shell = unwrapInputFile(raw);

  let emphasis: PayoffStrategy = shell.strategy && STRATEGIES.includes(shell.strategy) ? shell.strategy : "balanced";
  let formData: FormData | null = null;
  let planData: PlanDataV2;

  const useEmbeddedPlan = Boolean(shell.planData) && !forceRebuild;

  if (useEmbeddedPlan) {
    planData = expandCompactPlan(shell.planData as unknown) as PlanDataV2;
    if (shell.formData) {
      formData = normalizeFormPayload(shell.formData as Record<string, unknown>);
    }
    if (shell.strategy && STRATEGIES.includes(shell.strategy)) {
      emphasis = shell.strategy;
    } else if (planData.defaultStrategy && STRATEGIES.includes(planData.defaultStrategy)) {
      emphasis = planData.defaultStrategy;
    }
  } else {
    if (!shell.formData) {
      throw new Error(
        forceRebuild && shell.planData
          ? "--force-rebuild requires formData in the JSON (cannot recompute from planData alone)."
          : "Need formData (or root-level form fields) when planData is omitted."
      );
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set (required to build plan from intake).");
    }
    formData = normalizeFormPayload(shell.formData as Record<string, unknown>);
    const err = validateFormData(formData);
    if (err) throw new Error(err);
    if (shell.strategy && STRATEGIES.includes(shell.strategy)) {
      emphasis = shell.strategy;
    } else if (formData.strategy && STRATEGIES.includes(formData.strategy)) {
      emphasis = formData.strategy;
    }
    formData = formDataForStrategy(formData, emphasis);
    planData = await buildPlanDataV2(formData, emphasis);
  }

  const profile = profileFromStores(shell, formData);
  const plan: DebtPlanForPdf = { profile, formData, planData };
  const buf = generateFinancialReportBuffer(plan, emphasis);
  const safeName = (profile.name || "Plan").replace(/[^a-zA-Z0-9]/g, "-");
  const safeSource = path.basename(filePath, ".json").replace(/[^a-zA-Z0-9._-]+/g, "-");
  const dateStr = new Date().toISOString().split("T")[0];
  const outName = `Debt-Zero-Report-${safeName}-${safeSource}-${dateStr}.pdf`;
  const outPath = path.join(outDir, outName);
  fs.writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath}`);
}

async function main() {
  const { outDir, inputs, forceRebuild } = parseArgs(process.argv);
  const files = expandInputs(inputs);
  if (files.length === 0) {
    console.error("No .json files found.");
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  if (forceRebuild) {
    console.log("[batch-pdf] --force-rebuild: ignoring embedded planData; rebuilding from formData.");
  }

  let failed = 0;
  for (const f of files) {
    try {
      await processOneJson(f, outDir, forceRebuild);
    } catch (e) {
      failed++;
      console.error(`[${f}] ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
