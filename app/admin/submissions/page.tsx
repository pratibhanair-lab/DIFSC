import { fetchAllSubmissions } from "@/lib/submissions-view";
import { createAdminClient } from "@/lib/supabase/admin";
import SubmissionsBrowser from "@/components/SubmissionsBrowser";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage() {
  const [submissions, admin] = [await fetchAllSubmissions(), createAdminClient()];
  const [{ data: categories }, { data: sessionTypes }] = await Promise.all([
    admin.from("categories").select("id,name").order("name"),
    admin.from("session_types").select("id,name").order("name"),
  ]);

  return <SubmissionsBrowser submissions={submissions} categories={categories ?? []} sessionTypes={sessionTypes ?? []} />;
}
