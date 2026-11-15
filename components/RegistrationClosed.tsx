import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { DELEGATE_CLOSED_MESSAGE } from "@/lib/submission-config";

// Shown on /register while delegate registration is closed (all types:
// government employees, guests and online). Reopen by flipping
// DELEGATE_REGISTRATION_OPEN in lib/submission-config.ts.
export default function RegistrationClosed() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ height: 6, background: "var(--accent)" }} />
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            className="heading"
            style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}
          >
            DF
          </div>
          <div>
            <div className="heading" style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>
              DIFSC 2026
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: ".03em" }}>
              20TH EDITION &middot; NOV 16&ndash;18, 2026
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ThemeToggle />
          <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
            Staff login &rarr;
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "44px 24px 80px" }}>
        <div className="mono" style={{ fontSize: 12, color: "var(--accent)", letterSpacing: ".08em", fontWeight: 500 }}>
          DELEGATE REGISTRATION
        </div>
        <h1 className="heading" style={{ fontWeight: 800, fontSize: 34, lineHeight: 1.12, margin: "10px 0 8px", letterSpacing: "-.01em" }}>
          Registration is closed
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, margin: 0, maxWidth: 560 }}>{DELEGATE_CLOSED_MESSAGE}</p>
      </div>
    </div>
  );
}
