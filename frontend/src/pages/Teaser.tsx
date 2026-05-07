import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Globe, Loader2, CheckCircle2, ArrowRight, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
}

const BLURRED_STATS = [
  { label: "Total Debt", value: "₹X,XX,XXX", color: "text-rose-400" },
  { label: "Debt-Free Date", value: "XXX XXXX", color: "text-emerald-400" },
  { label: "Interest Saved", value: "₹XX,XXX", color: "text-[#06b6d4]" },
  { label: "Monthly Plan", value: "₹XX,XXX", color: "text-[#6366f1]" },
  { label: "Payoff Months", value: "XX months", color: "text-[#a855f7]" },
  { label: "Strategy", value: "XXXXXXXXX", color: "text-orange-400" },
];

export default function Teaser() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setSigningIn(false);
    }
  };

  const handlePayment = async () => {
    setPaying(true);
    setError(null);
    try {
      const orderRes = await api.post<{ orderId: string; amount: number; dev?: boolean }>(
        "/payment/order",
        { submissionId }
      );

      if (orderRes.data.dev) {
        setPaid(true);
        setTimeout(() => navigate(`/dashboard/${submissionId}`), 1500);
        return;
      }

      const options: RazorpayOptions = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderRes.data.amount,
        currency: "INR",
        name: "DebtClear",
        description: "AI Debt Restructuring Plan",
        order_id: orderRes.data.orderId,
        prefill: { name: user?.displayName || "", email: user?.email || "" },
        theme: { color: "#6366f1" },
        handler: async (response) => {
          try {
            await api.post("/payment/verify", {
              submissionId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setPaid(true);
            setTimeout(() => navigate(`/dashboard/${submissionId}`), 1500);
          } catch {
            setError("Payment verification failed. Contact support.");
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      setError("Could not initiate payment. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#6366f1] animate-spin" />
      </div>
    );
  }

  if (paid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
          <p className="text-[#94a3b8]">Opening your personalised dashboard…</p>
          <Loader2 className="w-5 h-5 text-[#6366f1] animate-spin mx-auto mt-4" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="orb w-[350px] h-[350px] bg-[#6366f1] top-10 -left-32" />
      <div className="orb w-[300px] h-[300px] bg-rose-500 bottom-10 -right-24" />

      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-emerald-500/30 text-xs text-emerald-400 mb-4">
            <CheckCircle2 className="w-3 h-3" />
            Your plan is ready!
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Claude has built your <span className="gradient-text">debt-free roadmap</span>
          </h1>
          <p className="text-[#94a3b8] text-sm">
            {!user ? "Sign in and pay ₹299 to unlock your personalised plan." : "Pay ₹299 to unlock your full plan."}
          </p>
        </motion.div>

        {/* Blurred preview */}
        <div className="relative mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 filter blur-[6px] pointer-events-none select-none">
            {BLURRED_STATS.map((s) => (
              <GlassCard key={s.label}>
                <p className="text-xs text-[#475569] uppercase tracking-wider mb-1">{s.label}</p>
                <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
              </GlassCard>
            ))}
          </div>

          {/* Paywall overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="glass-bright rounded-2xl p-6 sm:p-8 text-center max-w-sm mx-4 border border-[#6366f1]/30 glow-indigo">
              <div className="w-12 h-12 rounded-full bg-[#6366f1]/20 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-[#6366f1]" />
              </div>
              <h3 className="font-bold text-lg mb-1">Your plan is locked</h3>
              <p className="text-sm text-[#94a3b8] mb-4">
                {user ? `Logged in as ${user.displayName}. ` : ""}
                Unlock full access for ₹299.
              </p>

              {!user ? (
                <div className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={handleSignIn}
                    disabled={signingIn}
                    variant="glass"
                  >
                    {signingIn ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                    ) : (
                      <><Globe className="w-4 h-4" /> Continue with Google</>
                    )}
                  </Button>
                  <p className="text-xs text-[#475569]">Sign in first, then pay to unlock</p>
                </div>
              ) : (
                <Button
                  className="w-full bg-gradient-to-r from-[#6366f1] to-[#06b6d4]"
                  onClick={handlePayment}
                  disabled={paying}
                  size="lg"
                >
                  {paying ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Opening payment…</>
                  ) : (
                    <>
                      Unlock for ₹299 <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}

              {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
            </div>
          </div>
        </div>

        {/* What's inside */}
        <GlassCard>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-[#6366f1]" />
            What's inside your plan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {[
              "Month-by-month payoff schedule",
              "Exact debt-free date",
              "Total interest you'll save",
              "Priority order for clearing debts",
              "Quick win opportunities",
              "Risk warnings & alerts",
              "Downloadable PDF report",
              "Lifetime access",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-[#94a3b8]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
