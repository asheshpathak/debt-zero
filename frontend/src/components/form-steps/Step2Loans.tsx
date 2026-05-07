import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlassCard } from "@/components/GlassCard";
import type { FormData } from "@/types";
import { Controller } from "react-hook-form";

const loanTypes = [
  { value: "personal", label: "Personal Loan" },
  { value: "home", label: "Home Loan" },
  { value: "car", label: "Car Loan" },
  { value: "education", label: "Education Loan" },
  { value: "other", label: "Other" },
];

export function Step2Loans() {
  const { register, control, formState: { errors } } = useFormContext<FormData>();
  const { fields, append, remove } = useFieldArray({ control, name: "loans" });

  const addLoan = () =>
    append({ id: crypto.randomUUID(), name: "", balance: 0, interestRate: 0, monthlyEmi: 0, type: "personal" });

  return (
    <div className="space-y-5">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/15 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-7 h-7 text-rose-400" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Your Loans</h2>
        <p className="text-sm text-[#94a3b8]">Add all active loans. Skip this step if you have none.</p>
      </div>

      {fields.length === 0 && (
        <GlassCard className="text-center !py-8">
          <p className="text-[#94a3b8] text-sm mb-4">No loans added yet</p>
          <Button variant="outline" size="sm" onClick={addLoan} type="button">
            <Plus className="w-4 h-4" /> Add your first loan
          </Button>
        </GlassCard>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => (
          <GlassCard key={field.id} className="!p-4 space-y-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Loan Name"
                placeholder="e.g. HDFC Personal Loan"
                error={errors.loans?.[index]?.name?.message}
                {...register(`loans.${index}.name`, { required: "Name required" })}
              />
              <Controller
                control={control}
                name={`loans.${index}.type`}
                render={({ field: f }) => (
                  <Select onValueChange={f.onChange} defaultValue={f.value}>
                    <SelectTrigger label="Loan Type">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Outstanding Balance"
                placeholder="200000"
                type="number"
                prefix="₹"
                error={errors.loans?.[index]?.balance?.message}
                {...register(`loans.${index}.balance`, {
                  required: "Required",
                  valueAsNumber: true,
                  min: { value: 1, message: "Must be > 0" },
                })}
              />
              <Input
                label="Interest Rate (p.a.)"
                placeholder="12"
                type="number"
                suffix="%"
                error={errors.loans?.[index]?.interestRate?.message}
                {...register(`loans.${index}.interestRate`, {
                  required: "Required",
                  valueAsNumber: true,
                  min: { value: 0.1, message: "Must be > 0" },
                })}
              />
              <Input
                label="Monthly EMI"
                placeholder="5000"
                type="number"
                prefix="₹"
                error={errors.loans?.[index]?.monthlyEmi?.message}
                {...register(`loans.${index}.monthlyEmi`, {
                  required: "Required",
                  valueAsNumber: true,
                  min: { value: 1, message: "Must be > 0" },
                })}
              />
            </div>
          </GlassCard>
        ))}
      </div>

      {fields.length > 0 && (
        <Button variant="glass" size="sm" onClick={addLoan} type="button" className="w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Add another loan
        </Button>
      )}
    </div>
  );
}
