"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatusChip from "@/components/StatusChip";
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

export default function SubmissionDetailModal({
  submission,
  categories,
  sessionTypes,
  onClose,
}: {
  submission: SubmissionView;
  categories: Category[];
  sessionTypes: SessionType[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [comment, setComment] = useState(submission.session?.reviewComment ?? "");
  const [revising, setRevising] = useState(false);
  const [revTitle, setRevTitle] = useState(submission.session?.title ?? "");
  const [revCat, setRevCat] = useState(submission.session?.categoryId ?? "");
  const [revType, setRevType] = useState(submission.session?.sessionTypeId ?? "");
  const [busy, setBusy] = useState(false);

  function startRevise() {
    if (!submission.session) return;
    setRevTitle(submission.session.title);
    setRevCat(submission.session.categoryId);
    setRevType(submission.session.sessionTypeId);
    setRevising(true);
  }

  async function saveRevise() {
    if (!submission.session) return;
    setBusy(true);
    await reviseSession(submission.session.id, { title: revTitle, categoryId: revCat, sessionTypeId: revType });
    setBusy(false);
    setRevising(false);
    router.refresh();
  }

  async function decide(status: "approved" | "rejected") {
    setBusy(true);
    if (submission.session) {
      await decideSession(submission.session.id, status, comment);
    } else {
      await decideSpeakerOnlySubmission(submission.id, status, comment);
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,28,24,.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 560, width: "100%", maxHeight: "88vh", overflow: "auto" }}>
        <div style={{ padding: "24px 26px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <TypeBadge kind={submission.kind} />
              <StatusChip status={submission.overallStatus} />
            </div>
            <h2 className="heading" style={{ fontWeight: 700, fontSize: 19, margin: 0, lineHeight: 1.25 }}>
              {titleOf(submission)}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 9, width: 32, height: 32, fontSize: 16, color: "var(--muted)", flexShrink: 0 }}
          >
            &#10005;
          </button>
        </div>
        <div style={{ padding: "22px 26px 26px" }}>
          {submission.session && (
            <div style={{ marginBottom: 20 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
                Session topic
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 12px" }}>{submission.session.description}</p>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <div>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Category</span>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{submission.session.categoryName}</div>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Session type</span>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{submission.session.sessionTypeName}</div>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Duration</span>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {submission.session.recommendedDurationHours} {submission.session.recommendedDurationHours > 1 ? "hours" : "hour"}
                  </div>
                </div>
              </div>
              {submission.session.partnerOrg && (
                <div style={{ marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Partner organization</span>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{submission.session.partnerOrg}</div>
                </div>
              )}
            </div>
          )}

          {submission.speakers.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
                Speakers ({submission.speakers.length})
              </div>
              {submission.speakers.map((sp) => (
                <SpeakerCard key={sp.id} speaker={sp} showContact />
              ))}
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, marginBottom: 20 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
              Submitted by
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{submission.submitterName}</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {submission.orgSectionName ?? "—"} &middot; {submission.submitterEmail}
              {submission.submitterPhone ? ` · ${submission.submitterPhone}` : ""}
            </div>
          </div>

          {revising && submission.session ? (
            <div className="card" style={{ padding: 20, marginBottom: 8, borderColor: "var(--accent)", borderWidth: 1.5 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 14 }}>
                Revise session details
              </div>
              <label style={{ display: "block", marginBottom: 14 }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Session title</span>
                <input className="input" value={revTitle} onChange={(e) => setRevTitle(e.target.value)} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                <label style={{ display: "block" }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Category</span>
                  <select className="input" value={revCat} onChange={(e) => setRevCat(e.target.value)}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "block" }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Session type</span>
                  <select className="input" value={revType} onChange={(e) => setRevType(e.target.value)}>
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
            <div>
              <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
                Decision on this {submission.session ? "session" : "submission"} (optional comment)
              </div>
              <textarea
                className="input"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add feedback for the committee..."
                style={{ resize: "vertical", lineHeight: 1.5, marginBottom: 16 }}
              />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-primary" style={{ flex: 1, background: "var(--appr)" }} onClick={() => decide("approved")} disabled={busy}>
                  &#10003; Approve
                </button>
                {submission.session && (
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={startRevise} disabled={busy}>
                    &#9998; Revise
                  </button>
                )}
                <button className="btn btn-danger-outline" style={{ flex: 1 }} onClick={() => decide("rejected")} disabled={busy}>
                  &#10007; Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
