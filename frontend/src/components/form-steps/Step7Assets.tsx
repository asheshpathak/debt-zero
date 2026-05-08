import { useFormContext, Controller, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/GlassCard";
import type { AssetCategoryKey, FormData } from "@/types";
import { sumEnabledAssets } from "@/lib/assets";

const LABELS: Record<AssetCategoryKey, string> = {
  cash: "Cash & cash equivalents",
  savings: "Savings (savings accounts, FDs earmarked as savings)",
  investments: "Investments (MFs, stocks, ETFs, etc.)",
  security_fund: "Emergency / safety fund",
  property: "Property (home equity / land — rough market value − loan if you net it mentally)",
  gold: "Gold (jewellery, coins, ETFs — approximate value)",
  others: "Other assets",
};

export function Step7Assets() {
  const { control, watch } = useFormContext<FormData>();
  const { fields } = useFieldArray({ control, name: "assetCategories" });
  const categories = watch("assetCategories");
  const total = sumEnabledAssets(categories);

  return (
    <div className="space-y-5">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#64748b] mb-2">Step 7</p>
        <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight text-[#eceef4] mb-2">
          Asset declaration
        </h2>
        <p className="text-sm text-[#8b95a8] leading-relaxed">
          Enter a rough current value (₹) for each bucket you hold. Leave a row blank if that category doesn&apos;t apply—every line stays editable.
        </p>
      </div>

      <div className="rounded-lg px-4 py-3 mb-4 border border-white/[0.08] bg-white/[0.03]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b] mb-1">Declared total</p>
        <p className="font-mono text-lg text-[#dce1ea] tabular-nums">₹{total.toLocaleString("en-IN")}</p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => {
          const key = field.key as AssetCategoryKey;
          return (
            <GlassCard key={field.id} className="!p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0 sm:pt-2">
                  <p className="text-sm font-medium text-[#eceef4] leading-snug">{LABELS[key]}</p>
                  <p className="text-[11px] text-[#64748b] mt-1.5">Approximate value today (₹)</p>
                </div>
                <div className="w-full sm:max-w-[13rem] shrink-0 min-w-0">
                  <Controller
                    control={control}
                    name={`assetCategories.${index}.amount`}
                    rules={{
                      validate: (v) => {
                        if (v === undefined || v === null) return true;
                        const n = Number(v);
                        if (Number.isNaN(n)) return "Enter a valid number";
                        if (n < 0) return "Cannot be negative";
                        return true;
                      },
                    }}
                    render={({ field: f, fieldState }) => (
                      <Input
                        id={`asset-amount-${key}-${index}`}
                        label="Est. value"
                        placeholder="Amount"
                        type="number"
                        inputMode="decimal"
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
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <GlassCard className="!p-4 !rounded-xl" glow="none">
        <p className="text-xs text-[#8b95a8] leading-relaxed">
          <span className="text-[#dce1ea] font-medium">For the model. </span>
          Every non-zero line is sent to your roadmap as structured context (cash vs gold vs property, etc.)—no need for perfect appraisal numbers.
        </p>
      </GlassCard>
    </div>
  );
}
