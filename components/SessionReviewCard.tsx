"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import StatusChip from "@/components/StatusChip";
import SpeakerCard from "@/components/SpeakerCard";
import { decideSession, reviseSession } from "@/lib/actions/review";
import type { SessionView } from "@/lib/submissions-view";

type Category = { id: string; name: string };
type SessionType = { id: string; name: string };

export default function SessionReviewCard({
  session,
  categories,
  sessionTypes,
}: {
  session: SessionView;
  categories: Category[];
  sessionTypes: SessionType[];
}) {
  const router = useRouter();
  const [comment, setComment] = useState(session.reviewComment ?? "");
  const [revising, setRevising] = useState(false);
  const [revTitle, setRevTitle] = useState(session.title);
  const [revCat, setRevCat] = useState(session.categoryId);
  const [revType, setRevType] = useState(session.sessionTypeId);
  const [busy, setBusy] = useState(false);

  function startRevise() {
    setRevTitle(session.title);
    setRevCat(session.categoryId);
    setRevType(session.sessionTypeId);
    setRevising(true);
  }

  async function saveRevise() {
    setBusy(true);
    await reviseSession(session.id, { title: revTitle, categoryId: revCat, sessionTypeId: revType });
    setBusy(false);
    setRevising(false);
    router.refresh();
  }

  async function decide(status: "approved" | "rejected") {
    setBusy(true);
    await decideSession(session.id, status, comment);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ padding: 22, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <h3 className="heading" style={{ fontWeight: 700, fontSize: 17, margin: 0 }}>
          {session.title}
        </h3>
        <StatusChip status={session.status} />
      </div>
      {session.description && <p style={{ fontSize: 14.5, lineHeight: 1.65, margin: "0 0 16px" }}>{session.description}</p>}
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Category</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{session.categoryName}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Session type</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{session.sessionTypeName}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Recommended time</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {session.recommendedDurationHours} {session.recommendedDurationHours > 1 ? "hours" : "hour"}
          </div>
        </div>
      </div>
      {session.partnerOrg && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Partner organization</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{session.partnerOrg}</div>
        </div>
      )}

      {session.speakers.length > 0 && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
            Speakers ({session.speakers.length})
          </div>
          {session.speakers.map((sp) => (
            <SpeakerCard key={sp.id} speaker={sp} showContact />
          ))}
        </div>
      )}

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        {revising ? (
          <div style={{ border: "1.5px solid var(--accent)", borderRadius: 12, padding: 18 }}>
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
              Decision on this session (optional comment)
            </div>
            <textarea
              className="input"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add feedback for the committee..."
              style={{ resize: "vertical", lineHeight: 1.5, marginBottom: 14 }}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-primary" style={{ flex: 1, background: "var(--appr)" }} onClick={() => decide("approved")} disabled={busy}>
                &#10003; Approve session
              </button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={startRevise} disabled={busy}>
                &#9998; Revise
              </button>
              <button className="btn btn-danger-outline" style={{ flex: 1 }} onClick={() => decide("rejected")} disabled={busy}>
                &#10007; Reject session
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
