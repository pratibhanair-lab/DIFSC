import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Full-access client using the secret key. Server-only — this must never be
 * imported from a Client Component or sent to the browser. This is what the
 * app uses for every table read/write; authorization is checked explicitly
 * in code (see lib/auth.ts) before any of these calls happen.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
