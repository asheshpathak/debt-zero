import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { razorpay, verifySignature } from "../services/razorpay";
import { supabase } from "../services/supabase";
import { generateAndPersistPlan } from "../services/generateStoredPlan";
import type { FormData, PayoffStrategy } from "../types";

const router = Router();
const PLAN_PRICE_PAISE = 29900; // ₹299
const REGEN_PRICE_PAISE = 9900; // ₹99

const STRATEGIES: PayoffStrategy[] = ["safe", "balanced", "aggressive"];

export type FinalizePaidOrderResult =
  | { ok: true }
  | { ok: false; reason: "missing_row" | "already_paid" };

export async function finalizePaidOrder(opts: {
  planId: string;
  firebaseUid: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  kind: "initial" | "regen";
  userEmail?: string | null;
  userName?: string | null;
}): Promise<FinalizePaidOrderResult> {
  const {
    planId,
    firebaseUid,
    razorpay_order_id,
    razorpay_payment_id,
    kind,
    userEmail,
    userName,
  } = opts;

  const { data: payRow } = await supabase
    .from("payments")
    .select("status")
    .eq("razorpay_order_id", razorpay_order_id)
    .maybeSingle();

  if (!payRow) {
    return { ok: false, reason: "missing_row" };
  }
  if (payRow.status === "paid") {
    return { ok: false, reason: "already_paid" };
  }

  if (kind === "initial") {
    const userPayload: { firebase_uid: string; email?: string; name?: string } = {
      firebase_uid: firebaseUid,
    };
    if (userEmail != null && userEmail !== "") userPayload.email = userEmail;
    if (userName != null && userName !== "") userPayload.name = userName;

    await supabase.from("users").upsert(userPayload, { onConflict: "firebase_uid" });
    await supabase.from("plans").update({ paid: true, user_id: firebaseUid }).eq("id", planId);
  }

  await supabase
    .from("payments")
    .update({ razorpay_payment_id, status: "paid" })
    .eq("razorpay_order_id", razorpay_order_id);

  if (kind === "initial") {
    void runUnlockGeneration(planId).catch((e) => {
      console.error("Paid plan generation failed (user can retry from dashboard):", e);
    });
  }

  return { ok: true };
}

async function runUnlockGeneration(planId: string): Promise<void> {
  const { data: planRow } = await supabase
    .from("plans")
    .select("submission_id")
    .eq("id", planId)
    .single();

  if (!planRow?.submission_id) {
    console.error("unlock generation: submission missing");
    return;
  }

  const { data: subRow } = await supabase
    .from("debt_submissions")
    .select("form_data")
    .eq("id", planRow.submission_id)
    .single();

  const fd = subRow?.form_data as FormData | undefined;
  const strat: PayoffStrategy =
    fd?.strategy && STRATEGIES.includes(fd.strategy) ? fd.strategy : "balanced";

  // Single call — all 3 strategies computed together (math is local, one Claude narrative call)
  await generateAndPersistPlan(planId, strat);
}

// POST /payment/order — auth required
router.post("/order", requireAuth, async (req: AuthRequest, res) => {
  const { submissionId, regen } = req.body as { submissionId?: string; regen?: boolean };

  if (!submissionId) {
    res.status(400).json({ error: "submissionId required" });
    return;
  }

  // --- DEV OVERRIDE ---
  if (process.env.DEV_SKIP_PAYMENT === "true") {
    const uid = req.user!.uid;
    await supabase.from("plans").update({ paid: true, user_id: uid }).eq("id", submissionId);
    await supabase.from("users").upsert(
      { firebase_uid: uid, email: req.user?.email, name: req.user?.name },
      { onConflict: "firebase_uid" }
    );

    // Do not await — Claude multi-strategy run can take minutes; respond fast so UI can redirect and poll.
    void runUnlockGeneration(submissionId).catch((e) => {
      console.error("DEV generation after unlock failed:", e);
    });

    res.json({ success: true, dev: true });
    return;
  }
  // ---------------------

  try {
    const uid = req.user!.uid;
    const regenRequested = regen === true;
    let amountPaise = PLAN_PRICE_PAISE;

    if (regenRequested) {
      const { data: priorPaidPlan } = await supabase
        .from("plans")
        .select("id")
        .eq("user_id", uid)
        .eq("paid", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (priorPaidPlan?.id) {
        amountPaise = REGEN_PRICE_PAISE;
      }
    }

    const { error: userUpsertErr } = await supabase.from("users").upsert(
      { firebase_uid: uid, email: req.user?.email ?? null, name: req.user?.name ?? null },
      { onConflict: "firebase_uid" }
    );
    if (userUpsertErr) {
      console.error("users upsert failed before payment order:", userUpsertErr);
      res.status(500).json({ error: "Could not record payment. Please try again." });
      return;
    }

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `${amountPaise === REGEN_PRICE_PAISE ? "regen_unlock" : "plan"}_${submissionId.slice(0, 20)}`,
      notes: { submissionId, userId: uid, regen: regenRequested ? "1" : "0" },
    });

    const { error: payInsertErr } = await supabase.from("payments").insert({
      plan_id: submissionId,
      user_id: uid,
      razorpay_order_id: order.id,
      status: "pending",
    });

    if (payInsertErr) {
      console.error("payments insert failed (order exists at Razorpay — user may pay without a DB row):", payInsertErr);
      res.status(500).json({ error: "Could not record payment. Please try again." });
      return;
    }

    res.json({ orderId: order.id, amount: amountPaise });
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ error: "Could not create payment order" });
  }
});

