import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

dotenv.config();

import planRouter from "./routes/plan";
import paymentRouter from "./routes/payment";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/plan", planRouter);
app.use("/payment", paymentRouter);

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  if (process.env.DEV_SKIP_AUTH === "true") console.warn("⚠️  DEV_SKIP_AUTH is enabled");
  if (process.env.DEV_SKIP_PAYMENT === "true") console.warn("⚠️  DEV_SKIP_PAYMENT is enabled");
});
