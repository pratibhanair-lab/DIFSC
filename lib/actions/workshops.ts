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

export type SubmitWorkshopResult = { ok: true; firstName: string; workshopIds: string[] } | { ok: false; error: string };

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

  // Registering again with the same email for the same workshop updates the
  // details already on file. Status isn't included, so a seat an admin has
  // already confirmed or declined keeps its status.
  const { error } = await admin.from("workshop_registrations").upsert(
    workshopIds.map((workshopId) => ({
      workshop_id: workshopId,
      full_name: fullName,
      email,
      mobile_number: mobileNumber,
      organization,
      designation: designation || null,
    })),
    { onConflict: "workshop_id,email" }
  );

  if (error) {
    return { ok: false, error: "Something went wrong saving your registration. Please try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/workshops");

  return { ok: true, firstName: fullName.split(" ")[0], workshopIds };
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
