import { useFormContext } from "react-hook-form";
import { Wallet, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/GlassCard";
import type { FormData } from "@/types";

export function Step1Income() {
  const { register, formState: { errors } } = useFormContext<FormData>();

  return (
    <div className="space-y-5">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-[#6366f1]/15 flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-7 h-7 text-[#6366f1]" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Your Financial Picture</h2>
        <p className="text-sm text-[#94a3b8]">
          Tell us your monthly income and expenses so we can calculate your available debt budget.
        </p>
      </div>

      <Input
        label="Your Name"
        placeholder="e.g. Rahul Kumar"
        error={errors.name?.message}
        {...register("name", { required: "Please enter your name" })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative">
          <Input
            label="Monthly Income (take-home)"
            placeholder="50000"
            type="number"
            prefix="₹"
            error={errors.monthlyIncome?.message}
            {...register("monthlyIncome", {
              required: "Income is required",
              valueAsNumber: true,
              min: { value: 1000, message: "Must be at least ₹1,000" },
            })}
          />
        </div>

        <div className="relative">
          <Input
            label="Monthly Expenses (rent, food, etc.)"
            placeholder="25000"
            type="number"
            prefix="₹"
            error={errors.monthlyExpenses?.message}
            {...register("monthlyExpenses", {
              required: "Expenses are required",
              valueAsNumber: true,
              min: { value: 0, message: "Cannot be negative" },
            })}
          />
        </div>
      </div>

      <GlassCard className="!p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-xs text-[#94a3b8]">
            <span className="text-emerald-400 font-medium">Why we ask: </span>
            Your available surplus (income minus expenses minus EMIs) determines how aggressively
            you can pay down debt. AI uses this to build a realistic, not aspirational, plan.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
