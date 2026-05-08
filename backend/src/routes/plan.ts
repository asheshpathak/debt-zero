import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { supabase } from "../services/supabase";
import { generateAndPersistPlan } from "../services/generateStoredPlan";
import { formDataForStrategy } from "../utils/financeForm";
import { expandCompactPlan } from "../services/claude";
import type { FormData, PayoffStrategy } from "../types";

const router = Router();

const STRATEGIES: PayoffStrategy[] = ["safe", "balanced", "aggressive"];

interface PlanProfilePayload {
  name: string;
  city: string;
  occupation: string;
}

function profileFromStoredForm(formData: unknown): PlanProfilePayload | null {
  if (!formData || typeof formData !== "object") return null;
  const o = formData as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const city = typeof o.city === "string" ? o.city.trim() : "";
  const occupation = typeof o.occupation === "string" ? o.occupation.trim() : "";
  if (!name && !city && !occupation) return null;
  return { name, city, occupation };
}

function validateSubmissionBody(formData: FormData): string | null {
  if (!formData.name?.trim()) return "Name is required.";
  if (!formData.city?.trim()) return "City is required.";
  if (!formData.age || formData.age < 18) return "Valid age is required.";
  if (!formData.gender) return "Gender is required.";
  if (!formData.occupation?.trim()) return "Occupation is required.";
  const income = Number(formData.monthlyIncome);
  if (!Number.isFinite(income) || income < 1000) return "Valid monthly income is required.";
  const hasLoan = (formData.loans?.length ?? 0) > 0;
  const hasCard = (formData.creditCards?.length ?? 0) > 0;
  if (!hasLoan && !hasCard) return "Add at least one loan or credit card.";

  for (const l of formData.loans ?? []) {
    const bal = Number(l.balance);
    if (!Number.isFinite(bal) || bal < 1) return "Each loan needs a valid outstanding balance greater than zero.";
    const emiRaw = Number(l.monthlyEmi);
    if (l.interestFree) {
      const emi = !Number.isFinite(emiRaw) ? 0 : emiRaw;
      if (emi < 0) {
        return "Interest-free / informal loans need a valid monthly payment (0 is allowed if there is no fixed EMI yet).";
      }
    } else if (!Number.isFinite(emiRaw) || emiRaw < 1) {
      return "Each loan needs a valid monthly EMI greater than zero.";
    }
    const rate = Number(l.interestRate);
    if (l.interestFree) {
      if (rate !== 0) return "Interest-free loans must have 0% rate.";
    } else if (!Number.isFinite(rate) || rate < 0.1) {
      return "Each loan needs a valid interest rate or mark it interest-free.";
    }
    const ten = Number(l.remainingTenureMonths);
    if (l.remainingTenureMonths !== undefined && l.remainingTenureMonths !== null && (!Number.isFinite(ten) || ten < 0)) {
      return "Remaining tenure cannot be negative.";
    }
  }

  for (const c of formData.creditCards ?? []) {
    const bal = Number(c.balance);
    if (!Number.isFinite(bal) || bal < 1) return "Each card needs a valid balance greater than zero.";
    const rate = Number(c.interestRate);
    if (!Number.isFinite(rate) || rate < 0.1) return "Each card needs a valid interest rate.";
    const minp = Number(c.minimumPayment);
    if (!Number.isFinite(minp) || minp < 1) return "Each card needs a valid minimum payment greater than zero.";
  }

  const extra = Number(formData.extraMonthlyBudget);
  if (formData.extraMonthlyBudget !== undefined && formData.extraMonthlyBudget !== null && (!Number.isFinite(extra) || extra < 0)) {
    return "Extra monthly budget cannot be negative.";
  }
  const tm = Number(formData.targetMonths);
  if (formData.targetMonths !== undefined && formData.targetMonths !== null && (!Number.isFinite(tm) || tm < 0)) {
    return "Target months cannot be negative.";
  }

  return null;
}

