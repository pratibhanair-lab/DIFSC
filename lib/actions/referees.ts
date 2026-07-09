"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export type AddRefereeResult =
  | { ok: true; email: string; tempPassword: string }
  | { ok: false; error: string };

export async function addReferee(opts: {
  name: string;
  email: string;
  focusArea: string;
}): Promise<AddRefereeResult> {
  await requireRole(["admin"]);
  const name = opts.name.trim();
  const email = opts.email.trim();
  if (!name || !email) return { ok: false, error: "Name and email are required." };

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { ok: false, error: createError?.message || "Could not create that login." };
  }

  const { error: profileError } = await admin.from("users").insert({
    id: created.user.id,
    name,
    email,
    role: "referee",
    focus_area: opts.focusArea.trim() || null,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: "Could not save the referee profile." };
  }

  revalidatePath("/admin/referees");
  return { ok: true, email, tempPassword };
}

export async function removeReferee(userId: string) {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  await admin.from("users").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/admin/referees");
}
