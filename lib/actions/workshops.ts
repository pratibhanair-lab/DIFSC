"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchWorkshopRegistrations } from "@/lib/workshops-view";
import { WORKSHOPS, WORKSHOP_STATUSES, WORKSHOP_STATUS_LABELS, workshopTitle } from "@/lib/workshops-config";

export type SubmitWorkshopInput = {
  workshopIds: string[];
  fullName: string;
  email: string;
  mobileNumber: string;
  organization: string;
  designation: string;
};

export type SubmitWorkshopResult =
  | { ok: true; firstName: string; workshopIds: string[]; waitlistedIds: string[] }
  | { ok: false; error: string };

export async function submitWorkshopRegistration(payload: SubmitWorkshopInput): Promise<SubmitWorkshopResult> {
  const fullName = payload.fullName.trim();
  const email = payload.email.trim().toLowerCase();
  const mobileNumber = payload.mobileNumber.trim();
  const organization = payload.organization.trim();
  const designation = payload.designation.trim();

  // Only accept workshops that really exist, and each one only once.
  const validIds = new Set(WORKSHOPS.map((w) => w.id));
  const workshopIds = [...new Set((payload.workshopIds ?? []).filter((id) => validIds.has(id)))];

  if (workshopIds.length === 0) return { ok: false, error: "Please choose at least one workshop." };
  if (!fullName) return { ok: false, error: "Please enter your full name." };
  if (!email) return { ok: false, error: "Please enter your email." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Please enter a valid email address." };
  if (!mobileNumber) return { ok: false, error: "Please enter your mobile number." };
  if (!organization) return { ok: false, error: "Please enter your organization." };

  const admin = createAdminClient();

  const saveError = { ok: false as const, error: "Something went wrong saving your registration. Please try again." };
  const details = {
    full_name: fullName,
    mobile_number: mobileNumber,
    organization,
    designation: designation || null,
  };

  // Registering again with the same email for the same workshop only updates
  // the details already on file — the status (confirmed, declined,
  // waitlisted...) stays exactly as it was.
  const { data: existingRows, error: existingError } = await admin
    .from("workshop_registrations")
    .select("workshop_id, status")
    .eq("email", email)
    .in("workshop_id", workshopIds);
  if (existingError) return saveError;
  const existingStatus = new Map((existingRows ?? []).map((r) => [r.workshop_id as string, r.status as string]));

  const waitlistedIds: string[] = [];

  for (const workshopId of workshopIds) {
    const existing = existingStatus.get(workshopId);
    if (existing) {
      const { error } = await admin
        .from("workshop_registrations")
        .update(details)
        .eq("workshop_id", workshopId)
        .eq("email", email);
      if (error) return saveError;
      if (existing === "waitlisted") waitlistedIds.push(workshopId);
      continue;
    }

    // A new sign-up. Seats are taken by interested + confirmed people;
    // waitlisted and declined people don't use one up. Once the workshop is
    // full, the new person goes straight onto the waiting list.
    const capacity = WORKSHOPS.find((w) => w.id === workshopId)?.capacity ?? Infinity;
    const { count, error: countError } = await admin
      .from("workshop_registrations")
      .select("id", { count: "exact", head: true })
      .eq("workshop_id", workshopId)
      .in("status", ["interested", "confirmed"]);
    if (countError) return saveError;

    const status = (count ?? 0) >= capacity ? "waitlisted" : "interested";
    const { error } = await admin
      .from("workshop_registrations")
      .insert({ workshop_id: workshopId, email, status, ...details });
    if (error) return saveError;
    if (status === "waitlisted") waitlistedIds.push(workshopId);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/workshops");

  return { ok: true, firstName: fullName.split(" ")[0], workshopIds, waitlistedIds };
}

export async function updateWorkshopStatus(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  await requireRole(["admin"]);
  if (!(WORKSHOP_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Unknown status." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("workshop_registrations").update({ status }).eq("id", id);
  if (error) return { ok: false, error: "Couldn't update the status. Please try again." };

  revalidatePath("/admin/workshops");
  return { ok: true };
}

function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportWorkshopsCsv(): Promise<string> {
  await requireRole(["admin"]);
  const registrations = await fetchWorkshopRegistrations();

  const header = ["Workshop", "Status", "Full name", "Email", "Mobile number", "Organization", "Designation", "Submitted at"];

  const rows = registrations.map((r) =>
    [
      workshopTitle(r.workshopId),
      WORKSHOP_STATUS_LABELS[r.status],
      r.fullName,
      r.email,
      r.mobileNumber,
      r.organization,
      r.designation ?? "",
      r.createdAt,
    ]
      .map(csvField)
      .join(",")
  );

  return [header.join(","), ...rows].join("\n");
}
