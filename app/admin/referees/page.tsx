import { createAdminClient } from "@/lib/supabase/admin";
import RefereeManager from "@/components/RefereeManager";

export const dynamic = "force-dynamic";

export default async function RefereesPage() {
  const admin = createAdminClient();
  const { data: referees } = await admin
    .from("users")
    .select("id, name, email, focus_area")
    .eq("role", "referee")
    .order("name");

  return (
    <div>
      <h1 className="heading" style={{ fontWeight: 800, fontSize: 26, margin: "0 0 4px" }}>
        Judges &amp; referees
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 22px" }}>Accounts that can review and score submissions.</p>
      <RefereeManager referees={referees ?? []} />
    </div>
  );
}
