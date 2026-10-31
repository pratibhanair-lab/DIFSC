import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { WORKSHOP_STATUSES, type WorkshopStatus } from "@/lib/workshops-config";

export type WorkshopRegistrationView = {
  id: string;
  workshopId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  organization: string;
  designation: string | null;
  status: WorkshopStatus;
  createdAt: string;
};

/** Admin-only — includes contact info. Used by /admin/workshops. */
export async function fetchWorkshopRegistrations(): Promise<WorkshopRegistrationView[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("workshop_registrations").select("*").order("created_at", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    workshopId: r.workshop_id,
    fullName: r.full_name,
    email: r.email,
    mobileNumber: r.mobile_number,
    organization: r.organization,
    designation: r.designation,
    status: (WORKSHOP_STATUSES as readonly string[]).includes(r.status) ? r.status : "interested",
    createdAt: r.created_at,
  }));
}
