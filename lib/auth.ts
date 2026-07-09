import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role, StaffUser } from "@/lib/types";

/** Who's logged in right now, or null. Safe to call anywhere on the server. */
export async function getCurrentUser(): Promise<StaffUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("id, name, email, role, focus_area")
    .eq("id", user.id)
    .single();

  return profile as StaffUser | null;
}

/**
 * Use at the top of a protected page or Server Action. Redirects to /login
 * if nobody's logged in, or to their own home page if they're logged in
 * with the wrong role.
 */
export async function requireRole(roles: Role[]): Promise<StaffUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) {
    redirect(user.role === "admin" ? "/admin" : "/review");
  }
  return user;
}
