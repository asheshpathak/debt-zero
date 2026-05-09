import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
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
  "Total debt",
  "Debt-free date",
  "Interest saved",
  "Monthly plan",
  "Payoff timeline",
  "Strategy",
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
        <div className="flex items-center gap-3 font-sans text-[14px] text-[#7b7f9a]">
          <Loader2 className="w-4 h-4 text-[#5b5fc7] animate-spin" />
          <span>Checking your session…</span>
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
            className="font-sans text-[12px] font-medium text-[#86efac] mb-4 px-3 py-1 rounded-full inline-flex items-center gap-2"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            Payment received
          </div>
          <h2 className="font-sans text-xl font-semibold text-[#e2e4ec] mb-3">Opening your roadmap</h2>
          <p className="font-sans text-[14px] text-[#7b7f9a]">Taking you to your dashboard…</p>
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
          {/* Preview banner */}
          <div
            className="rounded-lg px-4 py-3 mb-8 flex items-start gap-3"
            style={{
              background: "rgba(91,95,199,0.08)",
              border: "1px solid rgba(91,95,199,0.2)",
            }}
          >
            <Lock className="w-4 h-4 text-[#5b5fc7] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 text-left">
              <p className="font-sans text-[13px] font-medium text-[#c8cce0] mb-0.5">Preview only</p>
              <p className="font-sans text-[13px] text-[#7b7f9a] leading-relaxed">
                Sign in and complete unlock to run your full payoff analysis and see every figure below.
              </p>
            </div>
          </div>

          <h1 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-[#e2e4ec] mb-3">
            Intake saved — unlock to generate your full roadmap
          </h1>
          <p className="font-sans text-[15px] text-[#7b7f9a] leading-relaxed mb-2">
            {!user ? (
              <>
                Sign in with Google, then pay {regen ? "₹99" : "₹299"} when you&apos;re ready. Your complete plan is generated right after payment—nothing runs until then.
              </>
            ) : (
              <>
                Pay {regen ? "₹99" : "₹299"} to generate your full roadmap, charts, and downloadable PDF.
              </>
            )}
          </p>
        </motion.div>

        {/* Blurred stats + unlock overlay */}
        <div className="relative mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pointer-events-none select-none"
            style={{ filter: "blur(5px)", opacity: 0.7 }}
          >
            {BLURRED_STATS.map((label) => (
              <div
                key={label}
                className="rounded-md p-4"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p className="font-sans text-[12px] font-medium text-[#7b7f9a] mb-2">{label}</p>
                <p className="font-sans text-[15px] font-semibold text-[#5c6078] tabular-nums">Hidden</p>
              </div>
            ))}
          </div>

          {/* Unlock overlay */}
          <div className="absolute inset-0 flex items-center justify-center px-2">
            <div
              className="rounded-xl p-6 sm:p-8 text-center w-[min(400px,calc(100%-2rem))]"
              style={{
                background: "linear-gradient(135deg, rgba(15,15,24,0.97) 0%, rgba(8,8,15,0.98) 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
                backdropFilter: "blur(32px)",
              }}
            >
              <p className="font-sans text-[13px] text-[#7b7f9a] mb-1">
                {regen ? "Report regeneration" : "Full roadmap"} ·{" "}
                <span className="font-semibold text-[#e2e4ec]">{regen ? "₹99" : "₹299"}</span>
              </p>
              <h3 className="font-sans text-[1.1rem] font-semibold text-[#e2e4ec] mb-5">
                Unlock the complete picture
              </h3>

              {!user ? (
                <div className="space-y-3">
                  <p className="font-sans text-[13px] text-[#7b7f9a] text-left leading-relaxed mb-1">
                    Continue with Google—we never post on your behalf.
                  </p>
                  <Button
                    className="w-full h-11 font-sans font-semibold text-[14px]"
                    variant="glass"
                    onClick={handleSignIn}
                    disabled={signingIn}
                  >
                    {signingIn ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>Signing you in…</span>
                      </>
                    ) : (
                      <span>Continue with Google</span>
                    )}
                  </Button>
                  <p className="font-sans text-[12px] text-[#5c6078] leading-relaxed">
                    Next step: secure checkout with Razorpay.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-sans text-[13px] text-[#7b7f9a] text-left leading-relaxed mb-1">
                    Card, UPI, or net banking via Razorpay. Your plan starts generating as soon as payment succeeds.
                  </p>
                  <Button
                    className="w-full h-11 font-sans font-semibold text-[14px]"
                    onClick={handlePayment}
                    disabled={paying || verifying}
                  >
                    {paying || verifying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        {verifying ? "Confirming payment…" : "Opening checkout…"}
                      </>
                    ) : regen ? (
                      "Pay ₹99 to regenerate"
                    ) : (
                      "Pay ₹299 to unlock"
                    )}
                  </Button>
                </div>
              )}

              {error && (
                <p className="font-sans text-[13px] text-[#f87171] mt-4 text-left">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Included features */}
        <GlassCard>
          <h3 className="font-sans text-[14px] font-semibold text-[#e2e4ec] mb-4 text-center sm:text-left">
            Included with your unlock
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
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
              <div key={item} className="flex gap-2.5 py-0.5 font-sans text-[13px] text-[#7b7f9a]">
                <span className="font-semibold text-[#5b5fc7] shrink-0">+</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
