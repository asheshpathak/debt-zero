import { useState, useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import type { FormData } from "@/types";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Step1Personal } from "@/components/form-steps/Step1Personal";
import { Step2Income } from "@/components/form-steps/Step2Income";
import { Step3Expenses } from "@/components/form-steps/Step3Expenses";
import { Step4Loans } from "@/components/form-steps/Step4Loans";
import { Step5Cards } from "@/components/form-steps/Step5Cards";
import { Step6Goals } from "@/components/form-steps/Step6Goals";
import { Step7Assets } from "@/components/form-steps/Step7Assets";
import { Step7CreditScore } from "@/components/form-steps/Step7CreditScore";
import { Step9Review } from "@/components/form-steps/Step9Review";
import api from "@/lib/api";
import { defaultExpenseCategories, sumEnabledExpenses } from "@/lib/expenses";
import { defaultAssetCategories } from "@/lib/assets";
import { getDevSampleIntake } from "@/dev/devSampleIntake";
const STEPS = [
  { id: 1, label: "PROFILE", key: "profile" },
  { id: 2, label: "INCOME", key: "income" },
  { id: 3, label: "SPEND", key: "expenses" },
  { id: 4, label: "LOANS", key: "loans" },
  { id: 5, label: "CARDS", key: "cards" },
  { id: 6, label: "TARGETS", key: "targets" },
  { id: 7, label: "ASSETS", key: "assets" },
  { id: 8, label: "CREDIT", key: "credit_score" },
  { id: 9, label: "REVIEW", key: "review" },
];

function buildPayload(raw: FormData): FormData {
  const skipCredit = raw.creditScoreSkipped !== false;
  const income = Number(raw.monthlyIncome);
  return {
    ...raw,
    name: raw.name.trim(),
    city: raw.city.trim(),
    monthlyIncome: income,
    monthlyExpenses: sumEnabledExpenses(raw.expenseCategories),
    loans: (raw.loans ?? []).map((l) => ({
      ...l,
      balance: Number(l.balance) || 0,
      interestRate: l.interestFree ? 0 : Number(l.interestRate) || 0,
      monthlyEmi: Number(l.monthlyEmi) || 0,
      remainingTenureMonths:
        l.remainingTenureMonths === undefined || l.remainingTenureMonths === null
          ? 0
          : Math.max(0, Number(l.remainingTenureMonths)),
    })),
    creditCards: (raw.creditCards ?? []).map((c) => ({
      ...c,
      balance: Number(c.balance) || 0,
      limit: Number(c.limit) || 0,
      interestRate: Number(c.interestRate) || 0,
      minimumPayment: Number(c.minimumPayment) || 0,
    })),
    expenseCategories: raw.expenseCategories ?? defaultExpenseCategories(),
    assetCategories: (raw.assetCategories ?? defaultAssetCategories()).map((c) => ({
      ...c,
      enabled: true,
      amount: Math.max(0, Number(c.amount) || 0),
    })),
    strategy: raw.strategy ?? "balanced",
    extraMonthlyBudget: Math.max(0, Number(raw.extraMonthlyBudget) || 0),
    targetMonths: Math.max(0, Number(raw.targetMonths) || 0),
    creditScoreSkipped: skipCredit,
    creditScoreApprox: skipCredit ? null : (raw.creditScoreApprox ?? null),
    creditScoreBureau: skipCredit ? "" : (raw.creditScoreBureau ?? ""),
  };
}

function getFieldsForStep(step: number, values: FormData): string[] {
  switch (step) {
    case 1:
      return ["name", "city", "age", "gender", "occupation", "maritalStatus"];
    case 2:
      return ["monthlyIncome"];
    case 3: {
      const paths: string[] = [];
      (values.expenseCategories ?? []).forEach((_, i) => {
        paths.push(`expenseCategories.${i}.amount`, `expenseCategories.${i}.enabled`);
      });
      return paths;
    }
    case 4:
      return (values.loans ?? []).flatMap((_, i) => [
        `loans.${i}.name`,
        `loans.${i}.balance`,
        `loans.${i}.interestRate`,
        `loans.${i}.monthlyEmi`,
        `loans.${i}.remainingTenureMonths`,
      ]);
    case 5:
      return (values.creditCards ?? []).flatMap((_, i) => [
        `creditCards.${i}.name`,
        `creditCards.${i}.balance`,
        `creditCards.${i}.interestRate`,
        `creditCards.${i}.minimumPayment`,
      ]);
    case 6:
      return ["extraMonthlyBudget", "targetMonths"];
    case 7:
      return (values.assetCategories ?? []).map((_, i) => `assetCategories.${i}.amount`);
    case 8:
      if (values.creditScoreSkipped) return [];
      return ["creditScoreApprox"];
    default:
      return [];
  }
}

