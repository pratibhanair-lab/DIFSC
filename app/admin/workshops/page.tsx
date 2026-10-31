import { fetchWorkshopRegistrations } from "@/lib/workshops-view";
import WorkshopsBrowser from "@/components/WorkshopsBrowser";

export const dynamic = "force-dynamic";

export default async function AdminWorkshopsPage() {
  const registrations = await fetchWorkshopRegistrations();

  return <WorkshopsBrowser registrations={registrations} />;
}
