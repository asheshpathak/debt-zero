import jsPDF from "jspdf";
import type {
  DebtPlan,
  FormData,
  PlanDataV2,
  PlanDataShared,
  MonthlyPayment,
  DebtOrderItem,
  SpendsOverviewItem,
  LoanEntry,
  CreditCardEntry,
  PayoffStrategy,
} from "../types";
import { expenseCategoryLabel } from "./expenses";
import { getPlanView } from "./planData";

// ─── Helpers ────────────────────────────────────────────────────────

/** Strip Unicode characters that jsPDF's built-in Helvetica has no metrics for.
 *  Without this, splitTextToSize calculates zero width for smart-quotes, em-dashes
 *  etc., causing the first line to overflow and letter-space to stretch. */
function sanitize(text: string): string {
  return text
    .replace(/[\u2018\u2019\u02BC]/g, "'")   // smart single quotes → ASCII
    .replace(/[\u201C\u201D]/g, '"')          // smart double quotes → ASCII
    .replace(/\u2013/g, "-")                  // en-dash → hyphen
    .replace(/\u2014/g, " - ")               // em-dash → spaced hyphen
    .replace(/\u2026/g, "...")                // ellipsis → three dots
    .replace(/\u20B9/g, "Rs.")               // ₹ → Rs.
    .replace(/\u00A0/g, " ")                 // non-breaking space → space
    .replace(/[^\x00-\x7F]/g, "");           // strip any remaining non-ASCII
}

function inr(n: number): string {
  return "Rs. " + Math.round(n).toLocaleString("en-IN");
}

/** Sentinel-aware formatter for interest saved.
 *  -1 means "minimum payments will never clear this debt" */
function displayInterestSaved(n: number): string {
  if (n === -1) return "Min. payments never clear this debt";
  return inr(n);
}

function pct(n: number): string {
  // DTI can arrive as 0.12 or 12 — normalise to percent
  const v = n < 2 ? n * 100 : n;
  return v.toFixed(1) + "%";
}

const PDF_STRATEGY_ORDER: PayoffStrategy[] = ["safe", "balanced", "aggressive"];
const PDF_STRATEGY_LABELS: Record<PayoffStrategy, string> = {
  safe: "Safe",
  balanced: "Balanced",
  aggressive: "Aggressive",
};

/** Shared headline stats (same intake; any slice is fine for debt/income/DTI). */
function pickReferenceSummary(v2: PlanDataV2, uiStrategy: string) {
  const keys = [uiStrategy, v2.defaultStrategy, "balanced", "safe", "aggressive"] as const;
  for (const k of keys) {
    const s = v2.strategies[k as PayoffStrategy]?.summary;
    if (s) return s;
  }
  return undefined;
}

// ─── Colour palette (RGB tuples) ────────────────────────────────────
const C = {
  brand: [40, 42, 80] as [number, number, number],      // deep indigo
  accent: [79, 70, 229] as [number, number, number],     // vivid violet
  green: [16, 163, 127] as [number, number, number],     // teal-green
  red: [220, 53, 69] as [number, number, number],        // warm red
  amber: [217, 119, 6] as [number, number, number],      // amber
  text: [30, 30, 40] as [number, number, number],        // near-black
  muted: [110, 115, 140] as [number, number, number],    // grey
  bg: [248, 249, 252] as [number, number, number],       // off-white
  white: [255, 255, 255] as [number, number, number],
  tableBg: [243, 244, 248] as [number, number, number],  // zebra stripe
  line: [210, 215, 225] as [number, number, number],     // border
};

// ─── Drawing primitives ─────────────────────────────────────────────
class ReportBuilder {
  pdf: jsPDF;
  y = 0;
  pageNum = 0;
  readonly W = 210;
  readonly H = 297;
  readonly ML = 22;  // margin left
  readonly MR = 22;  // margin right
  readonly MT = 20;  // margin top
  readonly MB = 30;  // margin bottom (room for SEBI + page footer)
  readonly CW: number; // content width

  constructor() {
    this.pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    this.CW = this.W - this.ML - this.MR;
    this.y = this.MT;
    this.pageNum = 1;
  }

  // --- Page management ---
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