async function handlePlanSubmit(req: Request, res: Response) {
  const formData = req.body as FormData;
  const errMsg = validateSubmissionBody(formData);
  if (errMsg) {
    res.status(400).json({ error: errMsg });
    return;
  }

  const strategy: PayoffStrategy = STRATEGIES.includes(formData.strategy)
    ? formData.strategy
    : "balanced";

  try {
    const creditSkipped = !(formData.creditScoreSkipped === false);

    const normalized: FormData = {
      ...formData,
      loans: formData.loans ?? [],
      creditCards: formData.creditCards ?? [],
      strategy,
      monthlyExpenses: formDataForStrategy(formData, strategy).monthlyExpenses,
      expenseCategories: formData.expenseCategories ?? [],
      assetCategories: Array.isArray(formData.assetCategories) ? formData.assetCategories : [],
      creditScoreSkipped: creditSkipped,
      creditScoreApprox: creditSkipped ? null : (formData.creditScoreApprox ?? null),
      creditScoreBureau: creditSkipped ? "" : (formData.creditScoreBureau ?? ""),
    };

    const { data: submission, error: subError } = await supabase
      .from("debt_submissions")
      .insert({ form_data: normalized })
      .select("id")
      .single();

    if (subError) throw subError;

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .insert({
        submission_id: submission.id,
        user_id: null,
        paid: false,
        plan_data: null,
      })
      .select("id")
      .single();

    if (planError) throw planError;

    res.json({ submissionId: plan.id });
  } catch (err) {
    console.error("Plan submit error:", err);
    res.status(500).json({ error: "Could not save your intake. Please try again." });
  }
}

router.post("/submit", handlePlanSubmit);

// Legacy path — identical behaviour (intake only; generation after unlock)
router.post("/generate", handlePlanSubmit);

// GET /plan/user/latest — returns the most recent plan for the authenticated user
router.get("/user/latest", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { data: plan, error } = await supabase
      .from("plans")
      .select("id, paid")
      .eq("user_id", req.user!.uid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!plan) {
      res.json(null);
      return;
    }
    res.json({ id: plan.id, paid: plan.paid });
  } catch (err) {
    console.error("User latest plan error:", err);
    res.status(500).json({ error: "Could not fetch latest plan" });
  }
});

// DELETE /plan/user/all — deletes all plans and submissions for the authenticated user
router.delete("/user/all", requireAuth, async (req: AuthRequest, res) => {
  const uid = req.user!.uid;
  try {
    // Get all plan IDs for this user
    const { data: plans } = await supabase
      .from("plans")
      .select("id, submission_id")
      .eq("user_id", uid);

    if (plans && plans.length > 0) {
      const planIds = plans.map((p) => p.id);
      const submissionIds = plans.map((p) => p.submission_id).filter(Boolean);

      // Delete payments linked to these plans
      await supabase.from("payments").delete().in("plan_id", planIds);

      // Delete plans
      await supabase.from("plans").delete().in("id", planIds);

      // Delete submissions
      if (submissionIds.length > 0) {
        await supabase.from("debt_submissions").delete().in("id", submissionIds);
      }
    }

    // Also delete any anonymous plans linked to this user's submissions (safety net)
    await supabase.from("users").delete().eq("firebase_uid", uid);

    res.json({ success: true });
  } catch (err) {
    console.error("Clear user data error:", err);
    res.status(500).json({ error: "Could not clear data" });
  }
});

router.post("/:id/regenerate", requireAuth, async (req: AuthRequest, res) => {
  const raw = req.params.id;
  const id = typeof raw === "string" ? raw : raw?.[0] ?? "";
  const strategy = req.body?.strategy as PayoffStrategy;

  if (!id) {
    res.status(400).json({ error: "Invalid plan id" });
    return;
  }

  if (!strategy || !STRATEGIES.includes(strategy)) {
    res.status(400).json({ error: "Invalid strategy" });
    return;
  }

  try {
    const { data: plan, error } = await supabase.from("plans").select("*").eq("id", id).single();
    if (error || !plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    if (!plan.paid) {
      res.status(403).json({ error: "Plan is not unlocked yet" });
      return;
    }
    if (plan.user_id && plan.user_id !== req.user?.uid) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    await generateAndPersistPlan(id, strategy);

    const { data: updated } = await supabase.from("plans").select("plan_data").eq("id", id).single();
    res.json({ planData: updated?.plan_data ? expandCompactPlan(updated.plan_data) : null });
  } catch (err) {
    console.error("Plan regenerate error:", err);
    res.status(500).json({ error: "Could not rebuild roadmap" });
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const { data: plan, error } = await supabase
      .from("plans")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    if (plan.user_id && plan.user_id !== req.user?.uid) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    let profile: PlanProfilePayload | null = null;
    let formData: unknown = null;
    if (plan.submission_id) {
      const { data: submission } = await supabase
        .from("debt_submissions")
        .select("form_data")
        .eq("id", plan.submission_id)
        .maybeSingle();
      profile = profileFromStoredForm(submission?.form_data);
      formData = submission?.form_data ?? null;
    }

    const planData = plan.paid && plan.plan_data ? expandCompactPlan(plan.plan_data) : null;

    res.json({
      id: plan.id,
      submissionId: plan.submission_id,
      paid: plan.paid,
      planData,
      profile,
      formData: plan.paid ? formData : null,
    });
  } catch (err) {
    console.error("Plan fetch error:", err);
    res.status(500).json({ error: "Could not fetch plan" });
  }
});

export default router;
