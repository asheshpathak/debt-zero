import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { TerminalProgress } from "@/components/TerminalProgress";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { loadRazorpayCheckout } from "@/lib/razorpayLoader";
import { useSearchParams } from "react-router-dom";

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
  { label: "TOTAL_DEBT", value: "₹X,XX,XXX" },
  { label: "DEBT_FREE_DATE", value: "XXX XXXX" },
  { label: "INTEREST_SAVED", value: "₹XX,XXX" },
  { label: "MONTHLY_PLAN", value: "₹XX,XXX" },
  { label: "PAYOFF_MONTHS", value: "XX mo" },
  { label: "STRATEGY", value: "XXXXXXXXX" },
];

export default function Teaser() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const regen = searchParams.get("regen") === "true";
  const [signingIn, setSigningIn] = useState(false);
  const [paying, setPaying] = useState(false);
  /** Razorpay handler → POST /payment/verify (fast now; generation runs in background). */
  const [verifying, setVerifying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paymentTerminalActive = paying || verifying;

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
        { submissionId, regen }
      );

      if (orderRes.data.dev === true) {
        setPaid(true);
        setTimeout(() => navigate(`/dashboard/${submissionId}`), 1200);
        return;
      }

      await loadRazorpayCheckout();

      const options: RazorpayOptions = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderRes.data.amount,
        currency: "INR",
        name: "Debt Zero",
        description: regen ? "Report regeneration" : "Debt payoff roadmap",
        order_id: orderRes.data.orderId,
        prefill: { name: user?.displayName || "", email: user?.email || "" },
        theme: { color: "#5b5fc7" },
        handler: async (response) => {
          setVerifying(true);
          setError(null);
          try {
            await api.post("/payment/verify", {
              submissionId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setPaid(true);
            setTimeout(() => navigate(`/dashboard/${submissionId}`), 1200);
          } catch {
            setError("Payment verification failed. Contact support.");
          } finally {
            setVerifying(false);
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
        <div className="flex items-center gap-3 font-mono text-[13px] text-[#44475a]">
          <Loader2 className="w-4 h-4 text-[#5b5fc7] animate-spin" />
          <span>authenticating...</span>
        </div>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div
            className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#22c55e] mb-4 px-3 py-1 rounded-full inline-flex items-center gap-2"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            PAYMENT_VERIFIED
          </div>
          <h2 className="font-sans text-xl font-semibold text-[#e2e4ec] mb-3">Opening your roadmap</h2>
          <p className="font-mono text-[13px] text-[#44475a]">// redirecting...</p>
          <Loader2 className="w-5 h-5 text-[#5b5fc7] animate-spin mx-auto mt-5" />
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pt-[4.75rem] sm:pt-24 pb-14 px-4"
      style={{ background: "#08080f" }}
    >
      <div className="fixed inset-0 dot-grid pointer-events-none z-0" aria-hidden />

      <div className="relative z-[1] max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          {/* ACCESS RESTRICTED banner */}
          <div
            className="rounded-md px-4 py-3 mb-8 flex items-center gap-3"
            style={{
              background: "rgba(91,95,199,0.08)",
              border: "1px solid rgba(91,95,199,0.2)",
            }}
          >
            <Lock className="w-4 h-4 text-[#5b5fc7] shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-mono text-[11px] font-semibold text-[#5b5fc7] tracking-[0.12em] uppercase">
                ACCESS_RESTRICTED
              </span>
              <span className="font-mono text-[11px] text-[#44475a] ml-3">
                // authenticate and unlock to view full analysis
              </span>
            </div>
          </div>

          <p className="cmd-label mb-2">// report.ready — preview_phase</p>
          <h1 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-[#e2e4ec] mb-2">
            Intake saved — unlock to generate your full roadmap
          </h1>
          <p className="font-mono text-[13px] text-[#44475a]">
            {!user
              ? `// sign in once, then complete ${regen ? "₹99 regen unlock" : "₹299 unlock"} — we run the full payoff synthesis right after payment (not before)`
              : `// pay ${regen ? "₹99" : "₹299"} to run the synthesis and unlock every figure plus PDF export`}
          </p>
        </motion.div>

        {/* Blurred stats + unlock overlay */}
        <div className="relative mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pointer-events-none select-none"
            style={{ filter: "blur(5px)", opacity: 0.7 }}
          >
            {BLURRED_STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-md p-4"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p className="font-mono text-[9px] text-[#44475a] uppercase tracking-[0.14em] font-semibold mb-2">{s.label}</p>
                <p className="font-mono text-[15px] font-semibold text-[#e2e4ec] tabular-nums">[REDACTED]</p>
              </div>
            ))}
          </div>

          {/* Unlock overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="rounded-lg p-6 sm:p-8 text-center w-[min(400px,calc(100%-2rem))]"
              style={{
                background: "linear-gradient(135deg, rgba(15,15,24,0.97) 0%, rgba(8,8,15,0.98) 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
                backdropFilter: "blur(32px)",
              }}
            >
              {/* Terminal bar */}
              <div className="flex items-center gap-1.5 mb-5">
                <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                <span className="font-mono text-[9px] text-[#44475a] tracking-[0.14em] uppercase ml-auto">
                  access_control.sh
                </span>
              </div>

              <p className="font-mono text-[10px] text-[#44475a] tracking-[0.14em] uppercase mb-2">
                {regen ? "REGEN_UNLOCK · ₹99" : "FULL_ACCESS · ₹299"}
              </p>
              <h3 className="font-sans text-[1.1rem] font-semibold text-[#e2e4ec] mb-5">
                Unlock the complete picture
              </h3>

              {!user ? (
                <div className="space-y-3">
                  <div className="font-mono text-[11px] text-[#44475a] text-left mb-3">
                    <span className="text-[#5b5fc7]">$</span> authenticate --provider google
                  </div>
                  <Button
                    className="w-full h-10"
                    variant="glass"
                    onClick={handleSignIn}
                    disabled={signingIn}
                  >
                    {signingIn ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span className="font-mono text-[12px]">authenticating...</span>
                      </>
                    ) : (
                      <span className="font-mono text-[12px]">[ CONTINUE_WITH_GOOGLE ]</span>
                    )}
                  </Button>
                  <p className="font-mono text-[10px] text-[#44475a]">// then complete payment via Razorpay</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="font-mono text-[11px] text-[#44475a] text-left mb-3">
                    <span className="text-[#5b5fc7]">$</span> payment --amount {regen ? "₹99" : "₹299"} --execute
                  </div>
                  <TerminalProgress active={paymentTerminalActive} mode="payment" title="unlock.log" className="mb-2" />
                  <Button
                    className="w-full h-10 font-mono text-[12px] tracking-wider"
                    onClick={handlePayment}
                    disabled={paying || verifying}
                  >
                    {paying || verifying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        {verifying ? "VERIFYING_PAYMENT..." : "REQUESTING_UNLOCK..."}
                      </>
                    ) : (
                      regen ? "[ PAY_₹99_TO_UNLOCK ]" : "[ PAY_₹299_TO_UNLOCK ]"
                    )}
                  </Button>
                </div>
              )}

              {error && (
                <p className="font-mono text-[11px] text-[#f87171] mt-4 text-left">
                  <span className="text-[#ef4444] mr-1">!</span>{error}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Included features */}
        <GlassCard variant="terminal" title="INCLUDED_AFTER_UNLOCK">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
            {[
              "Month-by-month schedule",
              "Debt-free date and totals",
              "Interest avoided vs minimums-only",
              "Payoff ordering",
              "Quick wins flagged by the model",
              "Risk notes where relevant",
              "PDF export",
              "Access from your account",
            ].map((item) => (
              <div key={item} className="flex gap-2.5 py-1 font-mono text-[12px] text-[#7b7f9a]">
                <span className="text-[#5b5fc7] shrink-0">+</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