// POST /payment/verify — auth required
router.post("/verify", requireAuth, async (req: AuthRequest, res) => {
  const { submissionId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const valid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!valid) {
    res.status(400).json({ error: "Invalid payment signature" });
    return;
  }

  try {
    const uid = req.user!.uid;
    const fin = await finalizePaidOrder({
      planId: submissionId,
      firebaseUid: uid,
      razorpay_order_id,
      razorpay_payment_id,
      kind: "initial",
      userEmail: req.user?.email,
      userName: req.user?.name,
    });
    if (!fin.ok && fin.reason === "missing_row") {
      console.error("verify: no payments row for order", razorpay_order_id);
      res.status(400).json({
        error:
          "No pending payment for this order. If you were charged, contact support with your Razorpay receipt.",
      });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Payment verify error:", err);
    res.status(500).json({ error: "Could not verify payment" });
  }
});

// POST /payment/regen-order — ₹99 regeneration payment
router.post("/regen-order", requireAuth, async (req: AuthRequest, res) => {
  const { submissionId } = req.body;

  if (!submissionId) {
    res.status(400).json({ error: "submissionId required" });
    return;
  }

  // DEV OVERRIDE
  if (process.env.DEV_SKIP_PAYMENT === "true") {
    res.json({ success: true, dev: true });
    return;
  }

  try {
    const uid = req.user!.uid;
    const { error: userUpsertErr } = await supabase.from("users").upsert(
      { firebase_uid: uid, email: req.user?.email ?? null, name: req.user?.name ?? null },
      { onConflict: "firebase_uid" }
    );
    if (userUpsertErr) {
      console.error("users upsert failed before regen-order:", userUpsertErr);
      res.status(500).json({ error: "Could not record payment. Please try again." });
      return;
    }

    const order = await razorpay.orders.create({
      amount: REGEN_PRICE_PAISE,
      currency: "INR",
      receipt: `regen_${submissionId.slice(0, 20)}`,
      notes: { submissionId, userId: uid, type: "regen" },
    });

    const { error: payInsertErr } = await supabase.from("payments").insert({
      plan_id: submissionId,
      user_id: uid,
      razorpay_order_id: order.id,
      status: "pending",
    });

    if (payInsertErr) {
      console.error("payments insert failed (regen-order):", payInsertErr);
      res.status(500).json({ error: "Could not record payment. Please try again." });
      return;
    }

    res.json({ orderId: order.id, amount: REGEN_PRICE_PAISE });
  } catch (err) {
    console.error("Regen order creation error:", err);
    res.status(500).json({ error: "Could not create regeneration payment order" });
  }
});

// POST /payment/regen-verify — verify ₹99 regeneration payment
router.post("/regen-verify", requireAuth, async (req: AuthRequest, res) => {
  const { submissionId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const valid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!valid) {
    res.status(400).json({ error: "Invalid payment signature" });
    return;
  }

  try {
    const fin = await finalizePaidOrder({
      planId: submissionId,
      firebaseUid: req.user!.uid,
      razorpay_order_id,
      razorpay_payment_id,
      kind: "regen",
    });
    if (!fin.ok && fin.reason === "missing_row") {
      console.error("regen-verify: no payments row for order", razorpay_order_id);
      res.status(400).json({
        error:
          "No pending payment for this order. If you were charged, contact support with your Razorpay receipt.",
      });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Regen verify error:", err);
    res.status(500).json({ error: "Could not verify regeneration payment" });
  }
});

export default router;
