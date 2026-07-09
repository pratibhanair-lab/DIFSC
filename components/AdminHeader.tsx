"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { logout } from "@/lib/actions/auth";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/review", label: "Review queue" },
  { href: "/admin/setup", label: "Setup" },
  { href: "/admin/referees", label: "Referees" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminHeader({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        height: 60,
        borderBottom: "1px solid var(--line)",
        background: "var(--surface)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            className="heading"
            style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}
          >
            DF
          </div>
          <span className="heading" style={{ fontWeight: 700, fontSize: 15 }}>
            Programme Committee
          </span>
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                style={{
                  border: "none",
                  background: active ? "var(--accent-weak)" : "transparent",
                  color: active ? "var(--accent-ink)" : "var(--muted)",
                  borderRadius: 9,
                  padding: "8px 14px",
                  fontSize: 13.5,
                  fontWeight: 600,
                  display: "inline-block",
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <ThemeToggle />
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--accent-weak)", color: "var(--accent-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}
          >
            {initials(userName)}
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{userName}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Administrator</div>
          </div>
        </div>
        <button
          onClick={() => logout()}
          style={{ background: "none", border: "none", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}
        >
          Log out
        </button>
      </div>
    </header>
  );
}
