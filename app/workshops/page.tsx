import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import WorkshopInterestForm from "@/components/WorkshopInterestForm";
import { WORKSHOPS } from "@/lib/workshops-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workshops",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  color: "var(--muted)",
  letterSpacing: ".06em",
  textTransform: "uppercase",
  margin: "18px 0 6px",
};

export default function WorkshopsPage() {
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
          WORKSHOPS
        </div>
        <h1 className="heading" style={{ fontWeight: 800, fontSize: 34, lineHeight: 1.12, margin: "10px 0 12px", letterSpacing: "-.01em" }}>
          DIFSC 2026 Workshops
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, margin: "0 0 28px", maxWidth: 560 }}>
          Two workshops are being held alongside the conference. You can show your interest in one or both below.
        </p>

        {WORKSHOPS.map((w, i) => (
          <div key={w.id} className="card" style={{ padding: "24px 26px 26px", marginBottom: 20 }}>
            <div className="mono" style={{ fontSize: 11.5, color: "var(--accent)", letterSpacing: ".06em", fontWeight: 500 }}>
              WORKSHOP {i + 1}
            </div>
            <h2 className="heading" style={{ fontWeight: 700, fontSize: 21, margin: "6px 0 14px" }}>
              {w.title}
            </h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="chip">{w.dateLabel}</span>
              <span className="chip">{w.timeLabel}</span>
              <span className="chip">{w.venue}</span>
            </div>

            <div style={sectionLabel}>About this workshop</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: w.about ? "var(--ink)" : "var(--muted)" }}>
              {w.about ?? "Details coming soon."}
            </p>

            <div style={sectionLabel}>Speakers</div>
            {w.speakers.length === 0 ? (
              <p style={{ fontSize: 14, margin: 0, color: "var(--muted)" }}>Speakers to be announced.</p>
            ) : (
              w.speakers.map((s) => (
                <div key={s.name} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{s.role}</div>
                  {s.bio && <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 4 }}>{s.bio}</div>}
                </div>
              ))
            )}
          </div>
        ))}

        <div style={{ marginTop: 32 }}>
          <WorkshopInterestForm />
        </div>
      </div>
    </div>
  );
}
