"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatusChip from "@/components/StatusChip";
import TypeBadge from "@/components/TypeBadge";
import SpeakerCard from "@/components/SpeakerCard";
import SessionReviewCard from "@/components/SessionReviewCard";
import { decideSpeakerOnlySubmission } from "@/lib/actions/review";
import { deleteSubmission } from "@/lib/actions/submissions";
import type { SubmissionView } from "@/lib/submissions-view";

type Category = { id: string; name: string };
type SessionType = { id: string; name: string };

function titleOf(s: SubmissionView) {
  if (s.sessions.length) {
    const first = s.sessions[0].title;
    return s.sessions.length === 1 ? first : `${first} +${s.sessions.length - 1} more`;
  }
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
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function decideSubmission(status: "approved" | "rejected") {
    setBusy(true);
    await decideSpeakerOnlySubmission(submission.id, status, comment);
    setBusy(false);
    router.refresh();
  }

  async function confirmDelete() {
    setDeleteBusy(true);
    setDeleteError("");
    const result = await deleteSubmission(submission.id, passcode);
    setDeleteBusy(false);
    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,28,24,.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 620, width: "100%", maxHeight: "88vh", overflow: "auto" }}>
        <div style={{ padding: "24px 26px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <TypeBadge kind={submission.kind} />
              <StatusChip status={submission.overallStatus} />
              <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                {submission.reference}
              </span>
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
          {submission.sessions.map((session) => (
            <SessionReviewCard key={session.id} session={session} categories={categories} sessionTypes={sessionTypes} />
          ))}

          {submission.sessions.length === 0 && submission.speakers.length > 0 && (
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

          {submission.sessions.length === 0 && (
            <div style={{ marginBottom: 8 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
                Decision on this submission (optional comment)
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
                <button className="btn btn-primary" style={{ flex: 1, background: "var(--appr)" }} onClick={() => decideSubmission("approved")} disabled={busy}>
                  &#10003; Approve
                </button>
                <button className="btn btn-danger-outline" style={{ flex: 1 }} onClick={() => decideSubmission("rejected")} disabled={busy}>
                  &#10007; Reject
                </button>
              </div>
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, marginTop: 20 }}>
            {!deleting ? (
              <button
                onClick={() => {
                  setDeleting(true);
                  setDeleteError("");
                  setPasscode("");
                }}
                style={{ background: "none", border: "1px solid var(--rej)", color: "var(--rej)", borderRadius: 9, padding: "9px 14px", fontSize: 13, fontWeight: 600 }}
              >
                Delete this submission
              </button>
            ) : (
              <div style={{ border: "1.5px solid var(--rej)", borderRadius: 12, padding: 16 }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--rej)", marginBottom: 10 }}>
                  Confirm delete
                </div>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>
                  This permanently removes the submission and everything under it (sessions, speakers, schedule
                  placement). Enter the passcode to confirm.
                </p>
                <input
                  className="input"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Passcode"
                  style={{ marginBottom: 12 }}
                />
                {deleteError && <div style={{ color: "var(--rej)", fontSize: 12.5, marginBottom: 12 }}>{deleteError}</div>}
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-danger-outline" style={{ flex: 1 }} onClick={confirmDelete} disabled={deleteBusy || !passcode}>
                    {deleteBusy ? "Deleting..." : "Confirm delete"}
                  </button>
                  <button className="btn btn-muted" onClick={() => setDeleting(false)} disabled={deleteBusy}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
