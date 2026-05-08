The Token Problem
Your current setup generates 4 full strategies × 60-month schedules in one call. That's the bottleneck. Here's the math:

4 strategies × 60 months × ~8 fields = 1,920 schedule rows
Each row ~50 tokens = ~96,000 tokens just for schedules
You cap at 16,384 → truncation is almost guaranteed for users with many debts

Strategy 1: Compress the Schedule (Best ROI)
Instead of storing every month, use a delta-compressed sparse format:
json"monthlySchedule": [
  { "m": 1, "tp": 42000, "rb": 380000, "cleared": [] },
  { "m": 6, "tp": 42000, "rb": 195000, "cleared": ["HDFC Personal"] },
  { "m": 12, "tp": 42000, "rb": 0, "cleared": ["Axis Card"] }
]
Short keys (m, tp, pp, ip, rb) alone save ~40% tokens. Quarterly sampling after month 12 (which you already instruct) + short keys = ~70% reduction in schedule size.
Strategy 2: Split the Call (Most Reliable)
Generate shared insights + all 4 summaries + debtOrder in Call 1 (~3K tokens out), then generate schedules per strategy in 4 parallel calls (~2K tokens each). Total: ~11K tokens, never truncates, and parallel calls make it faster.
Strategy 3: Smarter Max Tokens
Set max_tokens dynamically based on debt count:
tsconst debtCount = loans.length + creditCards.length;
const maxTokens = Math.min(4096 + debtCount * 1200, 16384);

Optimized JSON schema
Here's the token-efficient PlanDataV2 format with compressed keys for the schedule and a split-call architecture note:

{
  "version": 2,
  "defaultStrategy": "avalanche",
  "shared": {
    "insights": ["string × 3–5"],
    "quickWins": ["string × 2–3"],
    "warnings": ["string[] or []"]
  },
  "strategies": {
    "avalanche": {
      "summary": {
        "totalDebt": 485000,
        "monthlyIncome": 80000,
        "debtToIncomeRatio": 0.38,
        "estimatedPayoffMonths": 34,
        "estimatedPayoffDate": "Feb 2029",
        "totalInterestSaved": 48200,
        "strategy": "avalanche"
      },
      "monthlySchedule": [
        { "m": 1, "dt": "Jun 2026", "tp": 32500, "pp": 29580, "ip": 2920, "rb": 455420, "cl": [] },
        { "m": 4, "dt": "Sep 2026", "tp": 32500, "pp": 30710, "ip": 1790, "rb": 364480, "cl": ["Axis Credit Card"] }
      ],
      "debtOrder": [
        { "name": "Axis Credit Card", "type": "credit_card", "balance": 45000, "interestRate": 36, "payoffMonth": 4, "totalInterestPaid": 3800, "priority": 1 }
      ]
    }
  }
}

Short key mapping: m=month, dt=date, tp=totalPayment, pp=principalPaid, ip=interestPaid, rb=remainingBalance, cl=debtsCleared. Your frontend just maps them back on parse.

Full optimization playbook
Immediate wins (today):

Short keys in schedule — saves ~35% tokens, zero logic change. Add a expandScheduleRow() helper in your frontend.
Cap schedule rows in the prompt — your current rule says max 60, but enforce it harder: "months 1–12 monthly, then every 3rd month, always include payoff months. Hard max: 20 rows per strategy." That's 20 × 4 = 80 rows vs 240 — a 66% reduction.
Dynamic max_tokens based on debt count (formula above).

Medium effort (this week):

Split into 2 API calls — Call 1 generates shared + all 4 summary + all 4 debtOrder blocks (~4K tokens out). Call 2 generates all 4 monthlySchedule blocks in parallel (or sequentially). This eliminates truncation entirely and feels faster with a progress indicator.
Prompt compression — Your prompt currently spells out field names in plain English. Switch to a compact schema block:

   Each schedule row: {m, dt, tp, pp, ip, rb, cl[]}. Max 20 rows/strategy.
Architecture upgrade (next sprint):

Streaming — Use stream: true and show the UI as data arrives. Users see the overview card populate in real time instead of a spinner for 8–12 seconds.
Cache common profiles — If two users have near-identical income/debt profiles, the plan math is deterministic. A simple hash of rounded inputs → cached plan_data hits Claude 0 times.
Prompt caching — The static part of your prompt (instructions, rules, strategy definitions) is ~800 tokens. With Anthropic's prompt caching, prefix that as a cached block and save ~60% of input token cost on every generation.