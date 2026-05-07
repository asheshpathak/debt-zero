import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import type { FormData } from "@/types";

export function Step3Cards() {
  const { register, control, formState: { errors } } = useFormContext<FormData>();
  const { fields, append, remove } = useFieldArray({ control, name: "creditCards" });

  const addCard = () =>
    append({ id: crypto.randomUUID(), name: "", balance: 0, limit: 0, interestRate: 36, minimumPayment: 0 });

  return (
    <div className="space-y-5">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/15 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-7 h-7 text-orange-400" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Credit Cards</h2>
        <p className="text-sm text-[#94a3b8]">Add cards with an outstanding balance. Skip if you have none.</p>
      </div>

      {fields.length === 0 && (
        <GlassCard className="text-center !py-8">
          <p className="text-[#94a3b8] text-sm mb-4">No credit cards added yet</p>
          <Button variant="outline" size="sm" onClick={addCard} type="button">
            <Plus className="w-4 h-4" /> Add a credit card
          </Button>
        </GlassCard>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => (
          <GlassCard key={field.id} className="!p-4 space-y-3">
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
              label="Card / Bank Name"
              placeholder="e.g. HDFC Millennia Credit Card"
              error={errors.creditCards?.[index]?.name?.message}
              {...register(`creditCards.${index}.name`, { required: "Name required" })}
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label="Outstanding Balance"
                placeholder="45000"
                type="number"
                prefix="₹"
                error={errors.creditCards?.[index]?.balance?.message}
                {...register(`creditCards.${index}.balance`, {
                  required: "Required",
                  valueAsNumber: true,
                  min: { value: 1, message: "Must be > 0" },
                })}
              />
              <Input
                label="Credit Limit"
                placeholder="100000"
                type="number"
                prefix="₹"
                {...register(`creditCards.${index}.limit`, { valueAsNumber: true })}
              />
              <Input
                label="Interest Rate (p.a.)"
                placeholder="36"
                type="number"
                suffix="%"
                error={errors.creditCards?.[index]?.interestRate?.message}
                {...register(`creditCards.${index}.interestRate`, {
                  required: "Required",
                  valueAsNumber: true,
                  min: { value: 0.1, message: "Must be > 0" },
                })}
              />
              <Input
                label="Min. Monthly Payment"
                placeholder="2000"
                type="number"
                prefix="₹"
                error={errors.creditCards?.[index]?.minimumPayment?.message}
                {...register(`creditCards.${index}.minimumPayment`, {
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
        <Button variant="glass" size="sm" onClick={addCard} type="button" className="w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Add another card
        </Button>
      )}
    </div>
  );
}
