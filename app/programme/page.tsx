import { fetchScheduleBoard } from "@/lib/schedule-view";
import { createAdminClient } from "@/lib/supabase/admin";
import ThemeToggle from "@/components/ThemeToggle";
import PublicScheduleGrid from "@/components/PublicScheduleGrid";

export const dynamic = "force-dynamic";

const DAYS = ["2026-11-16", "2026-11-17", "2026-11-18"];

export default async function ProgrammePage() {
  const board = await fetchScheduleBoard(DAYS);
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
          DIFSC 2026 &mdash; Conference Programme
        </span>
        <ThemeToggle />
      </header>
      <PublicScheduleGrid board={board} categories={categories ?? []} />
    </div>
  );
}
