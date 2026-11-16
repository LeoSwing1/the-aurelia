import { createClient } from "@supabase/supabase-js";
import { env, hasSupabase } from "@/lib/env";

export function createAdminClient() {
  if (!hasSupabase || !env.supabaseUrl || !env.supabaseServiceKey) {
    throw new Error("Supabase is not configured. Add the Supabase URL and server-only service role key.");
  }
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
