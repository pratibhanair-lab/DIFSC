import type { ApprovedPoster } from "@/lib/posters-view";

export default function PublicPosterListing({ posters }: { posters: ApprovedPoster[] }) {
  return (
    <div style={{ flex: 1, overflow: "auto", background: "var(--bg)", padding: "24px 28px 60px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <h1 className="heading" style={{ fontWeight: 800, fontSize: 24, margin: "0 0 6px" }}>
          Approved posters
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 28px" }}>
          Every poster the programme committee has approved so far.
        </p>

        {posters.map((p) => (
          <div key={p.id} className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 6 }}>
              {p.categoryName}
            </div>
            <h3 className="heading" style={{ fontWeight: 700, fontSize: 17, margin: "0 0 6px" }}>
              {p.title}
            </h3>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              {p.presenterName}
              {p.affiliation ? ` · ${p.affiliation}` : ""}
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: "var(--muted)" }}>{p.abstract}</p>
          </div>
        ))}
        {posters.length === 0 && (
          <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>
            No posters approved yet.
          </div>
        )}
      </div>
    </div>
  );
}
