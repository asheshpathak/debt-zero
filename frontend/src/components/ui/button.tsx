import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b5fc7] focus-visible:ring-offset-1 focus-visible:ring-offset-[#08080f] disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#5b5fc7] text-white hover:bg-[#4f52b2] active:bg-[#4448a0] rounded-lg material-shadow-accent active:scale-[0.98]",
        outline:
          "border border-[#5b5fc7]/50 text-[#8b8fce] hover:border-[#5b5fc7] hover:text-[#a8acef] hover:bg-[#5b5fc7]/08 rounded-lg active:scale-[0.98]",
        ghost:
          "text-[#7b7f9a] hover:text-[#e2e4ec] hover:bg-white/[0.05] rounded-lg active:scale-[0.97]",
        terminal:
          "font-mono text-[#7b7f9a] border border-white/[0.1] hover:border-white/[0.2] hover:text-[#e2e4ec] bg-transparent rounded-sm tracking-wider uppercase active:scale-[0.98] before:content-['['] before:mr-1 before:text-[#5b5fc7] after:content-[']'] after:ml-1 after:text-[#5b5fc7]",
        destructive:
          "bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/25 hover:bg-[#ef4444]/22 rounded-lg active:scale-[0.97]",
        glass:
          "glass text-[#e2e4ec] hover:border-white/[0.12] hover:bg-white/[0.07] rounded-lg active:scale-[0.97]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7 px-3 text-xs",
        lg: "h-11 px-6 text-[15px]",
        xl: "h-13 px-8 text-base",
        icon: "h-9 w-9",
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
