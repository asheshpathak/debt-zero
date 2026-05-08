import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";

export default function Settings() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [clearDone, setClearDone] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#5b5fc7] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-mono text-[13px] text-[#44475a] mb-4">// sign in to access settings</p>
          <Button onClick={() => navigate("/")} variant="outline" size="sm" className="font-mono text-[12px]">
            [ GO HOME ]
          </Button>
        </div>
      </div>
    );
  }

  const handleClearData = async () => {
    setClearing(true);
    setClearError(null);
    try {
      await api.delete("/plan/user/all");
      setClearDone(true);
      setConfirmOpen(false);
      await signOut();
      setTimeout(() => navigate("/"), 1500);
    } catch {
      setClearError("Could not clear data. Please try again.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div
      className="min-h-screen pt-[4.75rem] sm:pt-24 pb-14 px-4"
      style={{ background: "#08080f" }}
    >
      <div className="fixed inset-0 dot-grid pointer-events-none z-0" aria-hidden />

      <div className="relative z-[1] max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="cmd-label mb-2">// settings</p>
          <h1 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-[#e2e4ec] mb-8">
            Account settings
          </h1>

          {/* Account info */}
          <div
            className="rounded-xl p-5 mb-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b] mb-3">Account</p>
            <div className="flex items-center gap-2.5 mb-1">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: "#22c55e", boxShadow: "0 0 5px rgba(34,197,94,0.5)" }}
              />
              <span className="font-mono text-[13px] text-[#dce1ea]">{user.email}</span>
            </div>
            {user.displayName && (
              <p className="font-mono text-[12px] text-[#44475a] ml-4.5">{user.displayName}</p>
            )}
          </div>

          {/* Sign out */}
          <div
            className="rounded-xl p-5 mb-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b] mb-3">Session</p>
            <p className="text-sm text-[#7b7f9a] mb-4 leading-relaxed">
              Sign out of your current session. Your plans are saved and accessible when you log back in.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => { await signOut(); navigate("/"); }}
              className="font-mono text-[12px]"
            >
              [ SIGN OUT ]
            </Button>
          </div>

          {/* Danger zone — clear data */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "rgba(239,68,68,0.04)",
              border: "1px solid rgba(239,68,68,0.15)",
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ef4444]/70 mb-3">Danger zone</p>
            <p className="text-sm text-[#7b7f9a] mb-4 leading-relaxed">
              Permanently delete all your plan data, submissions, and payment history. This cannot be undone. You will be signed out immediately after.
            </p>

            {clearDone ? (
              <div className="flex items-center gap-2 font-mono text-[12px] text-[#22c55e]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                Data cleared. Redirecting…
              </div>
            ) : confirmOpen ? (
              <div className="space-y-3">
                <div
                  className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                  style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                  <p className="font-mono text-[11px] text-[#fca5a5] leading-relaxed">
                    This will permanently delete all plans and submissions. Type confirm and click delete.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={clearing}
                    onClick={handleClearData}
                    className="font-mono text-[11px] tracking-wider gap-2"
                    style={{ background: "#ef4444", border: "none" }}
                  >
                    {clearing ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" />CLEARING...</>
                    ) : (
                      "[ CONFIRM DELETE ]"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmOpen(false)}
                    className="font-mono text-[11px]"
                  >
                    cancel
                  </Button>
                </div>
                {clearError && (
                  <p className="font-mono text-[11px] text-[#f87171]">
                    <span className="text-[#ef4444] mr-1">!</span>{clearError}
                  </p>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmOpen(true)}
                className="font-mono text-[12px] border-red-500/30 text-red-400/80 hover:text-red-400 hover:border-red-500/50"
              >
                [ CLEAR ALL DATA ]
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
