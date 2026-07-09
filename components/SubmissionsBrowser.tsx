"use client";

import { useMemo, useState } from "react";
import StatusChip from "@/components/StatusChip";
import TypeBadge from "@/components/TypeBadge";
import SubmissionDetailModal from "@/components/SubmissionDetailModal";
import type { SubmissionView } from "@/lib/submissions-view";

type Props = {
  submissions: SubmissionView[];
  categories: { id: string; name: string }[];
  sessionTypes: { id: string; name: string }[];
};

function titleOf(s: SubmissionView) {
  if (s.session) return s.session.title;
  if (s.speakers.length) return s.speakers[0].name;
  return "Speaker suggestion";
}
function sublineOf(s: SubmissionView) {
  if (s.session && s.speakers.length) {
    const names = s.speakers.length === 1 ? s.speakers[0].name : `${s.speakers[0].name} +${s.speakers.length - 1} more`;
    return `Speakers: ${names}`;
  }
  if (!s.session && s.speakers.length) return s.speakers[0].topic || "Speaker suggestion";
  return s.session?.description ? s.session.description.slice(0, 60) + "..." : "";
}

export default function SubmissionsBrowser({ submissions, categories, sessionTypes }: Props) {
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [modalId, setModalId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const orgQ = org.trim().toLowerCase();
    return submissions.filter((s) => {
      if (type === "session" && !(s.kind === "session" || s.kind === "both")) return false;
      if (type === "speaker" && !(s.kind === "speaker" || s.kind === "both")) return false;
      if (category !== "all" && s.session?.categoryId !== category) return false;
      if (status !== "all" && s.overallStatus !== status) return false;
      if (orgQ && !(s.orgSectionName ?? "").toLowerCase().includes(orgQ)) return false;
      if (q) {
        const hit = titleOf(s).toLowerCase().includes(q) || s.speakers.some((sp) => sp.name.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [submissions, search, org, type, category, status]);

  const modal = submissions.find((s) => s.id === modalId) ?? null;

  return (
    <div>
      <h1 className="heading" style={{ fontWeight: 800, fontSize: 26, margin: "0 0 4px" }}>
        Submissions
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 22px" }}>
        All suggestions from the team. Click a row for full detail, including approving, rejecting, or revising it.
      </p>
      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <input className="input" style={{ width: 220 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sessions or speakers..." />
        <input className="input" style={{ width: 200 }} value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Filter by organization..." />
        <select className="input" style={{ width: "auto" }} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All types</option>
          <option value="session">Session topics</option>
          <option value="speaker">Speakers</option>
        </select>
        <select className="input" style={{ width: "auto" }} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="input" style={{ width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <div style={{ marginLeft: "auto", alignSelf: "center", fontSize: 13, color: "var(--muted)" }}>
          {filtered.length} of {submissions.length} shown
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div
          className="mono"
          style={{
            display: "grid",
            gridTemplateColumns: "90px 1fr 180px 130px 120px",
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
          <div>Type</div>
          <div>Title / Speaker</div>
          <div>Category</div>
          <div>Submitter</div>
          <div>Status</div>
        </div>
        {filtered.map((r) => (
          <div
            key={r.id}
            onClick={() => setModalId(r.id)}
            style={{
              display: "grid",
              gridTemplateColumns: "90px 1fr 180px 130px 120px",
              gap: 12,
              padding: "15px 22px",
              borderBottom: "1px solid var(--line)",
              cursor: "pointer",
              alignItems: "center",
            }}
          >
            <div>
              <TypeBadge kind={r.kind} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titleOf(r)}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sublineOf(r)}</div>
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{r.session?.categoryName ?? "—"}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.submitterName}</div>
            <div>
              <StatusChip status={r.overallStatus} />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>No submissions match these filters.</div>
        )}
      </div>

      {modal && (
        <SubmissionDetailModal
          key={modal.id}
          submission={modal}
          categories={categories}
          sessionTypes={sessionTypes}
          onClose={() => setModalId(null)}
        />
      )}
    </div>
  );
}
