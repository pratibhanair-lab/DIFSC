import { createAdminClient } from "@/lib/supabase/admin";
import LookupManager from "@/components/LookupManager";

export const dynamic = "force-dynamic";

function countBy<T extends { id: string }>(items: T[], sessions: { key: string | null }[]) {
  return items.map((item) => ({
    ...item,
    count: sessions.filter((s) => s.key === item.id).length,
  }));
}

export default async function CategoriesPage() {
  const admin = createAdminClient();
  const [
    { data: categories },
    { data: sessionTypes },
    { data: orgSections },
    { data: halls },
    { data: sessions },
    { data: submissions },
    { data: scheduleRows },
  ] = await Promise.all([
    admin.from("categories").select("id,name").order("name"),
    admin.from("session_types").select("id,name").order("name"),
    admin.from("org_sections").select("id,name").order("name"),
    admin.from("halls").select("id,name").order("name"),
    admin.from("sessions").select("category_id, session_type_id"),
    admin.from("submissions").select("org_section_id"),
    admin.from("schedule").select("hall_id"),
  ]);

  const categoryItems = countBy(
    categories ?? [],
    (sessions ?? []).map((s) => ({ key: s.category_id }))
  );
  const sessionTypeItems = countBy(
    sessionTypes ?? [],
    (sessions ?? []).map((s) => ({ key: s.session_type_id }))
  );
  const orgSectionItems = countBy(
    orgSections ?? [],
    (submissions ?? []).map((s) => ({ key: s.org_section_id }))
  );
  const hallItems = countBy(
    halls ?? [],
    (scheduleRows ?? []).map((s) => ({ key: s.hall_id }))
  );

  return (
    <div>
      <h1 className="heading" style={{ fontWeight: 800, fontSize: 26, margin: "0 0 4px" }}>
        Session categories
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 22px" }}>
        These populate the category dropdown on the public suggestion form.
      </p>
      <div style={{ marginBottom: 36 }}>
        <LookupManager table="categories" items={categoryItems} dotColor="var(--accent)" placeholder="New category name..." />
      </div>

      <h1 className="heading" style={{ fontWeight: 800, fontSize: 26, margin: "0 0 4px" }}>
        Session types
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 22px" }}>
        These populate the session type dropdown on the public suggestion form.
      </p>
      <div style={{ marginBottom: 36 }}>
        <LookupManager table="session_types" items={sessionTypeItems} dotColor="#8A5CD1" placeholder="New session type..." />
      </div>

      <h1 className="heading" style={{ fontWeight: 800, fontSize: 26, margin: "0 0 4px" }}>
        Organization sections
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 22px" }}>
        These populate the organization section dropdown on the public suggestion form.
      </p>
      <div style={{ marginBottom: 36 }}>
        <LookupManager table="org_sections" items={orgSectionItems} dotColor="#2563B0" placeholder="New section name..." />
      </div>

      <h1 className="heading" style={{ fontWeight: 800, fontSize: 26, margin: "0 0 4px" }}>
        Halls
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 22px" }}>These populate the scheduling grid&apos;s hall columns.</p>
      <div>
        <LookupManager table="halls" items={hallItems} dotColor="#B0632A" placeholder="New hall name..." />
      </div>
    </div>
  );
}
