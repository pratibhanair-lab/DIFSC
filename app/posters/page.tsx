import { createAdminClient } from "@/lib/supabase/admin";
import PosterSubmissionForm from "@/components/PosterSubmissionForm";

import SubmissionsClosed from "@/components/SubmissionsClosed";
import { postersOpen } from "@/lib/submission-config";

export const dynamic = "force-dynamic";

export default async function PostersPage() {
  // After the poster deadline, show the "closed" page instead of the form.
  if (!postersOpen()) return <SubmissionsClosed showNavTabs />;

  const admin = createAdminClient();
  const { data: categories } = await admin.from("categories").select("id,name").order("name");

  return <PosterSubmissionForm categories={categories ?? []} />;
}
