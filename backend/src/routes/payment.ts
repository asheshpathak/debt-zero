import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { razorpay, verifySignature } from "../services/razorpay";
import { supabase } from "../services/supabase";

const router = Router();
const PLAN_PRICE_PAISE = 29900; // ₹299

// POST /payment/order — auth required
router.post("/order", requireAuth, async (req: AuthRequest, res) => {
  const { submissionId } = req.body;

  if (!submissionId) {
    res.status(400).json({ error: "submissionId required" });
    return;
  }

  // --- DEV OVERRIDE ---
  if (process.env.DEV_SKIP_PAYMENT === "true") {
    const uid = req.user!.uid;
    await supabase.from("plans").update({ paid: true, user_id: uid }).eq("id", submissionId);
    await supabase.from("users").upsert({ firebase_uid: uid, email: req.user!.email, name: req.user!.name }, { onConflict: "firebase_uid" });
    res.json({ success: true, dev: true });
    return;
  }
  // --------------------

  try {
    const order = await razorpay.orders.create({
      amount: PLAN_PRICE_PAISE,
      currency: "INR",
      receipt: `plan_${submissionId.slice(0, 20)}`,
      notes: { submissionId, userId: req.user!.uid },
    });

    // Store payment record
    await supabase.from("payments").insert({
      plan_id: submissionId,
      user_id: req.user!.uid,
      razorpay_order_id: order.id,
      status: "pending",
    });

    res.json({ orderId: order.id, amount: PLAN_PRICE_PAISE });
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

    // Upsert user
    await supabase.from("users").upsert(
      { firebase_uid: uid, email: req.user!.email, name: req.user!.name },
      { onConflict: "firebase_uid" }
    );

    // Mark plan as paid and assign to user
    await supabase
      .from("plans")
      .update({ paid: true, user_id: uid })
      .eq("id", submissionId);

    // Update payment record
    await supabase
      .from("payments")
      .update({ razorpay_payment_id, status: "paid" })
      .eq("razorpay_order_id", razorpay_order_id);

    res.json({ success: true });
  } catch (err) {
    console.error("Payment verify error:", err);
    res.status(500).json({ error: "Could not verify payment" });
  }
});

export default router;
