import { Router, type Request, type Response } from "express";
import { verifyWebhookSignature } from "../services/razorpay";
import { supabase } from "../services/supabase";
import { finalizePaidOrder } from "./payment";

const router = Router();

type RazorpayPaymentEntity = {
  id: string;
  order_id?: string | null;
  notes?: Record<string, string | undefined>;
};

type RazorpayWebhookBody = {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
  };
};

router.post("/", async (req: Request, res: Response) => {
  const raw = req.body as Buffer | undefined;
  if (!Buffer.isBuffer(raw) || raw.length === 0) {
    res.status(400).send("empty body");
    return;
  }

  const sig = req.get("x-razorpay-signature");
  if (!verifyWebhookSignature(raw, sig)) {
    res.status(400).send("invalid signature");
    return;
  }

  let body: RazorpayWebhookBody;
  try {
    body = JSON.parse(raw.toString("utf8")) as RazorpayWebhookBody;
  } catch {
    res.status(400).send("invalid json");
    return;
  }

  if (body.event === "payment.captured") {
    const payment = body.payload?.payment?.entity;
    if (!payment?.id || !payment.order_id) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    const orderId = payment.order_id;
    const paymentId = payment.id;
    const notes = payment.notes ?? {};

    let planId = notes.submissionId;
    let firebaseUid = notes.userId;
    const kind = notes.type === "regen" ? ("regen" as const) : ("initial" as const);

    if (!planId || !firebaseUid) {
      const { data: row } = await supabase
        .from("payments")
        .select("plan_id, user_id")
        .eq("razorpay_order_id", orderId)
        .maybeSingle();

      if (row?.plan_id) planId = row.plan_id;
      if (row?.user_id) firebaseUid = row.user_id;
    }

    if (!planId || !firebaseUid) {
      console.warn("razorpay webhook: payment.captured missing plan/user", orderId);
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    try {
      let fin = await finalizePaidOrder({
        planId,
        firebaseUid,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        kind,
      });

      // Heal: Razorpay order existed but our DB insert failed (e.g. old bug) — recreate pending row from signed webhook notes.
      if (!fin.ok && fin.reason === "missing_row") {
        const { error: healErr } = await supabase.from("payments").insert({
          plan_id: planId,
          user_id: firebaseUid,
          razorpay_order_id: orderId,
          status: "pending",
        });
        if (healErr && healErr.code !== "23505") {
          console.error("razorpay webhook: heal insert failed:", healErr);
          res.status(500).json({ error: "persist failed" });
          return;
        }
        fin = await finalizePaidOrder({
          planId,
          firebaseUid,
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          kind,
        });
      }

      if (!fin.ok && fin.reason === "missing_row") {
        console.warn("razorpay webhook: still no payments row after heal", orderId);
        res.status(500).json({ error: "persist failed" });
        return;
      }
    } catch (e) {
      console.error("razorpay webhook finalize error:", e);
      res.status(500).json({ error: "persist failed" });
      return;
    }
  }

  if (body.event === "payment.failed") {
    const payment = body.payload?.payment?.entity;
    const orderId = payment?.order_id;
    if (orderId) {
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("razorpay_order_id", orderId)
        .eq("status", "pending");
    }
  }

  res.status(200).json({ ok: true });
});

export default router;
