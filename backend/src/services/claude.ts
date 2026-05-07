import Anthropic from "@anthropic-ai/sdk";
import type { FormData } from "../types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateDebtPlan(formData: FormData) {
  const totalLoanDebt = formData.loans.reduce((s, l) => s + l.balance, 0);
  const totalCardDebt = formData.creditCards.reduce((s, c) => s + c.balance, 0);
  const totalDebt = totalLoanDebt + totalCardDebt;
  const totalEmi = formData.loans.reduce((s, l) => s + l.monthlyEmi, 0);
  const totalMinPayment = formData.creditCards.reduce((s, c) => s + c.minimumPayment, 0);
  const surplus = formData.monthlyIncome - formData.monthlyExpenses - totalEmi - totalMinPayment;
  const extraBudget = formData.extraMonthlyBudget || 0;
  const availableMonthly = Math.max(totalEmi + totalMinPayment + extraBudget, totalEmi + totalMinPayment);

  const prompt = `You are a certified financial planner. Analyse the following debt situation and create a comprehensive debt payoff plan. Return ONLY valid JSON, no markdown, no explanation.

FINANCIAL DATA:
- Name: ${formData.name}
- Monthly Income: ₹${formData.monthlyIncome}
- Monthly Expenses (non-debt): ₹${formData.monthlyExpenses}
- Monthly Surplus after all payments: ₹${surplus}
- Extra budget committed: ₹${extraBudget}
- Strategy: ${formData.strategy}

LOANS:
${formData.loans.map(l => `- ${l.name} (${l.type}): Balance ₹${l.balance}, Rate ${l.interestRate}% p.a., EMI ₹${l.monthlyEmi}`).join("\n")}

CREDIT CARDS:
${formData.creditCards.map(c => `- ${c.name}: Balance ₹${c.balance}, Limit ₹${c.limit}, Rate ${c.interestRate}% p.a., Min Payment ₹${c.minimumPayment}`).join("\n")}

TARGET MONTHS: ${formData.targetMonths || "not specified"}

Generate a JSON response with this exact structure:
{
  "summary": {
    "totalDebt": number,
    "monthlyIncome": number,
    "debtToIncomeRatio": number,
    "estimatedPayoffMonths": number,
    "estimatedPayoffDate": "Mon YYYY",
    "totalInterestSaved": number,
    "strategy": "${formData.strategy}"
  },
  "monthlySchedule": [
    {
      "month": number,
      "date": "Mon YYYY",
      "totalPayment": number,
      "principalPaid": number,
      "interestPaid": number,
      "remainingBalance": number,
      "debtsCleared": ["debt name if cleared this month"]
    }
  ],
  "debtOrder": [
    {
      "name": "debt name",
      "type": "loan|credit_card",
      "balance": number,
      "interestRate": number,
      "payoffMonth": number,
      "totalInterestPaid": number,
      "priority": number
    }
  ],
  "insights": ["3-5 key insights about this person's debt situation"],
  "quickWins": ["2-3 immediate actions they can take"],
  "warnings": ["any debt risks or concerns, empty array if none"]
}

Use the ${formData.strategy} method. Calculate realistic month-by-month figures. Available monthly budget: ₹${availableMonthly + extraBudget}. Start date: ${new Date().toLocaleString("en-IN", { month: "short", year: "numeric" })}.`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude returned invalid JSON");

  return JSON.parse(jsonMatch[0]);
}
