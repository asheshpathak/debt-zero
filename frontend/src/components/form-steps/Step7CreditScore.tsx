import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/GlassCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FormData } from "@/types";

export function Step7CreditScore() {
  const { register, control, watch, clearErrors, setValue, formState: { errors } } = useFormContext<FormData>();
  const skipped = watch("creditScoreSkipped");

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#64748b] mb-2">Step 8</p>
        <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight text-[#eceef4] mb-2">
          Credit score (optional)
        </h2>
        <p className="text-sm text-[#8b95a8] leading-relaxed">
          We do <span className="text-[#dce1ea] font-medium">not</span> need your credit report or any bureau login—only an approximate score
          {" "}
          if you already know it (from CIBIL, Experian, CRIF High Mark, or something your bank showed you). Not knowing yours is completely fine—skip whenever you prefer.
        </p>
      </div>

      <GlassCard className="!p-4 !rounded-xl border border-white/[0.06]" glow="none">
        <p className="text-xs text-[#8b95a8] leading-relaxed">
          We never fetch your bureau file from here; a rough number helps the model contextualise refinancing or consolidation language. You can omit this entirely.
        </p>
      </GlassCard>

      <Controller
        control={control}
        name="creditScoreSkipped"
        render={({ field }) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                field.onChange(true);
                setValue("creditScoreApprox", undefined);
                setValue("creditScoreBureau", "");
                clearErrors(["creditScoreApprox"]);
              }}
              className={cn(
                "rounded-xl p-5 text-left border transition-colors duration-200",
                field.value === true
                  ? "border-[#5b5fc7]/55 bg-[#5b5fc7]/[0.07]"
                  : "border-transparent bg-white/[0.03] hover:border-white/[0.09]"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-semibold text-[15px] text-[#eceef4]">Skip</span>
                {field.value === true && (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b4b9f5] shrink-0">Selected</span>
                )}
              </div>
              <p className="text-xs text-[#8b95a8] leading-relaxed">
                Your roadmap still runs without a score—we never pull your bureau file. Skip if you don&apos;t know the number or prefer not to say; you can always add it later if you want richer refinancing context.
              </p>
            </button>

            <button
              type="button"
              onClick={() => field.onChange(false)}
              className={cn(
                "rounded-xl p-5 text-left border transition-colors duration-200",
                field.value === false
                  ? "border-cyan-500/45 bg-cyan-500/[0.07]"
                  : "border-transparent bg-white/[0.03] hover:border-white/[0.09]"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-semibold text-[15px] text-[#eceef4]">Enter approximate score</span>
                {field.value === false && (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-300/95 shrink-0">Selected</span>
                )}
              </div>
              <p className="text-xs text-[#8b95a8] leading-relaxed">
                Rough number from SMS, email, banking app, or a past disclosure—you don&apos;t need the PDF report.
              </p>
            </button>
          </div>
        )}
      />

      {!skipped && (
        <div className="space-y-4 pt-2">
          <Controller
            control={control}
            name="creditScoreBureau"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger label="Source (optional)">
                  <SelectValue placeholder="Bureau (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unsure">Not sure / varies</SelectItem>
                  <SelectItem value="cibil">CIBIL</SelectItem>
                  <SelectItem value="experian">Experian</SelectItem>
                  <SelectItem value="crif">CRIF High Mark</SelectItem>
                </SelectContent>
              </Select>
            )}
          />

          <Input
            label="Approximate score"
            placeholder="e.g. 758"
            type="number"
            error={errors.creditScoreApprox?.message}
            {...register("creditScoreApprox", {
              setValueAs: (v) => {
                if (v === "" || v === null || v === undefined) return undefined;
                const n = Number(v);
                return Number.isNaN(n) ? undefined : n;
              },
              validate: (v, values) => {
                if (values.creditScoreSkipped) return true;
                if (v === undefined || Number.isNaN(Number(v))) return "Enter a score or choose Skip";
                const n = Number(v);
                if (n < 300 || n > 900) return "Typical bureau range is roughly 300–900";
                return true;
              },
            })}
          />

          <p className="text-[11px] text-[#64748b] leading-relaxed">
            If your lender shows a slightly different band, enter the nearest whole number and pick “not sure” for source if unsure.
          </p>
        </div>
      )}
    </div>
  );
}
