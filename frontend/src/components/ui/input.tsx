import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
  prompt?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, prefix, suffix, prompt = false, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="cmd-label"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center group">
          {prompt && (
            <span className="absolute left-3 font-mono text-[#5b5fc7] text-sm font-semibold select-none pointer-events-none z-10">
              &gt;
            </span>
          )}
          {!prompt && prefix && (
            <span className="absolute left-3 text-[#7b7f9a] text-sm font-mono select-none pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "w-full border bg-[#0f0f18] text-sm font-mono text-[#e2e4ec] placeholder:text-[#44475a]",
              "rounded-md px-3 py-2.5",
              "border-white/[0.08] focus:border-[#5b5fc7]/60 focus:bg-[#161622]",
              "focus:outline-none focus:ring-1 focus:ring-[#5b5fc7]/30",
              "transition-all duration-150",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              prompt && "pl-7",
              !prompt && prefix && "pl-8",
              suffix && "pr-8",
              error && "border-[#ef4444]/40 focus:border-[#ef4444]/60 focus:ring-[#ef4444]/20",
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-[#7b7f9a] text-sm font-mono select-none pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        {error && (
          <p className="font-mono text-[11px] text-[#f87171] tracking-wide">
            <span className="text-[#ef4444]/70 mr-1">!</span>{error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
