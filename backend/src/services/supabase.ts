import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const rawSupabaseUrl = process.env.SUPABASE_URL ?? "";
// Accept either the project base URL or an accidentally pasted REST endpoint.
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL (expected: https://<project-ref>.supabase.co)");
}
if (!supabaseKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}
if (supabaseKey.startsWith("sb_publishable_")) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is set to a publishable key. For the backend, set this to the project's service role (secret) key instead."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket as unknown as any },
});
