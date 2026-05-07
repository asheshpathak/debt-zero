import type { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

// Initialise Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export interface AuthRequest extends Request {
  user?: { uid: string; email?: string; name?: string };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  // --- DEV OVERRIDE ---
  if (process.env.DEV_SKIP_AUTH === "true") {
    req.user = {
      uid: process.env.DEV_USER_ID || "dev-user-123",
      email: "dev@debtclear.app",
      name: "Dev User",
    };
    return next();
  }
  // --------------------

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email, name: decoded.name };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
