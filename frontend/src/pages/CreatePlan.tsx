import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Step1Income } from "@/components/form-steps/Step1Income";
import { Step2Loans } from "@/components/form-steps/Step2Loans";
import { Step3Cards } from "@/components/form-steps/Step3Cards";
import { Step4Goals } from "@/components/form-steps/Step4Goals";
import { Step5Review } from "@/components/form-steps/Step5Review";
import api from "@/lib/api";
import type { FormData } from "@/types";

const STEPS = [
  { id: 1, label: "Income", short: "01" },
  { id: 2, label: "Loans", short: "02" },
  { id: 3, label: "Cards", short: "03" },
  { id: 4, label: "Goals", short: "04" },
  { id: 5, label: "Review", short: "05" },
];

const defaultValues: FormData = {
  name: "",
  monthlyIncome: 0,
  monthlyExpenses: 0,
  loans: [],
  creditCards: [],
  strategy: "avalanche",
  extraMonthlyBudget: 0,
  targetMonths: 0,
};

export default function CreatePlan() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const methods = useForm<FormData>({ defaultValues, mode: "onChange" });

  const goNext = async () => {
    const fields = getFieldsForStep(step);
    const valid = await methods.trigger(fields as (keyof FormData)[]);
    if (!valid) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const goPrev = () => setStep((s) => Math.max(s - 1, 1));

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ submissionId: string }>("/plan/generate", data);
      navigate(`/teaser/${res.data.submissionId}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e?.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      {/* Background orbs */}
      <div className="orb w-[400px] h-[400px] bg-[#6366f1] -top-20 -right-32 opacity-10" />
      <div className="orb w-[300px] h-[300px] bg-[#06b6d4] bottom-20 -left-24 opacity-10" />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Build Your Debt Plan</h1>
          <p className="text-sm text-[#94a3b8]">5 quick steps · Takes under 3 minutes</p>
        </div>

        {/* Step indicator — desktop */}
        <div className="hidden sm:flex items-center justify-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => step > s.id && setStep(s.id)}
                className={`flex flex-col items-center gap-1 group ${step > s.id ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                  ${step === s.id ? "bg-[#6366f1] text-white glow-indigo scale-110" : ""}
                  ${step > s.id ? "bg-[#6366f1]/30 text-[#6366f1] border border-[#6366f1]/50" : ""}
                  ${step < s.id ? "bg-white/5 text-[#475569] border border-white/10" : ""}
                `}>
                  {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                </div>
                <span className={`text-[10px] font-medium uppercase tracking-wider transition-colors
                  ${step === s.id ? "text-[#f1f5f9]" : "text-[#475569]"}`}>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-px mx-2 mb-4 transition-colors ${step > s.id ? "bg-[#6366f1]/50" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step indicator — mobile dots */}
        <div className="flex sm:hidden items-center justify-center gap-2 mb-6">
          {STEPS.map((s) => (
            <div key={s.id} className={`
              rounded-full transition-all duration-300
              ${step === s.id ? "w-6 h-2 bg-[#6366f1]" : step > s.id ? "w-2 h-2 bg-[#6366f1]/50" : "w-2 h-2 bg-white/15"}
            `} />
          ))}
          <span className="ml-2 text-xs text-[#475569]">Step {step} of {STEPS.length}</span>
        </div>

        {/* Form card */}
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <div className="glass rounded-2xl border border-white/8 p-5 sm:p-8 mb-5 min-h-[360px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.2 }}
                >
                  {step === 1 && <Step1Income />}
                  {step === 2 && <Step2Loans />}
                  {step === 3 && <Step3Cards />}
                  {step === 4 && <Step4Goals />}
                  {step === 5 && <Step5Review />}
                </motion.div>
              </AnimatePresence>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/8 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Nav buttons */}
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="glass"
                onClick={goPrev}
                disabled={step === 1}
                className="w-full sm:w-auto"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>

              <div className="hidden sm:block text-xs text-[#475569]">
                {step} / {STEPS.length}
              </div>

              {step < STEPS.length ? (
                <Button type="button" onClick={goNext} className="w-full sm:w-auto">
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#6366f1] to-[#06b6d4] hover:opacity-90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating your plan…
                    </>
                  ) : (
                    <>
                      Generate My Plan
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}

function getFieldsForStep(step: number): string[] {
  switch (step) {
    case 1: return ["name", "monthlyIncome", "monthlyExpenses"];
    case 2: return ["loans"];
    case 3: return ["creditCards"];
    case 4: return ["strategy"];
    default: return [];
  }
}