function isStepSatisfied(step: number, v: FormData): boolean {
  switch (step) {
    case 1:
      return !!(
        v.name?.trim() &&
        v.city?.trim() &&
        v.age >= 18 &&
        v.gender &&
        v.occupation?.trim() &&
        v.maritalStatus
      );
    case 2: {
      const inc = Number(v.monthlyIncome);
      return Number.isFinite(inc) && inc >= 1000;
    }
    case 3: {
      for (const row of v.expenseCategories ?? []) {
        if (!row.enabled) continue;
        const amt = Number(row.amount);
        if (!Number.isFinite(amt) || amt <= 0) return false;
      }
      return true;
    }
    case 4: {
      for (const l of v.loans ?? []) {
        if (!l.name?.trim()) return false;
        const bal = Number(l.balance);
        if (!Number.isFinite(bal) || bal < 1) return false;
        const rate = Number(l.interestRate);
        if (l.interestFree) {
          if (rate !== 0) return false;
        } else if (!Number.isFinite(rate) || rate < 0.1) return false;
        const emi = Number(l.monthlyEmi);
        if (l.interestFree) {
          if (l.monthlyEmi === undefined || l.monthlyEmi === null) return true;
          if (!Number.isFinite(emi) || emi < 0) return false;
        } else if (!Number.isFinite(emi) || emi < 1) {
          return false;
        }
        if (l.remainingTenureMonths !== undefined && l.remainingTenureMonths !== null) {
          const ten = Number(l.remainingTenureMonths);
          if (!Number.isFinite(ten) || ten < 0) return false;
        }
      }
      return true;
    }
    case 5: {
      for (const c of v.creditCards ?? []) {
        if (!c.name?.trim()) return false;
        const bal = Number(c.balance);
        if (!Number.isFinite(bal) || bal < 1) return false;
        const rate = Number(c.interestRate);
        if (!Number.isFinite(rate) || rate < 0.1) return false;
        const minp = Number(c.minimumPayment);
        if (!Number.isFinite(minp) || minp < 1) return false;
      }
      return true;
    }
    case 6: {
      const hasDebt = (v.loans?.length ?? 0) > 0 || (v.creditCards?.length ?? 0) > 0;
      if (!hasDebt) return false;
      const ex = Number(v.extraMonthlyBudget);
      if (v.extraMonthlyBudget !== undefined && v.extraMonthlyBudget !== null && (!Number.isFinite(ex) || ex < 0)) {
        return false;
      }
      const tm = Number(v.targetMonths);
      if (v.targetMonths !== undefined && v.targetMonths !== null && (!Number.isFinite(tm) || tm < 0)) {
        return false;
      }
      return true;
    }
    case 7: {
      for (const a of v.assetCategories ?? []) {
        if (a.amount === undefined || a.amount === null) continue;
        const n = Number(a.amount);
        if (!Number.isFinite(n) || n < 0) return false;
      }
      return true;
    }
    case 8: {
      if (v.creditScoreSkipped) return true;
      const sc = Number(v.creditScoreApprox);
      return Number.isFinite(sc) && sc >= 300 && sc <= 900;
    }
    case 9:
      return true;
    default:
      return true;
  }
}

const defaultValues: FormData = {
  name: "",
  city: "",
  age: 18,
  gender: "",
  maritalStatus: "",
  occupation: "",
  expenseCategories: defaultExpenseCategories(),
  assetCategories: defaultAssetCategories(),
  loans: [],
  creditCards: [],
  strategy: "balanced",
  creditScoreSkipped: true,
  creditScoreApprox: undefined,
  creditScoreBureau: "",
};

