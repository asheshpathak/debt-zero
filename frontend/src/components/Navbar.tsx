import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, TrendingDown, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setOpen(false);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5">
      <div className="backdrop-blur-xl bg-[#0a0a0f]/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#6366f1]/20 border border-[#6366f1]/30 flex items-center justify-center group-hover:bg-[#6366f1]/30 transition-colors">
              <TrendingDown className="w-4 h-4 text-[#6366f1]" />
            </div>
            <span className="font-semibold text-[#f1f5f9]">
              Debt<span className="gradient-text">Clear</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 mr-2">
                  <User className="w-3.5 h-3.5 text-[#94a3b8]" />
                  <span className="text-sm text-[#94a3b8] max-w-[140px] truncate">
                    {user.displayName || user.email}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => navigate("/create-plan")}>
                Get My Plan
              </Button>
            )}
          </nav>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-[#94a3b8] hover:text-white transition-colors p-1"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                    <User className="w-4 h-4 text-[#94a3b8]" />
                    <span className="text-sm text-[#94a3b8] truncate">
                      {user.displayName || user.email}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="justify-start">
                    <LogOut className="w-4 h-4" /> Sign out
                  </Button>
                </>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => { navigate("/create-plan"); setOpen(false); }}
                >
                  Get My Plan — ₹299
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
