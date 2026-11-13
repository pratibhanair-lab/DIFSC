import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { fetchProgramme } from "@/lib/programme-view";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutLink from "@/components/LogoutLink";
import ProgrammeEditor from "@/components/ProgrammeEditor";

export const dynamic = "force-dynamic";

// Admins and referees can both edit the programme. requireRole() is the real
// check - the proxy only bounces logged-out visitors.
export default async function ProgrammeEditorPage() {
  const user = await requireRole(["admin", "referee"]);
  const { items, rooms } = await fetchProgramme();

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
          <Link href="/review" style={{ color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>
            &larr; Review queue
          </Link>
          <span className="heading" style={{ fontWeight: 700, fontSize: 15 }}>
            Programme editor
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ThemeToggle />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</span>
          <LogoutLink />
        </div>
      </header>
      <ProgrammeEditor items={items} rooms={rooms} />
    </div>
  );
}
