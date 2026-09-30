"use client";

import { useMemo, useState } from "react";
import StatusChip from "@/components/StatusChip";
import PosterReviewCard from "@/components/PosterReviewCard";
import type { PosterView } from "@/lib/posters-view";

export default function PostersBrowser({ posters }: { posters: PosterView[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posters.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (q) {
        const hit =
          p.title.toLowerCase().includes(q) ||
          p.presenterName.toLowerCase().includes(q) ||
          (p.affiliation ?? "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [posters, search, status]);

  function toggle(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <div>
      <h1 className="heading" style={{ fontWeight: 800, fontSize: 26, margin: "0 0 4px" }}>
        Posters
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 22px" }}>
        Every poster submission, every status. Click a row to review it — approve or reject with an optional comment.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          className="input"
          style={{ width: 260 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, presenter or affiliation..."
        />
        <select className="input" style={{ width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <div style={{ marginLeft: "auto", alignSelf: "center", fontSize: 13, color: "var(--muted)" }}>
          {filtered.length} of {posters.length} shown
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div
          className="mono"
          style={{
            display: "grid",
            gridTemplateColumns: "110px 1fr 180px 140px 110px",
            gap: 12,
            padding: "13px 22px",
            borderBottom: "1px solid var(--line)",
            background: "var(--surface-2)",
            fontSize: 11,
            letterSpacing: ".04em",
            textTransform: "uppercase",
            color: "var(--muted)",
            fontWeight: 500,
          }}
        >
          <div>Reference</div>
          <div>Title</div>
          <div>Presenter</div>
          <div>Category</div>
          <div>Status</div>
        </div>
        {filtered.map((p) => {
          const expanded = expandedId === p.id;
          return (
            <div key={p.id} style={{ borderBottom: "1px solid var(--line)" }}>
              <div
                onClick={() => toggle(p.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px 1fr 180px 140px 110px",
                  gap: 12,
                  padding: "15px 22px",
                  cursor: "pointer",
                  alignItems: "center",
                  background: expanded ? "var(--accent-weak)" : "transparent",
                }}
              >
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                  {p.reference}
                </span>
                <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.title}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.presenterName}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{p.categoryName}</div>
                <div>
                  <StatusChip status={p.status} />
                </div>
              </div>

              {expanded && (
                <div style={{ padding: "0 22px 22px" }}>
                  <PosterReviewCard poster={p} />
                  <div className="card" style={{ padding: 18 }}>
                    <div
                      className="mono"
                      style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}
                    >
                      Contact
                    </div>
                    <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
                      {p.email}
                      {p.phone ? ` · ${p.phone}` : ""}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>No posters match these filters.</div>
        )}
      </div>
    </div>
  );
}
