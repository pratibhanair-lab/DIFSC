"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type LoginResult = { ok: false; error: string };

export async function login(opts: {
  email: string;
  password: string;
  expectedRole: "admin" | "referee";
}): Promise<LoginResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: opts.email.trim(),
    password: opts.password,
  });

  if (error || !data.user) {
    return { ok: false, error: "Incorrect email or password." };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return { ok: false, error: "This account isn't set up as staff yet. Ask an admin to add you." };
  }

  if (profile.role !== opts.expectedRole) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: `That account is a${profile.role === "admin" ? "n" : ""} ${profile.role}, not a${
        opts.expectedRole === "admin" ? "n" : ""
      } ${opts.expectedRole}. Choose the matching tab above.`,
    };
  }

  redirect(opts.expectedRole === "admin" ? "/admin" : "/review");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
