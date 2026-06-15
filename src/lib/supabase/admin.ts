import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS — only use server-side after verifying
 * the caller via the SSR client (`supabase.auth.getUser()`).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
