import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#6366f1] text-white hover:bg-[#4f46e5] glow-indigo active:scale-95",
        cyan: "bg-[#06b6d4] text-white hover:bg-[#0891b2] glow-cyan active:scale-95",
        glass:
          "glass text-[#f1f5f9] hover:bg-white/10 border border-white/10 hover:border-white/20 active:scale-95",
        ghost: "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-white/5 active:scale-95",
        destructive:
          "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 active:scale-95",
        outline:
          "border border-[#6366f1]/40 text-[#6366f1] hover:bg-[#6366f1]/10 active:scale-95",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
