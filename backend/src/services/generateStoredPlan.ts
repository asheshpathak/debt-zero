import type { FormData, PayoffStrategy } from "../types";
import { computeAllStrategies } from "./amortization";
import { generateNarrative } from "./claudeNarrative";
import { assemblePlanData } from "./planAssembler";
import { supabase } from "./supabase";

export { formDataForStrategy } from "../utils/financeForm";

/**
 * Generates a full three-strategy plan (math computed locally, one Claude call for narrative)
 * and persists it. The `strategy` param sets `defaultStrategy` in the stored plan.
 * Keeps the same signature as the old version so no routes need changing.
 */
export async function generateAndPersistPlan(planId: string, strategy: PayoffStrategy): Promise<void> {
  const { data: plan, error: planErr } = await supabase
    .from("plans")
    .select("submission_id")
    .eq("id", planId)
    .single();

  if (planErr || !plan?.submission_id) throw planErr || new Error("Plan not found");

  const { data: submission, error: subErr } = await supabase
    .from("debt_submissions")
    .select("form_data")
    .eq("id", plan.submission_id)
    .single();

  if (subErr || !submission?.form_data) throw subErr || new Error("Submission not found");

  const formData = submission.form_data as FormData;

  const t0 = Date.now();
  console.log(`[generate] plan=${planId} defaultStrategy=${strategy} — computing amortization`);

  // Step 1: Deterministic math (no API call)
  const computed = computeAllStrategies(formData);
  console.log(`[generate] plan=${planId} amortization done in ${((Date.now() - t0) / 1000).toFixed(2)}s`);

  // Step 2: One Claude call for narrative (~1,500 tokens max)
  const t1 = Date.now();
  const narrative = await generateNarrative(formData, computed, strategy);
  console.log(`[generate] plan=${planId} narrative done in ${((Date.now() - t1) / 1000).toFixed(2)}s`);

  // Step 3: Assemble PlanDataV2
  const planData = assemblePlanData(computed, narrative, strategy);

  // Step 4: Upsert to plans table
  const { error: updErr } = await supabase
    .from("plans")
    .update({ plan_data: planData })
    .eq("id", planId);

  if (updErr) throw updErr;

  console.log(`[generate] plan=${planId} persisted — total ${((Date.now() - t0) / 1000).toFixed(2)}s`);
}
