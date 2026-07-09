import { createAdminClient } from "@/lib/supabase/admin";
import SuggestionForm from "@/components/SuggestionForm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const admin = createAdminClient();
  const [{ data: categories }, { data: sessionTypes }, { data: orgSections }] = await Promise.all([
    admin.from("categories").select("id,name").order("name"),
    admin.from("session_types").select("id,name").order("name"),
    admin.from("org_sections").select("id,name").order("name"),
  ]);

  return (
    <SuggestionForm
      categories={categories ?? []}
      sessionTypes={sessionTypes ?? []}
      orgSections={orgSections ?? []}
    />
  );
}
