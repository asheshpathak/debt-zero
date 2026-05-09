import { useFormContext, Controller, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/GlassCard";
import type { ExpenseCategoryKey, FormData } from "@/types";
import { sumEnabledExpenses, EXPENSE_CATEGORY_LABELS } from "@/lib/expenses";

export function Step3Expenses() {
  const { control, watch } = useFormContext<FormData>();
  const { fields } = useFieldArray({ control, name: "expenseCategories" });
  const categories = watch("expenseCategories");
  const maritalStatus = watch("maritalStatus");
  const total = sumEnabledExpenses(categories);

  return (
    <div className="space-y-5">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#64748b] mb-2">Step 3</p>
        <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight text-[#eceef4] mb-2">
          Spending pattern
        </h2>
        <p className="text-sm text-[#8b95a8] leading-relaxed">
          Each bucket is separate. Toggle off anything that doesn&apos;t apply—unused categories don&apos;t count toward totals.
        </p>
      </div>

      <div className="rounded-lg px-4 py-3 mb-4 border border-white/[0.08] bg-white/[0.03]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b] mb-1">Rolling total</p>
        <p className="font-mono text-lg text-[#dce1ea] tabular-nums">₹{total.toLocaleString("en-IN")}</p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => {
          const key = field.key as ExpenseCategoryKey;

          // Child care only visible when marital status is married
          if (key === "child_care" && maritalStatus !== "married") return null;

          const enabled = watch(`expenseCategories.${index}.enabled`);
          return (
            <GlassCard key={field.id} className="!p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <Controller
                  control={control}
                  name={`expenseCategories.${index}.enabled`}
                  render={({ field: f }) => (
                    <label className="flex items-center gap-3 cursor-pointer select-none pt-0.5">
                      <input
                        type="checkbox"
                        checked={!!f.value}
                        onChange={(e) => f.onChange(e.target.checked)}
                        className="rounded border-[#475569] text-[#5b5fc7] focus:ring-[#5b5fc7]/40"
                      />
                      <span className="text-sm font-medium text-[#eceef4]">{EXPENSE_CATEGORY_LABELS[key]}</span>
                    </label>
                  )}
                />
                <div className={`w-full sm:w-48 sm:shrink-0 min-w-0 ${enabled ? "" : "opacity-40 pointer-events-none"}`}>
                  <Controller
                    control={control}
                    name={`expenseCategories.${index}.amount`}
                    rules={{
                      validate: (v, formValues) => {
                        const row = formValues.expenseCategories[index];
                        if (!row.enabled) return true;
                        if (v === undefined || v === null || Number.isNaN(Number(v))) return "Enter amount";
                        if (Number(v) <= 0) return "Enter an amount greater than zero";
                        return true;
                      },
                    }}
                    render={({ field: f, fieldState }) => (
                      <Input
                        label="Monthly"
                        placeholder="Amount"
                        type="number"
                        prefix="₹"
                        disabled={!enabled}
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
              </div>
            </GlassCard>
          );
        })}
      </div>

      <GlassCard className="!p-4 !rounded-xl" glow="none">
        <p className="text-xs text-[#8b95a8] leading-relaxed">
          <span className="text-[#dce1ea] font-medium">Why categories. </span>
          Debt plans fail when "expenses" hide flexible spend. Separate lines let the roadmap call out plausible trims (subscriptions, discretionary, dining, etc.).
        </p>
      </GlassCard>
    </div>
  );
}
