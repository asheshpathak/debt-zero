import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, prefix, suffix, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-[#94a3b8] text-sm font-mono select-none">
              {prefix}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[#f1f5f9] font-mono placeholder:text-[#475569]",
              "focus:outline-none focus:border-[#6366f1]/60 focus:bg-white/8 focus:ring-1 focus:ring-[#6366f1]/30",
              "transition-all duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              prefix && "pl-8",
              suffix && "pr-8",
              error && "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/20",
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-[#94a3b8] text-sm font-mono select-none">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
