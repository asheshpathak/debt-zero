import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import planRouter from "./routes/plan";
import paymentRouter from "./routes/payment";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());

function parseAllowedOrigins(): string[] {
  const raw =
    process.env.FRONTEND_URLS ??
    process.env.FRONTEND_URL ??
    "http://localhost:5173";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/plan", planRouter);
app.use("/payment", paymentRouter);

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  if (process.env.DEV_SKIP_AUTH === "true") console.warn("⚠️  DEV_SKIP_AUTH is enabled");
  if (process.env.DEV_SKIP_PAYMENT === "true") console.warn("⚠️  DEV_SKIP_PAYMENT is enabled");
});
