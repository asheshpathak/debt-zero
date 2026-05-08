import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlassCard } from "@/components/GlassCard";
import type { FormData } from "@/types";

const loanTypes = [
  { value: "personal", label: "Personal loan" },
  { value: "home", label: "Home loan" },
  { value: "car", label: "Car loan" },
  { value: "education", label: "Education loan" },
  { value: "credit_card_emi", label: "Credit card EMI" },
  { value: "other", label: "Other" },
];

export function Step4Loans() {
  const { register, control, watch, setValue, formState: { errors } } = useFormContext<FormData>();
  const { fields, append, remove } = useFieldArray({ control, name: "loans" });

  const addLoan = () =>
    append({
      id: crypto.randomUUID(),
      name: "",
      balance: undefined,
      interestRate: 12,
      monthlyEmi: undefined,
      remainingTenureMonths: undefined,
      type: "personal",
      isCreditCardEmi: false,
      interestFree: false,
    });

  return (
    <div className="space-y-5">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#64748b] mb-2">Step 4</p>
        <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight text-[#eceef4] mb-2">
          Installments & EMI-style debt
        </h2>
        <p className="text-sm text-[#8b95a8] leading-relaxed">
          Loans, EMI conversions on cards, and interest-free dues you treat like fixed payments.
        </p>
      </div>

      {fields.length === 0 && (
        <GlassCard className="text-center !py-8">
          <p className="text-[#94a3b8] text-sm mb-4">No loans added yet — skip if you only have revolving card balances.</p>
          <Button variant="outline" size="sm" onClick={addLoan} type="button" className="rounded-xl">
            Add loan
          </Button>
        </GlassCard>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => {
          const interestFree = watch(`loans.${index}.interestFree`);
          return (
            <GlassCard key={field.id} className="!p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                  Loan {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-[#475569] hover:text-red-400 transition-colors p-1"
                  aria-label="Remove loan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 items-start">
                <Controller
                  control={control}
                  name={`loans.${index}.isCreditCardEmi`}
                  render={({ field: f }) => (
                    <label className="flex items-center gap-2 text-xs text-[#8b95a8] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!f.value}
                        onChange={(e) => {
                          f.onChange(e.target.checked);
                          if (e.target.checked) setValue(`loans.${index}.type`, "credit_card_emi");
                        }}
                        className="rounded border-[#475569] text-[#5b5fc7]"
                      />
                      This is a credit-card EMI / card loan
                    </label>
                  )}
                />
                <Controller
                  control={control}
                  name={`loans.${index}.interestFree`}
                  render={({ field: f }) => (
                    <label className="flex items-center gap-2 text-xs text-[#8b95a8] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!f.value}
                        onChange={(e) => {
                          f.onChange(e.target.checked);
                          if (e.target.checked) setValue(`loans.${index}.interestRate`, 0);
                        }}
                        className="rounded border-[#475569] text-emerald-500"
                      />
                      Interest-free borrowing (0% dues to family employer etc.)
                    </label>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <Input
                  label="Loan name"
                  placeholder="e.g. SBI Personal Loan"
                  error={errors.loans?.[index]?.name?.message}
                  {...register(`loans.${index}.name`, { required: "Name required" })}
                />
                <Controller
                  control={control}
                  name={`loans.${index}.type`}
                  render={({ field: f }) => (
                    <Select
                      value={f.value}
                      onValueChange={(v) => {
                        f.onChange(v);
                        setValue(`loans.${index}.isCreditCardEmi`, v === "credit_card_emi");
                      }}
                    >
                      <SelectTrigger label="Loan type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {loanTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                <Controller
                  control={control}
                  name={`loans.${index}.balance`}
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
                      placeholder="200000"
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
                  name={`loans.${index}.interestRate`}
                  rules={{
                    validate: (v, values) => {
                      const lf = values.loans?.[index]?.interestFree;
                      const n = Number(v);
                      if (lf) return n === 0 ? true : "Interest-free loans must show 0%";
                      if (!Number.isFinite(n) || n < 0.1) return "Enter a positive rate or mark interest-free";
                      return true;
                    },
                  }}
                  render={({ field: f, fieldState }) => (
                    <Input
                      label={interestFree ? "Rate (locked at 0%)" : "Interest rate (p.a.)"}
                      placeholder={interestFree ? "0" : "12"}
                      type="number"
                      suffix="%"
                      disabled={interestFree}
                      error={fieldState.error?.message}
                      value={interestFree ? 0 : f.value === undefined || f.value === null ? "" : f.value}
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
                  name={`loans.${index}.monthlyEmi`}
                  rules={{
                    validate: (v) => {
                      if (interestFree) {
                        if (v === undefined || v === null || (typeof v === "string" && v === "")) return true;
                        const n = Number(v);
                        if (!Number.isFinite(n) || n < 0) return "Enter 0 or a positive amount";
                        return true;
                      }
                      const n = Number(v);
                      if (!Number.isFinite(n) || n < 1) return "Must be greater than zero";
                      return true;
                    },
                  }}
                  render={({ field: f, fieldState }) => (
                    <Input
                      label={interestFree ? "Monthly payment (0 if no fixed EMI yet)" : "Monthly EMI"}
                      placeholder={interestFree ? "0" : "5000"}
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
                  name={`loans.${index}.remainingTenureMonths`}
                  rules={{
                    validate: (v) => {
                      if (v === undefined || v === null || (typeof v === "string" && v === "")) return true;
                      const n = Number(v);
                      if (!Number.isFinite(n) || n < 0) return "Cannot be negative";
                      return true;
                    },
                  }}
                  render={({ field: f, fieldState }) => (
                    <Input
                      label="Remaining tenure (months)"
                      placeholder="Optional — e.g. 36"
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
            </GlassCard>
          );
        })}
      </div>

      {fields.length > 0 && (
        <Button variant="glass" size="sm" onClick={addLoan} type="button" className="w-full sm:w-auto">
          Add another loan
        </Button>
      )}
    </div>
  );
}
