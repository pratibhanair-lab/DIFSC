import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Auth-only client, bound to the visitor's own cookies. Used to find out
 * who is currently logged in (and to log in/out) — never used for reading
 * or writing table data. See lib/supabase/admin.ts for that.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component during a render that can't set
            // cookies — safe to ignore because proxy.ts refreshes the
            // session on every request anyway.
          }
        },
      },
    }
  );
}
