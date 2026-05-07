import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { generateDebtPlan } from "../services/claude";
import { supabase } from "../services/supabase";
import type { FormData } from "../types";

const router = Router();

// POST /plan/generate — no auth required (generates plan, stores it, returns submissionId)
router.post("/generate", async (req, res) => {
  const formData: FormData = req.body;

  if (!formData.monthlyIncome || (!formData.loans?.length && !formData.creditCards?.length)) {
    res.status(400).json({ error: "Please provide income and at least one debt." });
    return;
  }

  try {
    // Store submission
    const { data: submission, error: subError } = await supabase
      .from("debt_submissions")
      .insert({ form_data: formData })
      .select("id")
      .single();

    if (subError) throw subError;

    // Generate plan with Claude
    const planData = await generateDebtPlan(formData);

    // Store plan (unpaid initially)
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .insert({
        submission_id: submission.id,
        user_id: null,
        paid: false,
        plan_data: planData,
      })
      .select("id")
      .single();

    if (planError) throw planError;

    res.json({ submissionId: plan.id });
  } catch (err) {
    console.error("Plan generation error:", err);
    res.status(500).json({ error: "Failed to generate plan. Please try again." });
  }
});

// GET /plan/:id — auth required, plan must be paid
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

    // If plan has a user_id, verify ownership
    if (plan.user_id && plan.user_id !== req.user?.uid) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    res.json({
      id: plan.id,
      submissionId: plan.submission_id,
      paid: plan.paid,
      planData: plan.paid ? plan.plan_data : null,
    });
  } catch (err) {
    console.error("Plan fetch error:", err);
    res.status(500).json({ error: "Could not fetch plan" });
  }
});

export default router;
