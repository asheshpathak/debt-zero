import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/GlassCard";
import type { FormData } from "@/types";

export function Step2Income() {
  const { control } = useFormContext<FormData>();

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#64748b] mb-2">Step 2</p>
        <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight text-[#eceef4] mb-2">
          Cash-flow snapshot · income
        </h2>
        <p className="text-sm text-[#8b95a8] leading-relaxed">
          Household take-home you can rely on monthly (after tax and fixed salary deductions).
        </p>
      </div>

      <Controller
        control={control}
        name="monthlyIncome"
        rules={{
          validate: (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return "Income is required";
            if (n < 1000) return "Must be at least ₹1,000";
            return true;
          },
        }}
        render={({ field, fieldState }) => (
          <Input
            label="Monthly take-home income"
            placeholder="85000"
            type="number"
            prefix="₹"
            error={fieldState.error?.message}
            value={field.value === undefined || field.value === null ? "" : field.value}
            onChange={(e) => {
              const raw = e.target.value;
              field.onChange(raw === "" ? undefined : Number(raw));
            }}
            onBlur={field.onBlur}
            name={field.name}
            ref={field.ref}
          />
        )}
      />

      <GlassCard className="!p-4 !rounded-xl" glow="none">
        <p className="text-xs text-[#8b95a8] leading-relaxed">
          <span className="text-[#dce1ea] font-medium">Next step. </span>
          You&apos;ll break down spending by category so the model can suggest realistic cuts—not a single vague “expenses” bucket.
        </p>
      </GlassCard>
    </div>
  );
}
