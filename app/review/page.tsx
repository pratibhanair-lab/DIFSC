import { requireRole } from "@/lib/auth";
import { fetchAllSubmissions } from "@/lib/submissions-view";
import { createAdminClient } from "@/lib/supabase/admin";
import ThemeToggle from "@/components/ThemeToggle";
import ReviewQueue from "@/components/ReviewQueue";
import LogoutLink from "@/components/LogoutLink";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await requireRole(["admin", "referee"]);
  const [submissions, admin] = [await fetchAllSubmissions(), createAdminClient()];
  const [{ data: categories }, { data: sessionTypes }] = await Promise.all([
    admin.from("categories").select("id,name").order("name"),
    admin.from("session_types").select("id,name").order("name"),
  ]);

  const pending = submissions.filter((s) => s.overallStatus === "pending");

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
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            className="heading"
            style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}
          >
            DF
          </div>
          <span className="heading" style={{ fontWeight: 700, fontSize: 15 }}>
            Review Queue
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ThemeToggle />
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div
              style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--accent-weak)", color: "var(--accent-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}
            >
              {user.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{user.role === "admin" ? "Administrator" : "Referee"}</div>
            </div>
          </div>
          <LogoutLink />
        </div>
      </header>
      <ReviewQueue pending={pending} categories={categories ?? []} sessionTypes={sessionTypes ?? []} />
    </div>
  );
}
