"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Table = "categories" | "session_types" | "org_sections" | "halls";

export async function addLookup(table: Table, name: string) {
  await requireRole(["admin"]);
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name can't be empty." };

  const admin = createAdminClient();
  const { error } = await admin.from(table).insert({ name: trimmed });
  revalidatePath("/admin/setup");
  if (error) {
    return { ok: false, error: error.code === "23505" ? "That already exists." : "Could not add that." };
  }
  return { ok: true };
}

export async function removeLookup(table: Table, id: string) {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  const { error } = await admin.from(table).delete().eq("id", id);
  revalidatePath("/admin/setup");
  if (error) {
    return {
      ok: false,
      error: error.code === "23503" ? "This is used by an existing submission and can't be removed." : "Could not remove that.",
    };
  }
  return { ok: true };
}
