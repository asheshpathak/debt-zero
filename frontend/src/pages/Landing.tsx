import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Shield, Zap, Lock, TrendingDown, Brain, FileText,
  CheckCircle2, IndianRupee, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";

const features = [
  {
    icon: Brain,
    title: "Claude AI Analysis",
    desc: "Powered by Anthropic's Claude — the same AI used by fortune 500 companies.",
    color: "text-[#6366f1]",
    bg: "bg-[#6366f1]/10",
  },
  {
    icon: Shield,
    title: "100% Private",
    desc: "No humans see your data. Zero-doc, zero judgement, fully automated.",
    color: "text-[#06b6d4]",
    bg: "bg-[#06b6d4]/10",
  },
  {
    icon: Zap,
    title: "Instant Roadmap",
    desc: "Get a step-by-step payoff plan in under 60 seconds.",
    color: "text-[#a855f7]",
    bg: "bg-[#a855f7]/10",
  },
  {
    icon: FileText,
    title: "PDF Report",
    desc: "Download your personalized debt-free blueprint to keep forever.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: TrendingDown,
    title: "Avalanche & Snowball",
    desc: "Choose your strategy. We calculate the optimal payoff sequence.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    icon: Lock,
    title: "Bank-Grade Security",
    desc: "Your data is encrypted and never sold or shared with third parties.",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
];

const steps = [
  { num: "01", title: "Enter your debts", desc: "Loans, credit cards, interest rates — all in one form." },
  { num: "02", title: "AI builds your plan", desc: "Claude analyses your full financial picture instantly." },
  { num: "03", title: "Unlock & download", desc: "Pay once, own your personalised debt-free roadmap forever." },
];

const testimonials = [
  { name: "Priya S.", city: "Mumbai", text: "Cleared ₹4.2L of debt in 14 months using this plan. Worth every rupee." },
  { name: "Rahul K.", city: "Bangalore", text: "No bank, no advisor, no embarrassment. Just a clear plan that actually worked." },
  { name: "Anita M.", city: "Delhi", text: "The avalanche strategy saved me ₹38,000 in interest. Incredible." },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 px-4 overflow-hidden">
        {/* Orbs */}
        <div className="orb w-[500px] h-[500px] bg-[#6366f1] -top-40 -left-40 sm:-left-20" />
        <div className="orb w-[400px] h-[400px] bg-[#06b6d4] top-20 -right-32" />
        <div className="orb w-[300px] h-[300px] bg-[#a855f7] bottom-0 left-1/2 -translate-x-1/2" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-[#6366f1]/30 text-xs text-[#94a3b8] mb-6">
              <Star className="w-3 h-3 text-[#6366f1] fill-[#6366f1]" />
              AI-Powered · Zero Human Interaction · Private
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight text-balance mb-6">
              Become <span className="gradient-text">Debt-Free</span>
              <br className="hidden sm:block" /> without talking to{" "}
              <br className="sm:hidden" />
              anyone
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-[#94a3b8] max-w-2xl mx-auto text-balance mb-10">
              Enter your loans and credit cards. Claude AI builds your personalised
              step-by-step payoff roadmap in seconds. No advisor, no bank, no judgement.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="xl"
                className="w-full sm:w-auto group"
                onClick={() => navigate("/create-plan")}
              >
                Create My Free Plan
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>No credit card to start. Pay only ₹299 to unlock.</span>
              </div>
            </div>
          </motion.div>

          {/* Hero dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-14 relative"
          >
            <div className="glass rounded-2xl border border-white/10 p-4 sm:p-6 max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
                <span className="ml-2 text-xs text-[#475569]">Your Debt Dashboard</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Total Debt", val: "₹8,40,000", color: "text-rose-400" },
                  { label: "Debt-Free Date", val: "Mar 2027", color: "text-emerald-400" },
                  { label: "Interest Saved", val: "₹1,23,400", color: "text-[#06b6d4]" },
                  { label: "Monthly Plan", val: "₹28,500", color: "text-[#6366f1]" },
                  { label: "Progress", val: "0%", color: "text-[#a855f7]" },
                  { label: "Payoff Method", val: "Avalanche", color: "text-orange-400" },
                ].map((item) => (
                  <div key={item.label} className="glass-bright rounded-xl p-3">
                    <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">{item.label}</p>
                    <p className={`text-base sm:text-lg font-bold font-mono ${item.color}`}>{item.val}</p>
                  </div>
                ))}
              </div>
              {/* Blurred overlay hint */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-[#0a0a0f]/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-[#94a3b8]">
                  <Lock className="w-3 h-3 text-[#6366f1]" />
                  Unlock your real plan for ₹299
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
              How it <span className="gradient-text">works</span>
            </h2>
            <p className="text-[#94a3b8]">Three steps to financial freedom</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <GlassCard className="text-center h-full">
                  <span className="text-4xl font-bold gradient-text font-mono">{step.num}</span>
                  <h3 className="text-lg font-semibold mt-3 mb-2">{step.title}</h3>
                  <p className="text-sm text-[#94a3b8]">{step.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
              Everything you <span className="gradient-text">need</span>
            </h2>
            <p className="text-[#94a3b8]">Built for the privacy-conscious Indian borrower</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <GlassCard className="h-full">
                  <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h3 className="font-semibold mb-1.5">{f.title}</h3>
                  <p className="text-sm text-[#94a3b8]">{f.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-24 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
              People who got <span className="gradient-text">debt-free</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="h-full">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-[#94a3b8] mb-4 italic">"{t.text}"</p>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-[#475569]">{t.city}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <GlassCard glow="indigo" className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#6366f1]/15 flex items-center justify-center mx-auto mb-5">
                <IndianRupee className="w-7 h-7 text-[#6366f1]" />
              </div>
              <div className="mb-1 text-[#94a3b8] text-sm">One-time payment</div>
              <div className="text-5xl font-bold gradient-text font-mono mb-1">₹299</div>
              <div className="text-xs text-[#475569] mb-6">Less than a coffee. Worth thousands in savings.</div>
              <ul className="text-sm text-[#94a3b8] space-y-2 mb-8 text-left max-w-xs mx-auto">
                {[
                  "Full AI-generated payoff roadmap",
                  "Month-by-month schedule",
                  "Debt-free date calculator",
                  "Interest savings analysis",
                  "Downloadable PDF report",
                  "Lifetime access to your plan",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button size="lg" className="w-full group" onClick={() => navigate("/create-plan")}>
                Start for Free — Pay to Unlock
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <p className="text-xs text-[#475569] mt-3">
                Fill the form free. Pay ₹299 only when you're ready to see your plan.
              </p>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 text-center text-sm text-[#475569]">
        <div className="flex items-center justify-center gap-2 mb-2">
          <TrendingDown className="w-4 h-4 text-[#6366f1]" />
          <span className="font-semibold text-[#94a3b8]">DebtClear</span>
        </div>
        <p>© 2026 DebtClear. Privacy-first debt management.</p>
        <div className="flex justify-center gap-4 mt-3">
          <span className="hover:text-[#94a3b8] cursor-pointer transition-colors">Privacy</span>
          <span className="hover:text-[#94a3b8] cursor-pointer transition-colors">Terms</span>
          <span className="hover:text-[#94a3b8] cursor-pointer transition-colors">Support</span>
        </div>
      </footer>
    </div>
  );
}
