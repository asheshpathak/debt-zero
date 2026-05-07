import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: "indigo" | "cyan" | "none";
  onClick?: () => void;
}

export function GlassCard({ children, className, glow = "none", onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "glass rounded-2xl p-5 sm:p-6",
        glow === "indigo" && "glow-indigo neon-border-indigo",
        glow === "cyan" && "glow-cyan neon-border-cyan",
        onClick && "cursor-pointer hover:bg-white/8 transition-all duration-200",
        className
      )}
    >
      {children}
    </div>
  );
}