  // --- Typography ---
  heading(text: string, color: [number, number, number] = C.brand) {
    this.needSpace(14);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(...color);
    this.pdf.text(sanitize(text), this.ML, this.y);
    this.y += 3;
    // underline
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

  label(text: string) {
    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFontSize(8.5);
    this.pdf.setTextColor(...C.muted);
    this.pdf.text(text.toUpperCase(), this.ML, this.y);
  }

  value(text: string, x?: number) {
    this.pdf.setFont("helvetica", "bold");
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(...C.text);
    this.pdf.text(text, x ?? this.ML, this.y);
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
      // bullet dot
      this.pdf.setFillColor(...color);
      this.pdf.circle(this.ML + 2.5, this.y - 1.2, 0.8, "F");
      // text
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

  // --- Stat row (label : value) side-by-side ---
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

  // --- Table (multi-line cells: text wraps within column width) ---
  table(
    headers: string[],
    rows: string[][],
    colWidths: number[],
    options?: {
      highlightCol?: number;       // col index to color green
      redCol?: number;             // col index to color red
      boldCol?: number;            // col index to bold
    }
  ) {
    const minRowH = 6.5;
    const lineH = 3.85;
    const headerH = 7;
    const cellPadX = 2;

    const drawHeaders = () => {
      this.needSpace(headerH + 2);
      // header background
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

  // --- Key-value grid (2 cols of label/value pairs) ---
  kvGrid(pairs: [string, string][]) {
    const colW = this.CW / 2;
    for (let i = 0; i < pairs.length; i += 2) {
      this.needSpace(12);
      // Left pair
      this.pdf.setFont("helvetica", "normal");
      this.pdf.setFontSize(8);
      this.pdf.setTextColor(...C.muted);
      this.pdf.text(sanitize(pairs[i][0]).toUpperCase(), this.ML, this.y);
      this.pdf.setFont("helvetica", "bold");
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(...C.text);
      this.pdf.text(sanitize(pairs[i][1]), this.ML, this.y + 5.5);

      // Right pair (if exists)
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

// ─── Main export ────────────────────────────────────────────────────
export function generateFinancialReport(plan: DebtPlan, strategy: string) {
  if (!plan.planData) return;
  const v2 = plan.planData as PlanDataV2;
  const shared: PlanDataShared = v2.shared;
  const summary = pickReferenceSummary(v2, strategy);
  if (!summary) return;

  const strat: PayoffStrategy =
    strategy === "safe" || strategy === "balanced" || strategy === "aggressive" ? strategy : "balanced";
  const narrativeView = getPlanView(plan.planData, strat);
  const insightsPdf = narrativeView?.insights ?? shared.insights ?? [];
  const quickWinsPdf = narrativeView?.quickWins ?? shared.quickWins ?? [];
  const warningsPdf = narrativeView?.warnings ?? shared.warnings ?? [];
  const refinancePdf = narrativeView?.refinanceFlag ?? shared.refinanceFlag;

  const spends: SpendsOverviewItem[] = shared.spendsOverview ?? [];

  const r = new ReportBuilder();

  // ═══════════════════════════════════════════════════════════════════
  //  COVER HEADER
  // ═══════════════════════════════════════════════════════════════════
  // Brand bar
  r.pdf.setFillColor(...C.brand);
  r.pdf.rect(0, 0, r.W, 44, "F");
  // Accent stripe
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

  // Subject info on right
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

  // ═══════════════════════════════════════════════════════════════════
  //  REGULATORY (India / SEBI) — cover page
  // ═══════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════
  //  1. SUMMARY AT A GLANCE + THREE-STRATEGY SNAPSHOT (matches dashboard)
  // ═══════════════════════════════════════════════════════════════════
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
      sv.summary.monthlyBudget != null ? inr(sv.summary.monthlyBudget) : "—",
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

  // ═══════════════════════════════════════════════════════════════════
  //  1b. YOUR FINANCIAL PROFILE (intake data)
  // ═══════════════════════════════════════════════════════════════════
  const fd = plan.formData as FormData | null | undefined;
  if (fd) {
    r.heading("Your Financial Profile");

    // Personal
    r.subheading("Personal Information", C.brand);
    r.kvGrid([
      ["Full Name", fd.name || "-"],
      ["City", fd.city || "-"],
      ["Age", fd.age ? String(fd.age) : "-"],
      ["Gender", fd.gender || "-"],
      ["Occupation", fd.occupation || "-"],
    ]);
    r.spacer(2);

    // Income & Expenses
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
    const enabledExpenses = (fd.expenseCategories ?? []).filter(c => c.enabled && c.amount);
    for (const e of enabledExpenses) {
      const label = e.key.charAt(0).toUpperCase() + e.key.slice(1).replace(/_/g, " ");
      incomeExpensePairs.push([label, inr(e.amount!)]);
    }
    r.kvGrid(incomeExpensePairs);
    r.spacer(2);

    // Loans
    const loans = fd.loans ?? [];
    if (loans.length > 0) {
      r.subheading("Loans & EMI Debt (" + loans.length + ")", C.brand);
      const loanHeaders = ["Loan Name", "Balance", "Rate", "EMI", "Type"];
      const loanCols = [42, 30, 18, 28, r.CW - 42 - 30 - 18 - 28];
      const loanRows = loans.map((l: LoanEntry) => [
        l.name || "-",
        l.balance ? inr(l.balance) : "-",
        l.interestRate ? l.interestRate + "%" : "-",
        l.monthlyEmi ? inr(l.monthlyEmi) : "-",
        l.type ? l.type.replace(/_/g, " ") : "-",
      ]);
      r.table(loanHeaders, loanRows, loanCols, { boldCol: 0 });
    }

    // Credit Cards
    const cards = fd.creditCards ?? [];
    if (cards.length > 0) {
      r.subheading("Credit Cards (" + cards.length + ")", C.brand);
      const cardHeaders = ["Card Name", "Outstanding", "Limit", "Rate", "Min. Payment"];
      const cardCols = [40, 28, 28, 18, r.CW - 40 - 28 - 28 - 18];
      const cardRows = cards.map((c: CreditCardEntry) => [
        c.name || "-",
        c.balance ? inr(c.balance) : "-",
        c.limit ? inr(c.limit) : "-",
        c.interestRate ? c.interestRate + "%" : "-",
        c.minimumPayment ? inr(c.minimumPayment) : "-",
      ]);
      r.table(cardHeaders, cardRows, cardCols, { boldCol: 0 });
    }

    // Assets
    const enabledAssets = (fd.assetCategories ?? []).filter(a => a.enabled && a.amount);
    if (enabledAssets.length > 0) {
      r.subheading("Assets & Reserves", C.brand);
      const assetHeaders = ["Asset Type", "Approximate Value"];
      const assetCols = [r.CW / 2, r.CW / 2];
      const assetRows = enabledAssets.map(a => [
        a.key.charAt(0).toUpperCase() + a.key.slice(1).replace(/_/g, " "),
        inr(a.amount!),
      ]);
      r.table(assetHeaders, assetRows, assetCols);
    }

    r.spacer(4);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  2. WARNINGS
  // ═══════════════════════════════════════════════════════════════════
  if (warningsPdf.length > 0) {
    r.heading("Warnings & Risk Flags", C.red);
    r.bulletList(warningsPdf, C.red);
  }

  if (refinancePdf?.active && refinancePdf.debts.length > 0) {
    r.heading("Refinance / consolidation flag", C.amber);
    r.bodyText(
      sanitize(
        "Minimum payments alone do not clear monthly interest on the lines below (worst APR first). " +
          "Compare formal consolidation, balance transfer, or top-up quotes against this payoff plan — include fees, blended rate, tenure, and discipline after clearing revolving lines."
      ),
      0
    );
    r.spacer(1);
    r.bulletList(
      refinancePdf.debts.map(
        (d) =>
          sanitize(
            `${d.name} — ${d.interestRateApr}% APR — ${inr(d.balance)}${d.type === "credit_card" ? " (credit card)" : " (loan)"}`
          )
      ),
      C.amber
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  //  3. KEY INSIGHTS
  // ═══════════════════════════════════════════════════════════════════
  if (insightsPdf.length > 0) {
    r.heading("Key Insights");
    r.bulletList(insightsPdf, C.accent);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  4. QUICK WINS
  // ═══════════════════════════════════════════════════════════════════
  if (quickWinsPdf.length > 0) {
    r.heading("Recommended Actions (Quick Wins)", C.green);
    r.bulletList(quickWinsPdf, C.green);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  5. SPENDING ANALYSIS
  // ═══════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════
  //  6–8. PER STRATEGY: debt priority, schedule, roadmap (all three)
  // ═══════════════════════════════════════════════════════════════════
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
    const schedule = sv.monthlySchedule as MonthlyPayment[];

    r.heading(`${label} Strategy — Debt Priority Order`);
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
      d.interestRate + "%",
      inr(d.totalInterestPaid),
      "Month " + d.payoffMonth,
    ]);
    r.table(debtHeaders, debtRows, debtCols, { boldCol: 1 });

    r.heading(`${label} Strategy — Monthly Repayment Schedule`);
    r.bodyText(
      "Each row is one month: principal, interest, remaining balance, and any debts cleared.",
      0
    );
    r.spacer(2);
    const schedRows = schedule.map((m: MonthlyPayment) => [
      String(m.month),
      m.date,
      inr(m.totalPayment),
      inr(m.principalPaid),
      inr(m.interestPaid),
      inr(m.remainingBalance),
      m.debtsCleared?.length ? m.debtsCleared.join(", ") : "-",
    ]);
    r.table(schedHeaders, schedRows, schedCols, { highlightCol: 3, redCol: 4, boldCol: 2 });

    const roadmapRows = schedule.filter((m: MonthlyPayment) => m.roadmapAction);
    if (roadmapRows.length > 0) {
      r.heading(`${label} Strategy — Action Roadmap`);
      r.bodyText(
        "Step-by-step coaching for key months under the " + label + " strategy.",
        0
      );
      r.spacer(2);
      for (const m of roadmapRows) {
        r.needSpace(16);
        r.subheading("Month " + m.month + " — " + m.date, C.accent);
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

  // ═══════════════════════════════════════════════════════════════════
  //  FOOTER — page numbers on every page
  // ═══════════════════════════════════════════════════════════════════
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
    r.pdf.text(`Page ${i} of ${totalPages}`, r.W - r.MR, r.H - 10, { align: "right" });
    r.pdf.text("Debt Zero Financial Diagnostic", r.ML, r.H - 10);
    r.pdf.setDrawColor(...C.line);
    r.pdf.setLineWidth(0.2);
    r.pdf.line(r.ML, r.H - 14, r.W - r.MR, r.H - 14);
  }

  // ─── Save ─────────────────────────────────────────────────────────
  const safeName = (plan.profile?.name || "Plan").replace(/[^a-zA-Z0-9]/g, "-");
  r.pdf.save(`Debt-Zero-Report-${safeName}-${new Date().toISOString().split("T")[0]}.pdf`);
}
