import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FormData } from "@/types";

export function Step1Personal() {
  const { register, control, formState: { errors } } = useFormContext<FormData>();

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#64748b] mb-2">Step 1</p>
        <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight text-[#eceef4] mb-2">
          About you
        </h2>
        <p className="text-sm text-[#8b95a8] leading-relaxed">
          We&apos;re getting to know you—this context helps tailor your roadmap and stress-test the numbers against your situation (not sold or shared).
        </p>
      </div>

      <Input
        label="Full name"
        placeholder="e.g. Rahul Kumar"
        error={errors.name?.message}
        {...register("name", { required: "Please enter your name" })}
      />

      <Input
        label="City"
        placeholder="e.g. Mumbai"
        error={errors.city?.message}
        {...register("city", { required: "City is required" })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Age"
          placeholder="32"
          type="number"
          error={errors.age?.message}
          {...register("age", {
            required: "Age is required",
            valueAsNumber: true,
            min: { value: 18, message: "Must be at least 18" },
            max: { value: 120, message: "Please enter a valid age" },
          })}
        />

        <Controller
          control={control}
          name="gender"
          rules={{ required: "Select an option" }}
          render={({ field }) => (
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <SelectTrigger label="Gender" error={errors.gender?.message}>
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="non_binary">Non-binary</SelectItem>
                <SelectItem value="prefer_not_say">Prefer not to say</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          )}
        />

        <Input
          label="Occupation"
          placeholder="e.g. Software engineer"
          error={errors.occupation?.message}
          {...register("occupation", { required: "Occupation is required" })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Controller
          control={control}
          name="maritalStatus"
          rules={{ required: "Marital status is required" }}
          render={({ field }) => (
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <SelectTrigger label="Marital status" error={errors.maritalStatus?.message}>
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="married">Married</SelectItem>
                <SelectItem value="divorced">Divorced</SelectItem>
                <SelectItem value="widowed">Widowed</SelectItem>
                <SelectItem value="separated">Separated</SelectItem>
              </SelectContent>
            </Select>
          )}
        />

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 flex items-start gap-3">
          <span className="text-[#5b5fc7] text-[11px] font-mono mt-0.5 shrink-0">i</span>
          <p className="text-xs text-[#64748b] leading-relaxed">
            Marital status helps us surface relevant expense categories (e.g. child care) and tailor your roadmap context.
          </p>
        </div>
      </div>
    </div>
  );
}
