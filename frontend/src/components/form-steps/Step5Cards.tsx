import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import type { FormData } from "@/types";

export function Step5Cards() {
  const { register, control, formState: { errors } } = useFormContext<FormData>();
  const { fields, append, remove } = useFieldArray({ control, name: "creditCards" });

  const addCard = () =>
    append({
      id: crypto.randomUUID(),
      name: "",
      balance: undefined,
      limit: undefined,
      interestRate: undefined,
      minimumPayment: undefined,
    });

  return (
    <div className="space-y-5">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#64748b] mb-2">Step 5</p>
        <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight text-[#eceef4] mb-2">
          Revolving credit cards
        </h2>
        <p className="text-sm text-[#8b95a8] leading-relaxed">
          Card balances you revolve (not already converted to EMI in the previous step).
        </p>
      </div>

      {fields.length === 0 && (
        <GlassCard className="text-center !py-8">
          <p className="text-[#94a3b8] text-sm mb-4">No revolving cards — skip if balances are EMI-only.</p>
          <Button variant="outline" size="sm" onClick={addCard} type="button" className="rounded-xl">
            Add card
          </Button>
        </GlassCard>
      )}

      {fields.length > 0 && (
        <GlassCard className="!p-4 !rounded-xl border border-[#5b5fc7]/20" glow="none">
          <p className="text-xs font-semibold text-[#b4b9f5] uppercase tracking-[0.12em] mb-2">What is “minimum monthly payment”?</p>
          <p className="text-xs text-[#8b95a8] leading-relaxed">
            It is the smallest amount the issuer requires you to pay by the due date—often a percentage of the balance (e.g. 5%) or a floor (e.g. ₹500), whichever is higher. Paying only this amount keeps you in debt longer and accrues more interest. Enter the number shown on your statement or app under “minimum due”; if unsure, estimate from last month&apos;s bill.
          </p>
        </GlassCard>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => (
          <GlassCard key={field.id} className="!p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                Card {index + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-[#475569] hover:text-red-400 transition-colors p-1"
                aria-label="Remove card"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <Input
              label="Card / issuer"
              placeholder="e.g. HDFC Diners Club"
              error={errors.creditCards?.[index]?.name?.message}
              {...register(`creditCards.${index}.name`, { required: "Name required" })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              <Controller
                control={control}
                name={`creditCards.${index}.balance`}
                rules={{
                  validate: (v) => {
                    const n = Number(v);
                    if (!Number.isFinite(n) || n < 1) return "Must be greater than zero";
                    return true;
                  },
                }}
                render={({ field: f, fieldState }) => (
                  <Input
                    label="Outstanding balance"
                    placeholder="45000"
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
                name={`creditCards.${index}.limit`}
                render={({ field: f }) => (
                  <Input
                    label="Credit limit"
                    placeholder="100000"
                    type="number"
                    prefix="₹"
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
                name={`creditCards.${index}.interestRate`}
                rules={{
                  validate: (v) => {
                    const n = Number(v);
                    if (!Number.isFinite(n) || n < 0.1) return "Must be greater than zero";
                    return true;
                  },
                }}
                render={({ field: f, fieldState }) => (
                  <Input
                    label="Interest rate (p.a.)"
                    placeholder="36"
                    type="number"
                    suffix="%"
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
                name={`creditCards.${index}.minimumPayment`}
                rules={{
                  validate: (v) => {
                    const n = Number(v);
                    if (!Number.isFinite(n) || n < 1) return "Must be greater than zero";
                    return true;
                  },
                }}
                render={({ field: f, fieldState }) => (
                  <Input
                    label="Minimum monthly payment"
                    placeholder="2250"
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
            </div>
          </GlassCard>
        ))}
      </div>

      {fields.length > 0 && (
        <Button variant="glass" size="sm" onClick={addCard} type="button" className="w-full sm:w-auto">
          Add another card
        </Button>
      )}
    </div>
  );
}
