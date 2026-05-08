import type { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

function ensureFirebaseAdmin(): void {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin env vars. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (or enable DEV_SKIP_AUTH=true).",
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
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
      email: "dev@debtzero.app",
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
    ensureFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email, name: decoded.name };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
