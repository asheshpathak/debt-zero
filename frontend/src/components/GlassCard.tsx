import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: "accent" | "none";
  variant?: "default" | "terminal";
  title?: string;
  onClick?: () => void;
}

export function GlassCard({
  children,
  className,
  glow = "none",
  variant = "default",
  title,
  onClick,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-lg overflow-hidden",
        "transition-all duration-200",
        glow === "accent" && "ring-1 ring-[#5b5fc7]/20",
        onClick && "cursor-pointer hover:ring-1 hover:ring-white/[0.1]",
        className
      )}
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        backdropFilter: "blur(32px) saturate(1.3)",
        WebkitBackdropFilter: "blur(32px) saturate(1.3)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: glow === "accent"
          ? "0 8px 24px rgba(91,95,199,0.18), 0 2px 8px rgba(0,0,0,0.4)"
          : "0 4px 16px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.3)",
      }}
    >
      {/* Top edge highlight */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: "8%",
          right: "8%",
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
          pointerEvents: "none",
        }}
      />

      {variant === "terminal" && (
        <div className="terminal-bar">
          <div className="terminal-bar-dot" />
          <div className="terminal-bar-dot" />
          <div className="terminal-bar-dot" />
          {title && (
            <span className="terminal-bar-title">{title}</span>
          )}
        </div>
      )}

      <div className={cn("relative z-[1]", variant === "default" ? "p-5 sm:p-6" : "p-5 sm:p-6")}>
        {children}
      </div>
    </div>
  );
}
