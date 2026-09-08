"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TypeBadge from "@/components/TypeBadge";
import SourceBadge from "@/components/SourceBadge";
import SpeakerCard from "@/components/SpeakerCard";
import SessionReviewCard from "@/components/SessionReviewCard";
import PosterReviewCard from "@/components/PosterReviewCard";
import { decideSpeakerOnlySubmission } from "@/lib/actions/review";
import type { SubmissionView } from "@/lib/submissions-view";
import type { PosterView } from "@/lib/posters-view";

type Category = { id: string; name: string };
type SessionType = { id: string; name: string };

type QueueItem =
  | { type: "submission"; id: string; submission: SubmissionView }
  | { type: "poster"; id: string; poster: PosterView };

function titleOf(item: QueueItem): string {
  if (item.type === "poster") return item.poster.title;
  const s = item.submission;
  if (s.sessions.length) {
    const first = s.sessions[0].title;
    return s.sessions.length === 1 ? first : `${first} +${s.sessions.length - 1} more`;
  }
  if (s.speakers.length) return s.speakers[0].name;
  return "Speaker suggestion";
}

export default function ReviewQueue({
  pending,
  pendingPosters,
  categories,
  sessionTypes,
}: {
  pending: SubmissionView[];
  pendingPosters: PosterView[];
  categories: Category[];
  sessionTypes: SessionType[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const items: QueueItem[] = useMemo(
    () => [
      ...pending.map((submission): QueueItem => ({ type: "submission", id: submission.id, submission })),
      ...pendingPosters.map((poster): QueueItem => ({ type: "poster", id: poster.id, poster })),
    ],
    [pending, pendingPosters]
  );

  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const orgQ = org.trim().toLowerCase();
    return items.filter((item) => {
      if (item.type === "poster") {
        if (catFilter !== "all" && item.poster.categoryId !== catFilter) return false;
        // Posters have no source/organization — exclude them once either filter narrows the list.
        if (sourceFilter !== "all") return false;
        if (orgQ) return false;
        if (q) {
          const hit = item.poster.title.toLowerCase().includes(q) || item.poster.presenterName.toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      }
      const s = item.submission;
      if (catFilter !== "all" && !s.sessions.some((sess) => sess.categoryId === catFilter)) return false;
      if (sourceFilter !== "all" && s.source !== sourceFilter) return false;
      if (orgQ && !(s.orgSectionName ?? "").toLowerCase().includes(orgQ)) return false;
      if (q) {
        const allSpeakers = [...s.speakers, ...s.sessions.flatMap((sess) => sess.speakers)];
        const hit = titleOf(item).toLowerCase().includes(q) || allSpeakers.some((sp) => sp.name.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [items, search, org, catFilter, sourceFilter]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  function selectItem(id: string) {
    setSelectedId(id);
    setComment("");
  }

  async function decideSubmission(status: "approved" | "rejected") {
    if (!selected || selected.type !== "submission") return;
    setBusy(true);
    await decideSpeakerOnlySubmission(selected.submission.id, status, comment);
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
          <input className="input" style={{ background: "var(--surface-2)" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sessions, speakers or posters..." />
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
          <select className="input" style={{ background: "var(--surface-2)", fontSize: 12.5 }} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="all">External + Internal</option>
            <option value="external">External only</option>
            <option value="internal">Internal (DM staff) only</option>
          </select>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {filtered.map((item) => {
            const active = selected?.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => selectItem(item.id)}
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
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <TypeBadge kind={item.type === "poster" ? "poster" : item.submission.kind} />
                  {item.type === "submission" && <SourceBadge source={item.submission.source} />}
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {item.type === "poster" ? item.poster.reference : item.submission.reference}
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.35 }}>{titleOf(item)}</div>
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
              <TypeBadge kind={selected.type === "poster" ? "poster" : selected.submission.kind} />
              {selected.type === "submission" && <SourceBadge source={selected.submission.source} />}
              <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                {selected.type === "poster" ? selected.poster.reference : selected.submission.reference}
              </span>
              {selected.type === "submission" && selected.submission.sessions.length > 1 && (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>&middot; {selected.submission.sessions.length} sessions in this submission</span>
              )}
            </div>
            <h1 className="heading" style={{ fontWeight: 800, fontSize: 26, lineHeight: 1.2, margin: "0 0 24px" }}>
              {titleOf(selected)}
            </h1>

            {selected.type === "poster" ? (
              <>
                <PosterReviewCard poster={selected.poster} />
                <div className="card" style={{ padding: 22, marginBottom: 24 }}>
                  <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
                    Submitted by
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.poster.presenterName}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    {selected.poster.affiliation ?? "—"} &middot; {selected.poster.email}
                    {selected.poster.phone ? ` · ${selected.poster.phone}` : ""}
                  </div>
                </div>
              </>
            ) : (
              <>
                {selected.submission.sessions.map((session) => (
                  <SessionReviewCard key={session.id} session={session} categories={categories} sessionTypes={sessionTypes} />
                ))}

                {selected.submission.sessions.length === 0 && selected.submission.speakers.length > 0 && (
                  <div className="card" style={{ padding: 22, marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)" }}>
                        Proposed speakers ({selected.submission.speakers.length})
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Approve or reject each individually</div>
                    </div>
                    {selected.submission.speakers.map((sp) => (
                      <SpeakerCard key={sp.id} speaker={sp} showContact />
                    ))}
                  </div>
                )}

                <div className="card" style={{ padding: 22, marginBottom: 24 }}>
                  <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
                    Submitted by
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.submission.submitterName}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    {selected.submission.orgSectionName ?? "—"} &middot; {selected.submission.submitterEmail}
                  </div>
                </div>

                {selected.submission.sessions.length === 0 && (
                  <>
                    <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
                      Decision on this submission (optional comment)
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
                      <button className="btn btn-primary" style={{ flex: 1, background: "var(--appr)" }} onClick={() => decideSubmission("approved")} disabled={busy}>
                        &#10003; Approve
                      </button>
                      <button className="btn btn-danger-outline" style={{ flex: 1 }} onClick={() => decideSubmission("rejected")} disabled={busy}>
                        &#10007; Reject
                      </button>
                    </div>
                  </>
                )}
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
