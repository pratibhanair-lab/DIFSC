import { fetchAllSubmissions, titleOf } from "@/lib/submissions-view";
import { createAdminClient } from "@/lib/supabase/admin";
import ThemeToggle from "@/components/ThemeToggle";
import StatusChip from "@/components/StatusChip";
import TypeBadge from "@/components/TypeBadge";

export const dynamic = "force-dynamic";

const CAT_COLORS = ["#17805A", "#2563B0", "#B0632A", "#8A5CD1", "#158A8F", "#C0453A", "#4B7A1E"];

export default async function PublicOverviewPage() {
  const submissions = await fetchAllSubmissions();
  const admin = createAdminClient();
  const [{ data: categories }, { data: orgSections }] = await Promise.all([
    admin.from("categories").select("id,name").order("name"),
    admin.from("org_sections").select("id,name").order("name"),
  ]);

  const counts = {
    total: submissions.length,
    pending: submissions.filter((s) => s.overallStatus === "pending").length,
    approved: submissions.filter((s) => s.overallStatus === "approved").length,
    rejected: submissions.filter((s) => s.overallStatus === "rejected").length,
  };

  const cardBase: React.CSSProperties = { padding: "20px 22px" };
  const countCards = [
    { label: "Total suggestions", value: counts.total, color: "var(--ink)", border: "var(--line)" },
    { label: "Pending review", value: counts.pending, color: "var(--pend)", border: "var(--pend)" },
    { label: "Approved", value: counts.approved, color: "var(--appr)", border: "var(--appr)" },
    { label: "Rejected", value: counts.rejected, color: "var(--rej)", border: "var(--rej)" },
  ];

  const categoryStats = (categories ?? []).map((c, i) => ({
    name: c.name,
    count: submissions.filter((s) => s.sessions.some((sess) => sess.categoryId === c.id)).length,
    color: CAT_COLORS[i % CAT_COLORS.length],
  }));
  const sectionStats = (orgSections ?? []).map((o, i) => ({
    name: o.name,
    count: submissions.filter((s) => s.orgSectionName === o.name).length,
    color: CAT_COLORS[(i + 2) % CAT_COLORS.length],
  }));

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
          DIFSC 2026 &mdash; Overview
        </span>
        <ThemeToggle />
      </header>
      <div style={{ flex: 1, overflow: "auto", padding: "28px 28px 60px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 24 }}>
            <h1 className="heading" style={{ fontWeight: 800, fontSize: 26, margin: "0 0 4px" }}>
              Overview
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>Suggestion pipeline at a glance.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 }}>
            {countCards.map((c) => (
              <div key={c.label} className="card" style={{ ...cardBase, borderTop: `3px solid ${c.border}` }}>
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginBottom: 10 }}>{c.label}</div>
                <div className="heading" style={{ fontWeight: 800, fontSize: 38, lineHeight: 1, color: c.color }}>
                  {c.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div className="card" style={{ padding: "20px 22px" }}>
              <div className="heading" style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                Submissions by category
              </div>
              {categoryStats.map((cc) => (
                <div key={cc.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: cc.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cc.name}</span>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{cc.count}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: "20px 22px" }}>
              <div className="heading" style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                Submissions by section
              </div>
              {sectionStats.map((ss) => (
                <div key={ss.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: ss.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ss.name}</span>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{ss.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ overflow: "hidden" }}>
            <div className="heading" style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", fontWeight: 700, fontSize: 15 }}>
              Recent submissions
            </div>
            {submissions.slice(0, 5).map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "15px 22px", borderBottom: "1px solid var(--line)" }}>
                <TypeBadge kind={r.kind} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titleOf(r)}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {r.submitterName} &middot; {r.orgSectionName ?? "—"}
                  </div>
                </div>
                <StatusChip status={r.overallStatus} />
              </div>
            ))}
            {submissions.length === 0 && (
              <div style={{ padding: 30, textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>No submissions yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