export default function CreatePlan() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("GENERATING...");
  const [error, setError] = useState<string | null>(null);
  const [existingPlan, setExistingPlan] = useState<{ id: string } | null>(null);
  const [newSubmissionId, setNewSubmissionId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signInWithGoogle } = useAuth();
  const regenMode = searchParams.get("regen") === "1";
  const [reviewArmed, setReviewArmed] = useState(true);

  const methods = useForm<FormData>({ defaultValues, mode: "onChange" });
  const values = methods.watch();

  const canContinue = useMemo(() => isStepSatisfied(step, values), [step, values]);

  useEffect(() => {
    const enabled = import.meta.env.VITE_DEV_SKIP_STEPPER === "1" || import.meta.env.VITE_DEV_SKIP_STEPPER === "true";
    if (!enabled) return;
    const sample = getDevSampleIntake("demo");
    methods.reset(sample);
    // When earlier steps are skipped, some fields may never mount/register, and RHF can omit them.
    // Force-set critical Step 1 fields required by backend validation *after* reset applies.
    setTimeout(() => {
      methods.setValue("gender", sample.gender, { shouldValidate: true, shouldDirty: true });
      methods.setValue("maritalStatus", sample.maritalStatus, { shouldValidate: true, shouldDirty: true });
      setStep(STEPS.length);
      void methods.trigger(["gender", "maritalStatus"]);
    }, 0);
  }, [methods]);

  useEffect(() => {
    if (step !== STEPS.length) return;
    // Prevent the "continue" click from immediately triggering the Generate button
    // due to DOM swap under the cursor on the final step.
    setReviewArmed(false);
    const id = setTimeout(() => setReviewArmed(true), 250);
    return () => clearTimeout(id);
  }, [step]);

  useEffect(() => {
    if (step !== 6) return;
    const hasDebt = (values.loans?.length ?? 0) > 0 || (values.creditCards?.length ?? 0) > 0;
    if (hasDebt && error?.includes("Add at least one loan")) setError(null);
  }, [step, values.loans?.length, values.creditCards?.length, error]);

  const goNext = async () => {
    const vals = methods.getValues();
    if (step === 6) {
      const hasDebt = (vals.loans?.length ?? 0) > 0 || (vals.creditCards?.length ?? 0) > 0;
      if (!hasDebt) {
        setError("Add at least one loan (step 4) or credit card (step 5).");
        return;
      }
      setError(null);
    }
    const fields = getFieldsForStep(step, vals);
    const valid = await methods.trigger(fields as (keyof FormData)[], { shouldFocus: true });
    if (!valid) return;
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const goPrev = () => setStep((s) => Math.max(s - 1, 1));

  const onSubmit = async (_data: FormData) => {
    if (step !== STEPS.length) return;
    // Use form state directly so dev flows that skip mounting earlier steps
    // still include those field values (e.g. gender).
    const payload = buildPayload(methods.getValues());
    if (!payload.loans.length && !payload.creditCards.length) {
      setError("Add at least one loan or credit card before generating.");
      return;
    }

    setLoading(true);
    setError(null);

    // Auth gate: sign in before submitting
    let currentUser = user;
    if (!currentUser) {
      setLoadingLabel("SIGNING IN...");
      try {
        currentUser = await signInWithGoogle();
      } catch {
        setError("Sign-in failed. Please try again.");
        setLoading(false);
        return;
      }
    }

    setLoadingLabel("GENERATING...");
    try {
      const res = await api.post<{ submissionId: string }>("/plan/submit", payload);
      const newId = res.data.submissionId;
      setNewSubmissionId(newId);

      // Check if returning user already has a paid plan
      try {
        const latestRes = await api.get<{ id: string; paid: boolean } | null>("/plan/user/latest");
        if (latestRes.data && latestRes.data.paid && latestRes.data.id !== newId) {
          if (regenMode) {
            navigate(`/teaser/${newId}?regen=true`);
            return;
          } else {
            setExistingPlan({ id: latestRes.data.id });
            setLoading(false);
            return;
          }
        }
      } catch {
        // If endpoint fails, proceed normally
      }

      navigate(`/teaser/${newId}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e?.response?.data?.error || e?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;
  const currentStep = STEPS.find((s) => s.id === step);

  return (
    <div
      className="min-h-screen pt-[4.75rem] sm:pt-24 pb-14 px-4"
      style={{ background: "#08080f" }}
    >
      {/* Returning user — existing paid plan modal */}
      {existingPlan && newSubmissionId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 sm:p-8 relative"
            style={{
              background: "linear-gradient(135deg, rgba(15,15,24,0.98) 0%, rgba(8,8,15,0.99) 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
            }}
          >
            <button
              type="button"
              onClick={() => setExistingPlan(null)}
              className="absolute top-4 right-4 text-[#44475a] hover:text-[#7b7f9a] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5fc7] mb-3">existing_plan_found</p>
            <h3 className="font-sans text-[1.1rem] font-semibold text-[#e2e4ec] mb-2">You already have a plan</h3>
            <p className="font-mono text-[12px] text-[#7b7f9a] leading-relaxed mb-6">
              Your account has an existing paid plan. Would you like to continue to your dashboard, or regenerate with this new data for ₹99?
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate(`/dashboard/${existingPlan.id}`)}
                className="w-full py-3 rounded-xl font-mono text-[12px] font-semibold tracking-wider transition-all"
                style={{
                  background: "#5b5fc7",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                [ CONTINUE TO DASHBOARD ]
              </button>
              <button
                type="button"
                onClick={() => navigate(`/teaser/${newSubmissionId}?regen=true`)}
                className="w-full py-3 rounded-xl font-mono text-[12px] font-semibold tracking-wider transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: "#7b7f9a",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                [ REGENERATE WITH NEW DATA · ₹99 ]
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 dot-grid pointer-events-none z-0" aria-hidden />

      <div className="relative z-[1] max-w-2xl mx-auto">

        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="cmd-label mb-1">// questionnaire</p>
            <h1 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-[#e2e4ec]">
              Debt plan intake
            </h1>
            <p className="font-mono text-[12px] text-[#44475a] mt-1">~9 min end-to-end</p>
          </div>
          <div className="font-mono text-right shrink-0">
            <div className="text-[10px] text-[#44475a] tracking-[0.12em] uppercase mb-1">STEP</div>
            <div className="text-[1.5rem] font-bold text-[#e2e4ec] tabular-nums leading-none">
              {String(step).padStart(2, "0")}
              <span className="text-[#44475a] font-normal text-[1rem]">/{String(STEPS.length).padStart(2, "0")}</span>
            </div>
          </div>
        </div>

        <div className="hidden sm:block mb-8">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => step > s.id && setStep(s.id)}
                  className={`flex flex-col items-center gap-1.5 ${step > s.id ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div
                    className="w-8 h-8 rounded-sm flex items-center justify-center font-mono text-[11px] font-bold transition-all duration-150"
                    style={{
                      background:
                        step === s.id ? "#5b5fc7" : step > s.id ? "rgba(91,95,199,0.12)" : "rgba(255,255,255,0.04)",
                      border:
                        step === s.id
                          ? "1px solid rgba(255,255,255,0.12)"
                          : step > s.id
                            ? "1px solid rgba(91,95,199,0.3)"
                            : "1px solid rgba(255,255,255,0.08)",
                      color: step === s.id ? "white" : step > s.id ? "#8b8fce" : "#44475a",
                    }}
                  >
                    {step > s.id ? "✓" : s.id}
                  </div>
                  <span
                    className="font-mono text-[9px] tracking-[0.14em] font-semibold"
                    style={{ color: step === s.id ? "#e2e4ec" : "#44475a" }}
                  >
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-px mx-1 mb-4 transition-all duration-300"
                    style={{
                      background: step > s.id ? "rgba(91,95,199,0.5)" : "rgba(255,255,255,0.08)",
                    }}
                    aria-hidden
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="sm:hidden mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-mono text-[11px] text-[#7b7f9a] font-semibold tracking-[0.1em]">
              {currentStep?.label}
            </span>
            <span className="font-mono text-[11px] text-[#44475a] tabular-nums">
              {step}/{STEPS.length}
            </span>
          </div>
          <div className="h-px rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full transition-[width] duration-300 ease-out"
              style={{ width: `${progressPct}%`, background: "#5b5fc7" }}
            />
          </div>
        </div>

        <FormProvider {...methods}>
          <form
            onSubmit={(e) => {
              // Submitting the form implicitly (Enter / accidental click) can cause
              // auto-generation as soon as the Review step mounts. Always require
              // an explicit click on the Generate CTA.
              e.preventDefault();
            }}
          >
            <div
              className="rounded-lg overflow-hidden mb-5"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                backdropFilter: "blur(32px) saturate(1.3)",
                WebkitBackdropFilter: "blur(32px) saturate(1.3)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
              }}
            >
              <div
                className="px-4 py-2.5 flex items-center gap-2.5"
                style={{ background: "rgba(0,0,0,0.25)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
                </div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#44475a] ml-auto">
                  form::{currentStep?.key}.json
                </span>
              </div>

              <div className="p-6 sm:p-8 min-h-[340px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.16 }}
                  >
                    {step === 1 && <Step1Personal />}
                    {step === 2 && <Step2Income />}
                    {step === 3 && <Step3Expenses />}
                    {step === 4 && <Step4Loans />}
                    {step === 5 && <Step5Cards />}
                    {step === 6 && <Step6Goals />}
                    {step === 7 && <Step7Assets />}
                    {step === 8 && <Step7CreditScore />}
                    {step === 9 && <Step9Review />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {error && (
              <div
                className="mb-4 rounded-md px-4 py-3 font-mono text-[12px] text-[#f87171]"
                style={{
                  background: "rgba(239,68,68,0.07)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <span className="text-[#ef4444] mr-2">!</span>{error}
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <Button type="button" variant="terminal" size="sm" onClick={goPrev} disabled={step === 1}>
                BACK
              </Button>

              <div className="hidden sm:block font-mono text-[10px] text-[#44475a] tracking-[0.14em] uppercase tabular-nums">
                step {String(step).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
              </div>

              {step < STEPS.length ? (
                <Button
                  type="button"
                  variant="terminal"
                  size="sm"
                  onClick={goNext}
                  disabled={!canContinue || loading}
                >
                  CONTINUE
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={loading || !reviewArmed}
                  className="font-mono tracking-wider"
                  onClick={() => void methods.handleSubmit(onSubmit)()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {loadingLabel}
                    </>
                  ) : (
                    "[ GENERATE_ROADMAP ]"
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
