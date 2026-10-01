import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { POSTER_DEADLINE_LABEL, postersOpen } from "@/lib/submission-config";

// Shown on / and /proposals while speaker/session submissions are closed.
// Posters may still be open — if so, point people to them.
export default function SubmissionsClosed({ showNavTabs = false }: { showNavTabs?: boolean }) {
  const posterOpen = postersOpen();

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
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            className="heading"
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
            }}
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
          CALL FOR CONTRIBUTIONS
        </div>
        <h1 className="heading" style={{ fontWeight: 800, fontSize: 34, lineHeight: 1.12, margin: "10px 0 8px", letterSpacing: "-.01em" }}>
          Speaker &amp; session submissions are closed
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, margin: "0 0 24px", maxWidth: 560 }}>
          Thank you to everyone who suggested a session or speaker for the 20th Dubai International Food Safety
          Conference. Our review committee is now evaluating the submissions.
        </p>

        {posterOpen ? (
          <div
            className="card"
            style={{ padding: "20px 22px", marginBottom: 28, maxWidth: 560, background: "var(--accent-weak)", border: "1px solid var(--accent)" }}
          >
            <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: "0 0 14px", color: "var(--accent-ink)" }}>
              <strong>Poster submissions are still open</strong> until <strong>{POSTER_DEADLINE_LABEL}</strong>.
            </p>
            <Link href="/posters" className="btn btn-primary">
              Submit a poster &rarr;
            </Link>
          </div>
        ) : (
          <div className="card" style={{ padding: "16px 20px", marginBottom: 28, maxWidth: 560 }}>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>Poster submissions are also closed.</p>
          </div>
        )}

        {showNavTabs && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "0 0 32px" }}>
            <Link href="/overview" className="btn btn-outline" style={{ fontSize: 13 }}>
              Overview dashboard
            </Link>
            <Link href="/submissions" className="btn btn-outline" style={{ fontSize: 13 }}>
              All submissions
            </Link>
            <Link href="/programme" className="btn btn-outline" style={{ fontSize: 13 }}>
              Conference programme
            </Link>
            <Link href="/approved" className="btn btn-outline" style={{ fontSize: 13 }}>
              Approved sessions &amp; speakers
            </Link>
            <Link href="/posters/approved" className="btn btn-outline" style={{ fontSize: 13 }}>
              Approved posters
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
