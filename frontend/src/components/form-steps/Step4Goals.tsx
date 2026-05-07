import { useFormContext, Controller } from "react-hook-form";
import { Target, TrendingDown, Snowflake, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/GlassCard";
import { cn } from "@/lib/utils";
import type { FormData } from "@/types";

export function Step4Goals() {
  const { register, control, formState: { errors } } = useFormContext<FormData>();

  return (
    <div className="space-y-5">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
          <Target className="w-7 h-7 text-emerald-400" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Your Payoff Goals</h2>
        <p className="text-sm text-[#94a3b8]">Choose your strategy and any extra budget you can commit.</p>
      </div>

      {/* Strategy picker */}
      <div>
        <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-3">Payoff Strategy</p>
        <Controller
          control={control}
          name="strategy"
          render={({ field }) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Avalanche */}
              <button
                type="button"
                onClick={() => field.onChange("avalanche")}
                className={cn(
                  "glass rounded-xl p-4 text-left border-2 transition-all duration-200",
                  field.value === "avalanche"
                    ? "border-[#6366f1]/60 glow-indigo bg-[#6366f1]/8"
                    : "border-transparent hover:border-white/15"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#6366f1]/20 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-[#6366f1]" />
                  </div>
                  <span className="font-semibold text-sm">Avalanche</span>
                  {field.value === "avalanche" && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#6366f1]/20 text-[#6366f1]">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#94a3b8]">
                  Pay off highest-interest debt first. Saves the most money overall.
                </p>
                <p className="text-xs text-emerald-400 mt-1 font-medium">Best for: Minimising total interest</p>
              </button>

              {/* Snowball */}
              <button
                type="button"
                onClick={() => field.onChange("snowball")}
                className={cn(
                  "glass rounded-xl p-4 text-left border-2 transition-all duration-200",
                  field.value === "snowball"
                    ? "border-[#06b6d4]/60 glow-cyan bg-[#06b6d4]/8"
                    : "border-transparent hover:border-white/15"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#06b6d4]/20 flex items-center justify-center">
                    <Snowflake className="w-4 h-4 text-[#06b6d4]" />
                  </div>
                  <span className="font-semibold text-sm">Snowball</span>
                  {field.value === "snowball" && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#06b6d4]/20 text-[#06b6d4]">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#94a3b8]">
                  Pay off smallest balance first. Builds momentum with quick wins.
                </p>
                <p className="text-xs text-[#06b6d4] mt-1 font-medium">Best for: Staying motivated</p>
              </button>
            </div>
          )}
        />
        {errors.strategy && (
          <p className="text-xs text-red-400 mt-1">{errors.strategy.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Extra Monthly Budget (optional)"
          placeholder="5000"
          type="number"
          prefix="₹"
          error={errors.extraMonthlyBudget?.message}
          {...register("extraMonthlyBudget", {
            valueAsNumber: true,
            min: { value: 0, message: "Cannot be negative" },
          })}
        />
        <Input
          label="Target: Debt-free in (months, optional)"
          placeholder="36"
          type="number"
          suffix="mo"
          {...register("targetMonths", { valueAsNumber: true })}
        />
      </div>

      <GlassCard className="!p-4">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-[#06b6d4] mt-0.5 shrink-0" />
          <p className="text-xs text-[#94a3b8]">
            <span className="text-[#06b6d4] font-medium">Pro tip: </span>
            Even ₹1,000 extra per month can shave months off your payoff timeline and save
            thousands in interest. Claude will show you the exact impact.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
