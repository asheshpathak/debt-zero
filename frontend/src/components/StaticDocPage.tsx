import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

type StaticDocPageProps = {
  label: string;
  title: string;
  children: ReactNode;
};

export function StaticDocPage({ label, title, children }: StaticDocPageProps) {
  return (
    <div
      className="min-h-screen pt-[4.75rem] sm:pt-24 pb-16 px-4 sm:px-6"
      style={{ background: "#08080f" }}
    >
      <div className="fixed inset-0 dot-grid pointer-events-none z-0" aria-hidden />

      <div className="relative z-[1] max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-mono text-[12px] text-[#7b7f9a] hover:text-[#e2e4ec] transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
            back_home
          </Link>

          <p className="cmd-label mb-2">{label}</p>
          <h1 className="font-sans text-2xl sm:text-[1.75rem] font-semibold tracking-tight text-[#e2e4ec] mb-8">
            {title}
          </h1>

          <div
            className="rounded-xl p-6 sm:p-8 space-y-6 text-[14px] leading-[1.75] text-[#7b7f9a]"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
