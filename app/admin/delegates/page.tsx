import { fetchDelegateRegistrations } from "@/lib/delegates-view";
import DelegatesBrowser from "@/components/DelegatesBrowser";

export const dynamic = "force-dynamic";

export default async function AdminDelegatesPage() {
  const delegates = await fetchDelegateRegistrations();

  return <DelegatesBrowser delegates={delegates} />;
}
