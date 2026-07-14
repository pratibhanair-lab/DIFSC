import { fetchAllSubmissions } from "@/lib/submissions-view";
import { createAdminClient } from "@/lib/supabase/admin";
import ThemeToggle from "@/components/ThemeToggle";
import PublicSubmissionsBrowser from "@/components/PublicSubmissionsBrowser";

export const dynamic = "force-dynamic";

export default async function PublicSubmissionsPage() {
  const submissions = await fetchAllSubmissions();
  const admin = createAdminClient();
  const { data: categories } = await admin.from("categories").select("id,name").order("name");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          height: 60,
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
          flexShrink: 0,
        }}
      >
        <span className="heading" style={{ fontWeight: 700, fontSize: 15 }}>
          DIFSC 2026 &mdash; All Submissions
        </span>
        <ThemeToggle />
      </header>
      <div style={{ flex: 1, overflow: "auto", padding: "28px 28px 60px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <PublicSubmissionsBrowser submissions={submissions} categories={categories ?? []} />
        </div>
      </div>
    </div>
  );
}
