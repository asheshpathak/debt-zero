import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const features = [
  {
    icon: "01",
    title: "Intelligent payoff roadmap",
    desc: "Structured analysis of your debts, income, and goals—so you see a realistic path forward, not generic advice.",
  },
  {
    icon: "02",
    title: "Privacy by default",
    desc: "Automated flow only. Your numbers are not reviewed by people, sold to lenders, or used for cold calls.",
  },
  {
    icon: "03",
    title: "Safe, Balanced & Aggressive",
    desc: "Choose the strategy that fits your risk appetite—protect your emergency fund, balance savings and repayment, or go all-in on eliminating debt fast.",
  },
  {
    icon: "04",
    title: "Report you can keep",
    desc: "Month-by-month schedule, totals, and a PDF you can revisit whenever you rebudget or refinance.",
  },
];

const steps = [
  {
    num: "01",
    label: "INPUT",
    title: "Share your debts",
    desc: "Loans, cards, and rates in one place. About three minutes.",
    cmd: "debt_planner --input profile.json",
  },
  {
    num: "02",
    label: "PROCESS",
    title: "Review the analysis",
    desc: "Intelligent analysis weighs your surplus, minimums, and strategy to assemble a payoff order and schedule.",
    cmd: "analyze --strategy balanced",
  },
  {
    num: "03",
    label: "UNLOCK",
    title: "Get your roadmap",
    desc: "One payment for full visibility and your downloadable blueprint.",
    cmd: "export --format pdf",
  },
];

const testimonials = [
  {
    name: "Priya S.",
    city: "Mumbai",
    text: "Cleared ₹4.2L of debt in 14 months using this plan. Worth every rupee.",
    saved: "₹38K saved",
  },
  {
    name: "Rahul K.",
    city: "Bangalore",
    text: "No bank, no advisor, no embarrassment—just clarity on what to pay down first.",
    saved: "₹52K saved",
  },
  {
    name: "Anita M.",
    city: "Delhi",
    text: "Seeing interest savings in rupees—not vague tips—made it easy to stick to.",
    saved: "₹38K saved",
  },
];

const mockDebts = [
  { name: "HDFC_CREDIT_CARD", rate: "36.0%", bal: "₹1.87L", pct: 22 },
  { name: "AXIS_PERSONAL_LOAN", rate: "14.5%", bal: "₹4.25L", pct: 51 },
  { name: "SBI_CAR_LOAN", rate: " 8.9%", bal: "₹2.28L", pct: 27 },
];

const mockSchedule = [
  { month: "Jan 2025", payment: "₹18,400", cleared: "—", remaining: "₹8,21,600" },
  { month: "Feb 2025", payment: "₹18,400", cleared: "—", remaining: "₹8,02,300" },
  { month: "Mar 2025", payment: "₹18,400", cleared: "HDFC card cleared", remaining: "₹7,81,400" },
];

const mockInsights = [
  "Your HDFC credit card at 36% APR is costing ₹5,620/month in interest alone — clearing it first saves ₹42,300 total.",
  "With ₹18,400/month allocated, the Balanced strategy pays off all debt by Mar 2027, saving ₹1,23,400 vs minimums-only.",
  "Quick win: redirect ₹3,000 from discretionary spend this week toward the HDFC card to reduce next month's interest charge.",
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
});

