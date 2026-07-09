"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TypeBadge from "@/components/TypeBadge";
import SpeakerCard from "@/components/SpeakerCard";
import { decideSession, decideSpeakerOnlySubmission, reviseSession } from "@/lib/actions/review";
import type { SubmissionView } from "@/lib/submissions-view";

type Category = { id: string; name: string };
type SessionType = { id: string; name: string };

function titleOf(s: SubmissionView) {
  if (s.session) return s.session.title;
  if (s.speakers.length) return s.speakers[0].name;
  return "Speaker suggestion";
}

export default function ReviewQueue({
  pending,
  categories,
  sessionTypes,
}: {
  pending: SubmissionView[];
  categories: Category[];
  sessionTypes: SessionType[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(pending[0]?.id ?? null);
  const [comment, setComment] = useState("");
  const [revising, setRevising] = useState(false);
  const [revTitle, setRevTitle] = useState("");
  const [revCat, setRevCat] = useState("");
  const [revType, setRevType] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const orgQ = org.trim().toLowerCase();
    return pending.filter((s) => {
      if (catFilter !== "all" && s.session?.categoryId !== catFilter) return false;
      if (orgQ && !(s.orgSectionName ?? "").toLowerCase().includes(orgQ)) return false;
      if (q) {
        const hit = titleOf(s).toLowerCase().includes(q) || s.speakers.some((sp) => sp.name.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [pending, search, org, catFilter]);

  const selected = filtered.find((s) => s.id === selectedId) ?? filtered[0] ?? null;

  function selectItem(id: string) {
    setSelectedId(id);
    setComment("");
    setRevising(false);
  }

  function startRevise() {
    if (!selected?.session) return;
    setRevTitle(selected.session.title);
    setRevCat(selected.session.categoryId);
    setRevType(selected.session.sessionTypeId);
    setRevising(true);
  }

  async function saveRevise() {
    if (!selected?.session) return;
    setBusy(true);
    await reviseSession(selected.session.id, { title: revTitle, categoryId: revCat, sessionTypeId: revType });
    setBusy(false);
    setRevising(false);
    router.refresh();
  }

  async function decide(status: "approved" | "rejected") {
    if (!selected) return;
    setBusy(true);
    if (selected.session) {
      await decideSession(selected.session.id, status, comment);
    } else {
      await decideSpeakerOnlySubmission(selected.id, status, comment);
    }
    setBusy(false);
    setComment("");
    router.refresh();
  }

  return (
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "340px 1fr", minHeight: 0 }}>
      <div style={{ borderRight: "1px solid var(--line)", background: "var(--surface)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "20px 22px 16px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 className="heading" style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>
              Pending review
            </h2>
            <div style={{ background: "var(--accent-weak)", color: "var(--accent-ink)", borderRadius: 20, padding: "3px 11px", fontWeight: 700, fontSize: 13 }}>
              {filtered.length} left
            </div>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 0" }}>Select a submission to review.</p>
        </div>
        <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
          <input className="input" style={{ background: "var(--surface-2)" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sessions or speakers..." />
          <div style={{ display: "flex", gap: 8 }}>
            <select className="input" style={{ flex: 1, background: "var(--surface-2)", fontSize: 12.5 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input className="input" style={{ flex: 1, background: "var(--surface-2)", fontSize: 12.5 }} value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Organization..." />
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {filtered.map((q) => {
            const active = selected?.id === q.id;
            return (
              <button
                key={q.id}
                onClick={() => selectItem(q.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 20px",
                  border: "none",
                  borderBottom: "1px solid var(--line)",
                  borderLeft: `3px solid ${active ? "var(--accent)" : "transparent"}`,
                  background: active ? "var(--accent-weak)" : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <TypeBadge kind={q.kind} />
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {q.reference}
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.35 }}>{titleOf(q)}</div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: "40px 22px", textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>
              &#127881; All caught up &mdash; nothing left to review.
            </div>
          )}
        </div>
      </div>

      <div style={{ overflow: "auto", background: "var(--bg)" }}>
        {selected ? (
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 32px 60px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <TypeBadge kind={selected.kind} />
              <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                {selected.reference}
              </span>
            </div>
            <h1 className="heading" style={{ fontWeight: 800, fontSize: 26, lineHeight: 1.2, margin: "0 0 24px" }}>
              {titleOf(selected)}
            </h1>

            {selected.session && (
              <div className="card" style={{ padding: 22, marginBottom: 16 }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
                  Session topic
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, margin: "0 0 16px" }}>{selected.session.description}</p>
                <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Category</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.session.categoryName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Session type</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.session.sessionTypeName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Recommended time</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {selected.session.recommendedDurationHours} {selected.session.recommendedDurationHours > 1 ? "hours" : "hour"}
                    </div>
                  </div>
                </div>
                {selected.session.partnerOrg && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Partner organization</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.session.partnerOrg}</div>
                  </div>
                )}
              </div>
            )}

            {selected.speakers.length > 0 && (
              <div className="card" style={{ padding: 22, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)" }}>
                    Proposed speakers ({selected.speakers.length})
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Approve or reject each individually</div>
                </div>
                {selected.speakers.map((sp) => (
                  <SpeakerCard key={sp.id} speaker={sp} showContact />
                ))}
              </div>
            )}

            <div className="card" style={{ padding: 22, marginBottom: 24 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
                Submitted by
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.submitterName}</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                {selected.orgSectionName ?? "—"} &middot; {selected.submitterEmail}
              </div>
            </div>

            {revising && selected.session ? (
              <div className="card" style={{ padding: 22, marginBottom: 24, borderColor: "var(--accent)", borderWidth: 1.5 }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 14 }}>
                  Revise session details
                </div>
                <label style={{ display: "block", marginBottom: 14 }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Session title</span>
                  <input className="input" style={{ background: "var(--surface)" }} value={revTitle} onChange={(e) => setRevTitle(e.target.value)} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                  <label style={{ display: "block" }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Category</span>
                    <select className="input" style={{ background: "var(--surface)" }} value={revCat} onChange={(e) => setRevCat(e.target.value)}>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "block" }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Session type</span>
                    <select className="input" style={{ background: "var(--surface)" }} value={revType} onChange={(e) => setRevType(e.target.value)}>
                      {sessionTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveRevise} disabled={busy}>
                    Save revisions
                  </button>
                  <button className="btn btn-muted" onClick={() => setRevising(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
                  Decision on this {selected.session ? "session" : "submission"} (optional comment)
                </div>
                <textarea
                  className="input"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add feedback for the committee..."
                  style={{ resize: "vertical", lineHeight: 1.5, marginBottom: 20 }}
                />
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button className="btn btn-primary" style={{ flex: 1, background: "var(--appr)" }} onClick={() => decide("approved")} disabled={busy}>
                    &#10003; Approve {selected.session ? "session" : ""}
                  </button>
                  {selected.session && (
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={startRevise} disabled={busy}>
                      &#9998; Revise
                    </button>
                  )}
                  <button className="btn btn-danger-outline" style={{ flex: 1 }} onClick={() => decide("rejected")} disabled={busy}>
                    &#10007; Reject {selected.session ? "session" : ""}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40 }}>
            <div>
              <div
                style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--accent-weak)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}
              >
                &#10003;
              </div>
              <h2 className="heading" style={{ fontWeight: 700, fontSize: 22, margin: "0 0 8px" }}>
                Queue cleared
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>You&apos;ve reviewed every pending submission. Thank you.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
