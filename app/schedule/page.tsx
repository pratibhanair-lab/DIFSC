import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { fetchScheduleBoard } from "@/lib/schedule-view";
import { createAdminClient } from "@/lib/supabase/admin";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutLink from "@/components/LogoutLink";
import ScheduleGrid from "@/components/ScheduleGrid";
import ShareScheduleButton from "@/components/ShareScheduleButton";

export const dynamic = "force-dynamic";

const DAYS = ["2026-11-16", "2026-11-17", "2026-11-18"];

export default async function SchedulePage() {
  await requireRole(["admin"]);
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
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/admin" style={{ color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>
            &larr; Dashboard
          </Link>
          <span className="heading" style={{ fontWeight: 700, fontSize: 15 }}>
            Programme Scheduling
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ShareScheduleButton />
          <ThemeToggle />
          <LogoutLink />
        </div>
      </header>
      <ScheduleGrid board={board} categories={categories ?? []} />
    </div>
  );
}
