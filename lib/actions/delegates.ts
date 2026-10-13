"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchDelegateRegistrations } from "@/lib/delegates-view";

// Checked here, on the server only, so the code never ships to the browser.
const GUEST_JOINING_CODE = "difsc@20";

export type SubmitDelegateInput = {
  registrationType: "government" | "guest";
  guestCode: string;
  fullName: string;
  officialEmail: string;
  preferredEmail: string;
  organization: string;
  sectionDepartment: string;
  designation: string;
  mobileNumber: string;
  nationality: string;
};

export type SubmitDelegateResult =
  | { ok: true; reference: string; firstName: string }
  | { ok: false; error: string };

export async function submitDelegateRegistration(payload: SubmitDelegateInput): Promise<SubmitDelegateResult> {
  const fullName = payload.fullName.trim();
  const officialEmail = payload.officialEmail.trim();
  const preferredEmail = payload.preferredEmail.trim() || officialEmail;
  const organization = payload.organization.trim();
  const designation = payload.designation.trim();
  const mobileNumber = payload.mobileNumber.trim();
  const nationality = payload.nationality.trim();

  if (payload.registrationType === "guest") {
    const code = (payload.guestCode ?? "").trim();
    if (!code) return { ok: false, error: "Please enter your guest joining code." };
    if (code !== GUEST_JOINING_CODE) {
      return { ok: false, error: "That guest joining code isn't correct. Please check it and try again." };
    }
  }

  if (!fullName) return { ok: false, error: "Please enter your full name." };
  if (!officialEmail) return { ok: false, error: "Please enter your official email." };
  if (!organization) return { ok: false, error: "Please select or enter your organization." };
  if (!designation) return { ok: false, error: "Please enter your designation." };
  if (!mobileNumber) return { ok: false, error: "Please enter your mobile number." };
  if (!nationality) return { ok: false, error: "Please enter your nationality." };

  const admin = createAdminClient();

  const { data: reference, error: refError } = await admin.rpc("next_delegate_reference");
  if (refError || !reference) {
    return { ok: false, error: "Something went wrong generating a reference number. Please try again." };
  }

  const { error: insertError } = await admin.from("delegate_registrations").insert({
    reference,
    registration_type: payload.registrationType === "guest" ? "guest" : "government",
    full_name: fullName,
    official_email: officialEmail,
    preferred_email: preferredEmail,
    organization,
    section_department: payload.sectionDepartment.trim() || null,
    designation,
    mobile_number: mobileNumber,
    nationality,
  });

  if (insertError) {
    return { ok: false, error: "Something went wrong saving your registration. Please try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/delegates");

  return { ok: true, reference, firstName: fullName.split(" ")[0] };
}

function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportDelegatesCsv(): Promise<string> {
  await requireRole(["admin"]);
  const delegates = await fetchDelegateRegistrations();

  const header = [
    "Reference",
    "Type",
    "Full name",
    "Official email",
    "Preferred email",
    "Organization",
    "Section/Department",
    "Designation",
    "Mobile number",
    "Nationality",
    "Submitted at",
  ];

  const rows = delegates.map((d) =>
    [
      d.reference,
      d.registrationType === "guest" ? "Guest" : "Government employee",
      d.fullName,
      d.officialEmail,
      d.preferredEmail,
      d.organization,
      d.sectionDepartment ?? "",
      d.designation,
      d.mobileNumber,
      d.nationality,
      d.createdAt,
    ]
      .map(csvField)
      .join(",")
  );

  return [header.join(","), ...rows].join("\n");
}
