import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import SuggestionForm, { type InitialSubmitter } from "@/components/SuggestionForm";

export const dynamic = "force-dynamic";

function readInitialSubmitter(raw: string | undefined): InitialSubmitter | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      orgSectionId: typeof parsed.orgSectionId === "string" ? parsed.orgSectionId : "",
    };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const admin = createAdminClient();
  const [{ data: categories }, { data: sessionTypes }, { data: orgSections }, cookieStore] = await Promise.all([
    admin.from("categories").select("id,name").order("name"),
    admin.from("session_types").select("id,name").order("name"),
    admin.from("org_sections").select("id,name").order("name"),
    cookies(),
  ]);

  const initialSubmitter = readInitialSubmitter(cookieStore.get("difsc_submitter")?.value);

  return (
    <SuggestionForm
      categories={categories ?? []}
      sessionTypes={sessionTypes ?? []}
      orgSections={orgSections ?? []}
      initialSubmitter={initialSubmitter}
    />
  );
}
