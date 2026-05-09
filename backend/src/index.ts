import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import planRouter from "./routes/plan";
import paymentRouter from "./routes/payment";
import razorpayWebhookRouter from "./routes/razorpayWebhook";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());

const DEFAULT_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function parseAllowedOrigins(): string[] {
  const raw =
    process.env.FRONTEND_URLS ??
    process.env.FRONTEND_URL ??
    "http://localhost:5173";
  const fromEnv = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // FRONTEND_URL(S) alone would drop localhost when set to prod — keep local Vite in dev.
  if (process.env.NODE_ENV === "production") return fromEnv;
  return [...new Set([...DEFAULT_DEV_ORIGINS, ...fromEnv])];
}

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin(origin, cb) {
      // Allow non-browser clients (no Origin header) e.g. health checks / curl.
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(
  "/webhooks/razorpay",
  express.raw({ type: "application/json" }),
  razorpayWebhookRouter
);

app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/plan", planRouter);
app.use("/payment", paymentRouter);

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  if (process.env.DEV_SKIP_AUTH === "true") console.warn("⚠️  DEV_SKIP_AUTH is enabled");
  if (process.env.DEV_SKIP_PAYMENT === "true") console.warn("⚠️  DEV_SKIP_PAYMENT is enabled");
});