function TerminalBar({ title }: { title: string }) {
  return (
    <div
      className="px-4 py-3 flex items-center gap-3"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.25) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="flex gap-[7px] items-center shrink-0">
        <div
          className="w-3 h-3 rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 35%, #ff7b72, #ff5f56)",
            boxShadow: "0 0 0 0.5px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        />
        <div
          className="w-3 h-3 rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 35%, #ffd060, #ffbd2e)",
            boxShadow: "0 0 0 0.5px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        />
        <div
          className="w-3 h-3 rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 35%, #40d158, #28c840)",
            boxShadow: "0 0 0 0.5px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        />
      </div>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#3d4055] mx-auto">
        {title}
      </span>
      <div className="w-[45px] shrink-0" />
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#08080f" }}>
      {/* Dot grid background */}
      <div className="fixed inset-0 dot-grid pointer-events-none z-0 opacity-100" aria-hidden />

      {/* Subtle accent gradient at top */}
      <div
        className="fixed top-0 left-0 right-0 h-[40vh] pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(91,95,199,0.08) 0%, transparent 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-[1]">

        {/* ── Hero ── */}
        <section className="px-4 sm:px-6 pt-28 pb-20 sm:pt-36 sm:pb-28">
          <div className="max-w-3xl mx-auto text-center">

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(91,95,199,0.1)",
                  border: "1px solid rgba(91,95,199,0.2)",
                }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#5b5fc7] animate-pulse" />
                <span className="font-mono text-[12px] font-medium text-[#9b9ec4] tracking-tight">
                  private.automated.secured
                </span>
              </div>

              <h1
                className="font-sans font-semibold leading-[1.1] tracking-[-0.025em] text-balance mb-6"
                style={{ fontSize: "clamp(2.2rem, 6vw, 3.5rem)", color: "#e2e4ec" }}
              >
                Become{" "}
                <span style={{ color: "#8b8fce" }}>debt-free</span>
                <br />
                <span style={{ color: "#7b7f9a", fontWeight: 400 }}>
                  with a plan written for your balance sheet.
                </span>
              </h1>

              <p className="text-[15px] sm:text-[16px] leading-[1.7] text-[#7b7f9a] mx-auto mb-10 max-w-lg">
                Get a payoff sequence and timeline based on what you actually earn, owe, and can spare—without new loans or handing your number to a bank desk.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                <button
                  type="button"
                  onClick={() => navigate("/create-plan")}
                  className="font-mono font-semibold text-[13px] px-8 py-3 rounded-md transition-all duration-150 active:scale-[0.98] material-shadow-accent"
                  style={{
                    background: "#5b5fc7",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.08)",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                  }}
                >
                  [ GET YOUR REPORT NOW ]
                </button>
                <p className="font-mono text-[11px] text-[#44475a] sm:max-w-[200px] sm:text-left leading-relaxed">
                  Free to start. Pay only when you unlock.
                </p>
              </div>

              {/* Stats bar */}
              <div
                className="grid grid-cols-4 max-w-xl mx-auto rounded-xl overflow-hidden mb-16"
                style={{
                  border: "1px solid rgba(255,255,255,0.09)",
                  background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
                  backdropFilter: "blur(20px)",
                }}
              >
                {[
                  { val: "1,200+", label: "Plans", accent: "#8b8fce" },
                  { val: "₹2.4Cr+", label: "Saved", accent: "#22c55e" },
                  { val: "28 mo", label: "Payoff", accent: "#f59e0b" },
                  { val: "4.9★", label: "Rating", accent: "#5b5fc7" },
                ].map((s, i, arr) => (
                  <div
                    key={s.label}
                    className="flex flex-col items-center justify-center gap-1 px-3 py-4"
                    style={{
                      borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    }}
                  >
                    <span
                      className="font-mono font-bold tabular-nums leading-none"
                      style={{ color: s.accent, fontSize: "clamp(13px, 3.5vw, 17px)" }}
                    >
                      {s.val}
                    </span>
                    <span
                      className="font-sans text-[11px] font-medium whitespace-nowrap"
                      style={{ color: "rgba(255,255,255,0.28)" }}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Preview card — payoff summary terminal */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-2xl text-left"
            >
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: "linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(14,14,22,0.95) 60%)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.04) inset",
                  backdropFilter: "blur(40px)",
                }}
              >
                <TerminalBar title="debt_clear — payoff_summary.json" />

                <div className="p-5 sm:p-6">
                  {/* Stat grid */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: "TOTAL_DEBT", val: "₹8,40,000", color: "#f87171", bg: "rgba(239,68,68,0.07)", border: "rgba(239,68,68,0.15)" },
                      { label: "DEBT_FREE", val: "Mar 2027", color: "#22c55e", bg: "rgba(34,197,94,0.07)", border: "rgba(34,197,94,0.15)" },
                      { label: "INT_SAVED", val: "₹1,23,400", color: "#8b8fce", bg: "rgba(91,95,199,0.07)", border: "rgba(91,95,199,0.2)" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg px-3 py-3"
                        style={{
                          background: item.bg,
                          border: `1px solid ${item.border}`,
                        }}
                      >
                        <div className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.16em] font-semibold mb-2" style={{ color: item.color, opacity: 0.7 }}>
                          {item.label}
                        </div>
                        <div className="font-mono text-[13px] sm:text-[15px] font-bold tabular-nums" style={{ color: item.color }}>
                          {item.val}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Debt list */}
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="px-4 py-2 flex items-center justify-between"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#3d4055] font-semibold">payoff_order[]</span>
                      <span className="font-mono text-[9px] text-[#3d4055] uppercase tracking-[0.1em]">sorted by rate ↓</span>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {mockDebts.map((d, idx) => (
                        <div key={d.name} className="flex items-center gap-3 px-4 py-3 text-[11px] sm:text-[12px]">
                          <span
                            className="font-mono w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: "rgba(91,95,199,0.15)", color: "#8b8fce" }}
                          >
                            {idx + 1}
                          </span>
                          <span className="flex-1 min-w-0 truncate font-mono font-medium text-[#c8cce0]">{d.name}</span>
                          <span
                            className="font-mono text-[11px] font-bold tabular-nums shrink-0 px-2 py-0.5 rounded"
                            style={{
                              color: idx === 0 ? "#f87171" : idx === 1 ? "#fbbf24" : "#86efac",
                              background: idx === 0 ? "rgba(239,68,68,0.1)" : idx === 1 ? "rgba(245,158,11,0.1)" : "rgba(134,239,172,0.1)",
                            }}
                          >
                            {d.rate}
                          </span>
                          <div className="w-16 sm:w-20 h-1.5 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${d.pct}%`,
                                background: idx === 0 ? "rgba(239,68,68,0.6)" : idx === 1 ? "rgba(245,158,11,0.6)" : "rgba(91,95,199,0.6)",
                              }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-semibold tabular-nums text-[#dce1ea] w-12 text-right shrink-0">
                            {d.bal}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Additional Demo Screens ── */}
        <section className="px-4 sm:px-6 pb-20" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="max-w-5xl mx-auto">
            <motion.div {...fadeUp()} className="mb-10 text-center">
              <p className="cmd-label mb-2">// what_your_report_looks_like</p>
              <h2 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-[#e2e4ec] mb-2">
                See what's inside your roadmap
              </h2>
              <p className="text-[14px] text-[#7b7f9a]">Month-by-month clarity, personalised insights, and quick wins — all in one report.</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Schedule preview */}
              <motion.div {...fadeUp(0.05)}>
                <div
                  className="rounded-xl overflow-hidden h-full"
                  style={{
                    background: "linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(14,14,22,0.95) 60%)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 20px 56px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
                    backdropFilter: "blur(32px)",
                  }}
                >
                  <TerminalBar title="schedule_preview.json" />
                  <div className="p-5">
                    <div
                      className="flex items-center justify-between mb-3 px-1"
                    >
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#3d4055] font-semibold">monthly_schedule[]</span>
                      <span className="font-mono text-[9px] text-[#3d4055]">3 of {mockSchedule.length + 9} months shown</span>
                    </div>
                    <div className="space-y-2">
                      {mockSchedule.map((row) => (
                        <div
                          key={row.month}
                          className="rounded-lg px-3 py-3 flex flex-col gap-1.5"
                          style={{
                            background: row.cleared !== "—" ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.03)",
                            border: row.cleared !== "—" ? "1px solid rgba(34,197,94,0.15)" : "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] font-semibold text-[#c8cce0]">{row.month}</span>
                            <span
                              className="font-mono text-[11px] font-bold tabular-nums px-2 py-0.5 rounded"
                              style={{ color: "#22c55e", background: "rgba(34,197,94,0.1)" }}
                            >
                              {row.payment}
                            </span>
                          </div>
                          {row.cleared !== "—" && (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
                              <span className="font-mono text-[10px] font-semibold text-[#22c55e]">{row.cleared}</span>
                            </div>
                          )}
                          <div className="font-mono text-[10px] text-[#44475a]">
                            <span className="text-[#3d4055]">remaining · </span>{row.remaining}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <span className="font-mono text-[9px] text-[#3d4055] tracking-[0.1em]">// full schedule in your dashboard</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Insights preview */}
              <motion.div {...fadeUp(0.1)}>
                <div
                  className="rounded-xl overflow-hidden h-full"
                  style={{
                    background: "linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(14,14,22,0.95) 60%)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 20px 56px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
                    backdropFilter: "blur(32px)",
                  }}
                >
                  <TerminalBar title="insights_output.json" />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#3d4055] font-semibold">insights[] + quick_wins[]</span>
                    </div>
                    <div className="space-y-2.5">
                      {mockInsights.map((insight, i) => (
                        <div
                          key={i}
                          className="rounded-lg px-3 py-3 flex gap-2.5"
                          style={{
                            background: i < 2 ? "rgba(91,95,199,0.06)" : "rgba(34,197,94,0.05)",
                            border: i < 2 ? "1px solid rgba(91,95,199,0.15)" : "1px solid rgba(34,197,94,0.15)",
                          }}
                        >
                          <span
                            className="font-mono text-[10px] font-bold shrink-0 mt-0.5 w-4 text-center"
                            style={{ color: i < 2 ? "#8b8fce" : "#22c55e" }}
                          >
                            {i < 2 ? "i" : "→"}
                          </span>
                          <p className="font-mono text-[11px] leading-relaxed" style={{ color: i < 2 ? "#9ca3c8" : "#86efac" }}>{insight}</p>
                        </div>
                      ))}
                    </div>
                    <div
                      className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <span className="font-mono text-[9px] text-[#3d4055] tracking-[0.1em]">// personalised to your numbers, not templates</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="px-4 sm:px-6 py-16 sm:py-24" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="max-w-5xl mx-auto">
            <motion.div {...fadeUp()} className="mb-14">
              <p className="cmd-label mb-2">// process</p>
              <h2 className="font-sans text-2xl sm:text-[2rem] font-semibold tracking-tight text-[#e2e4ec] mb-2">
                Three steps to clarity
              </h2>
              <p className="text-[15px] text-[#7b7f9a]">No jargon, no mandatory calls—structured inputs and a clear readout.</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.5rem", overflow: "hidden" }}
            >
              {steps.map((step, i) => (
                <motion.div key={step.num} {...fadeUp(i * 0.07)}>
                  <div
                    className="h-full p-6 sm:p-7"
                    style={{ background: "#0f0f18" }}
                  >
                    <div className="flex items-center gap-2 mb-5">
                      <span className="font-mono text-[10px] font-semibold text-[#44475a] tracking-[0.14em] uppercase">{step.label}</span>
                      <span className="font-mono text-[10px] text-[#5b5fc7]">::</span>
                      <span className="font-mono text-[10px] font-bold text-[#5b5fc7]">{step.num}</span>
                    </div>
                    <h3 className="font-semibold text-[16px] text-[#e2e4ec] mb-2 tracking-tight">{step.title}</h3>
                    <p className="text-[13px] leading-relaxed text-[#7b7f9a] mb-5">{step.desc}</p>
                    <div
                      className="rounded px-3 py-2 font-mono text-[11px] text-[#44475a]"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <span className="text-[#5b5fc7] mr-1">$</span>{step.cmd}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-5xl mx-auto">
            <motion.div {...fadeUp()} className="mb-12">
              <p className="cmd-label mb-2">// features</p>
              <h2 className="font-sans text-2xl sm:text-[2rem] font-semibold tracking-tight text-[#e2e4ec] mb-2">
                Built like software, not a brochure
              </h2>
              <p className="text-[15px] text-[#7b7f9a]">Everything below is included when you unlock—no tiers or upsells.</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((f, i) => (
                <motion.div key={f.title} {...fadeUp(i * 0.06)}>
                  <div
                    className="h-full rounded-md p-5 sm:p-6 flex gap-4"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderLeft: "2px solid rgba(91,95,199,0.5)",
                    }}
                  >
                    <div
                      className="font-mono text-[11px] font-bold text-[#5b5fc7] shrink-0 w-6 pt-0.5"
                    >
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[15px] text-[#e2e4ec] mb-1.5 tracking-tight">{f.title}</h3>
                      <p className="text-[13px] leading-[1.65] text-[#7b7f9a]">{f.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section
          className="px-4 sm:px-6 py-14 sm:py-20"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-md overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {[
                { val: "1,200+", label: "PLANS_CREATED" },
                { val: "₹2.4Cr+", label: "INTEREST_AVOIDED" },
                { val: "28 mo", label: "MEDIAN_TIMELINE" },
                { val: "100%", label: "AUTOMATED" },
              ].map((s, i) => (
                <motion.div key={s.label} {...fadeUp(i * 0.06)}>
                  <div
                    className="px-6 py-8 text-center"
                    style={{ background: "#0f0f18" }}
                  >
                    <div className="font-mono text-2xl sm:text-[1.85rem] font-bold tabular-nums text-[#e2e4ec] mb-2">
                      {s.val}
                    </div>
                    <div className="font-mono text-[10px] text-[#44475a] tracking-[0.12em] uppercase">{s.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-5xl mx-auto">
            <motion.div {...fadeUp()} className="mb-12">
              <p className="cmd-label mb-2">// testimonials</p>
              <h2 className="font-sans text-2xl sm:text-[2rem] font-semibold tracking-tight text-[#e2e4ec]">
                From borrowers who stayed the course
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {testimonials.map((t, i) => (
                <motion.div key={t.name} {...fadeUp(i * 0.07)}>
                  <div
                    className="h-full rounded-md p-5 sm:p-6 flex flex-col"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className="font-mono text-[10px] text-[#44475a] tracking-[0.1em]">RATING</span>
                      <span className="font-mono text-[10px] font-semibold text-[#5b5fc7]">4.9 / 5.0</span>
                    </div>
                    <p className="text-[13px] leading-[1.7] text-[#7b7f9a] flex-1 mb-5">
                      &ldquo;{t.text}&rdquo;
                    </p>
                    <div className="flex items-end justify-between gap-3 pt-4"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div>
                        <p className="font-semibold text-[13px] text-[#e2e4ec]">{t.name}</p>
                        <p className="font-mono text-[11px] text-[#44475a]">{t.city}</p>
                      </div>
                      <span
                        className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded shrink-0 text-[#5b5fc7]"
                        style={{
                          background: "rgba(91,95,199,0.12)",
                          border: "1px solid rgba(91,95,199,0.2)",
                        }}
                      >
                        {t.saved}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section
          className="px-4 sm:px-6 py-16 sm:py-24"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="max-w-sm mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="rounded-lg overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  backdropFilter: "blur(32px)",
                  boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
                }}
              >
                {/* Terminal bar */}
                <TerminalBar title="pricing.json" />

                <div className="p-7 sm:p-8 text-center">
                  <p className="font-mono text-[11px] text-[#44475a] tracking-[0.12em] uppercase mb-2">ONE_TIME_FEE</p>
                  <p className="font-mono text-[3.5rem] font-bold leading-none tracking-tight mb-1 text-[#e2e4ec]">
                    ₹299
                  </p>
                  <p className="font-mono text-[11px] text-[#44475a] mb-8">
                    Less than most subscription apps.
                  </p>

                  <ul className="text-left space-y-2 mb-8">
                    {[
                      "Full payoff sequence and timeline",
                      "Month-by-month payment schedule",
                      "Interest savings vs. minimums-only",
                      "Safe, Balanced & Aggressive strategy comparison",
                      "Downloadable PDF",
                      "Access tied to your account",
                    ].map((item) => (
                      <li key={item} className="flex gap-2.5 text-[13px]">
                        <span className="font-mono text-[#5b5fc7] shrink-0 mt-0.5 text-[11px]">+</span>
                        <span className="text-[#7b7f9a]">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => navigate("/create-plan")}
                    className="w-full font-mono font-semibold text-[13px] py-3 rounded-md transition-all duration-150 active:scale-[0.99] material-shadow-accent"
                    style={{
                      background: "#5b5fc7",
                      color: "white",
                      border: "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      letterSpacing: "0.04em",
                    }}
                  >
                    [ GET YOUR REPORT NOW ]
                  </button>
                  <p className="font-mono text-[11px] text-[#44475a] mt-3">
                    // pay only when you choose to unlock
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer
          className="px-4 sm:px-6 py-10 text-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="font-mono text-[13px] font-medium text-[#7b7f9a] mb-3">[DZ] debt-zero</p>
          <p className="font-mono text-[12px] text-[#44475a] mb-5">© 2026 Debt Zero. Built for deliberate payoff planning.</p>
          <div className="flex justify-center gap-6 font-mono text-[12px] text-[#44475a]">
            {["Privacy", "Terms", "Support"].map((link) => (
              <button
                type="button"
                key={link}
                className="hover:text-[#7b7f9a] transition-colors cursor-pointer bg-transparent border-0 p-0 font-inherit"
              >
                {link.toLowerCase()}
              </button>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
