import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setOpen(false);
  };

  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      await signInWithGoogle();
      // After sign-in, check for existing plan
      try {
        const res = await api.get<{ id: string; paid: boolean } | null>("/plan/user/latest");
        if (res.data) {
          if (res.data.paid) {
            navigate(`/dashboard/${res.data.id}`);
          } else {
            navigate(`/teaser/${res.data.id}`);
          }
        } else {
          navigate("/create-plan");
        }
      } catch {
        navigate("/create-plan");
      }
    } catch {
      // sign-in cancelled or failed — stay on current page
    } finally {
      setLoggingIn(false);
      setOpen(false);
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div
        className="backdrop-blur-xl"
        style={{
          background: "rgba(8, 8, 15, 0.92)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

          <Link to={user ? "/dashboard" : "/"} className="group">
            <span
              className="text-[24px] font-semibold leading-none group-hover:text-white transition-colors"
              style={{ fontFamily: "Fraunces, Georgia, serif", color: "#e2e4ec" }}
            >
              <span style={{ fontStyle: "normal" }}>Debt</span>
              <span style={{ fontStyle: "italic", color: "#8b8fce" }}>ZERO</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: "#22c55e",
                      boxShadow: "0 0 5px rgba(34,197,94,0.5)",
                    }}
                  />
                  <span className="font-mono text-[12px] max-w-[180px] truncate text-[#7b7f9a]">
                    {user.email}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/settings")}
                  className="font-mono text-[12px]"
                >
                  settings
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="font-mono text-[12px]">
                  sign_out
                </Button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loggingIn || authLoading}
                  className={cn(
                    "font-mono text-[12px] font-medium px-4 py-2 rounded-md transition-all duration-150 active:scale-[0.98]",
                  )}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    color: "#7b7f9a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    cursor: loggingIn || authLoading ? "default" : "pointer",
                    opacity: loggingIn || authLoading ? 0.6 : 1,
                  }}
                >
                  {loggingIn ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      signing in...
                    </span>
                  ) : (
                    "login"
                  )}
                </button>
              </>
            )}
          </nav>

          <button
            type="button"
            className="md:hidden p-2 rounded-md transition-colors border border-white/[0.08] bg-white/[0.03] text-[#7b7f9a] hover:text-[#e2e4ec]"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="md:hidden overflow-hidden backdrop-blur-xl"
            style={{
              background: "rgba(8,8,15,0.97)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="px-4 py-4 flex flex-col gap-2">
              {user ? (
                <>
                  <div
                    className="px-3 py-2.5 rounded-md font-mono text-[12px] text-[#7b7f9a] truncate flex items-center gap-2"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: "#22c55e", boxShadow: "0 0 5px rgba(34,197,94,0.5)" }}
                    />
                    {user.email}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { navigate("/dashboard"); setOpen(false); }}
                    className="justify-start font-mono text-[12px]"
                  >
                    dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { navigate("/settings"); setOpen(false); }}
                    className="justify-start font-mono text-[12px]"
                  >
                    settings
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="justify-start font-mono text-[12px]">
                    sign_out
                  </Button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={loggingIn}
                    className="w-full font-mono text-[13px] py-3 rounded-md transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "#7b7f9a",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {loggingIn ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        signing in...
                      </span>
                    ) : (
                      "[ login ]"
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
