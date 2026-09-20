import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type DelegateView = {
  id: string;
  reference: string;
  fullName: string;
  officialEmail: string;
  preferredEmail: string;
  organization: string;
  sectionDepartment: string | null;
  designation: string;
  mobileNumber: string;
  nationality: string;
  createdAt: string;
};

/** Admin-only — includes contact info. Used by /admin/delegates. */
export async function fetchDelegateRegistrations(): Promise<DelegateView[]> {
  const admin = createAdminClient();
  const { data: delegates } = await admin
    .from("delegate_registrations")
    .select("*")
    .order("created_at", { ascending: false });

  return (delegates ?? []).map((d) => ({
    id: d.id,
    reference: d.reference,
    fullName: d.full_name,
    officialEmail: d.official_email,
    preferredEmail: d.preferred_email,
    organization: d.organization,
    sectionDepartment: d.section_department,
    designation: d.designation,
    mobileNumber: d.mobile_number,
    nationality: d.nationality,
    createdAt: d.created_at,
  }));
}
