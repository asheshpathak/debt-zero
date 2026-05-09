import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/GlassCard";
import type { FormData } from "@/types";

export function Step6Goals() {
  const { control } = useFormContext<FormData>();

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#64748b] mb-2">Step 6</p>
        <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight text-[#eceef4] mb-2">
          Targets & extra firepower
        </h2>
        <p className="text-sm text-[#8b95a8] leading-relaxed">
          Comparing payoff priorities and timing across strategies is unlocked <em className="not-italic text-[#dce1ea]">after</em> you open the full report—so you&apos;re not forced to guess early.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <Controller
          control={control}
          name="extraMonthlyBudget"
          rules={{
            validate: (v) => {
              if (v === undefined || v === null) return true;
              const n = Number(v);
              if (!Number.isFinite(n) || n < 0) return "Cannot be negative";
              return true;
            },
          }}
          render={({ field: f, fieldState }) => (
            <Input
              label="Extra toward debt each month (optional)"
              placeholder="5000"
              type="number"
              prefix="₹"
              error={fieldState.error?.message}
              value={f.value === undefined || f.value === null ? "" : f.value}
              onChange={(e) => {
                const raw = e.target.value;
                f.onChange(raw === "" ? undefined : Number(raw));
              }}
              onBlur={f.onBlur}
              name={f.name}
              ref={f.ref}
            />
          )}
        />
        <Controller
          control={control}
          name="targetMonths"
          rules={{
            validate: (v) => {
              if (v === undefined || v === null) return true;
              const n = Number(v);
              if (!Number.isFinite(n) || n < 0) return "Cannot be negative";
              return true;
            },
          }}
          render={({ field: f, fieldState }) => (
            <Input
              label="Target months to debt-free (optional)"
              placeholder="36"
              type="number"
              suffix="mo"
              error={fieldState.error?.message}
              value={f.value === undefined || f.value === null ? "" : f.value}
              onChange={(e) => {
                const raw = e.target.value;
                f.onChange(raw === "" ? undefined : Number(raw));
              }}
              onBlur={f.onBlur}
              name={f.name}
              ref={f.ref}
            />
          )}
        />
      </div>

      <GlassCard className="!p-4 !rounded-xl" glow="none">
        <p className="text-xs text-[#8b95a8] leading-relaxed">
          <span className="text-[#dce1ea] font-medium">Heads-up. </span>
          After unlock you&apos;ll get the full roadmap with every payoff sequence pre-computed—compare Safe, Balanced, and Aggressive payoff orders on the dashboard without waiting on a new generation.
        </p>
      </GlassCard>
    </div>
  );
}
