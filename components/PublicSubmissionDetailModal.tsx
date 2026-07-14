import StatusChip from "@/components/StatusChip";
import TypeBadge from "@/components/TypeBadge";
import type { SessionView, SpeakerView, SubmissionView } from "@/lib/submissions-view";

function titleOf(s: SubmissionView) {
  if (s.sessions.length) {
    const first = s.sessions[0].title;
    return s.sessions.length === 1 ? first : `${first} +${s.sessions.length - 1} more`;
  }
  if (s.speakers.length) return s.speakers[0].name;
  return "Speaker suggestion";
}

function PublicSpeakerLine({ speaker }: { speaker: SpeakerView }) {
  const meta = [speaker.location, speaker.affiliation].filter(Boolean).join(" · ");
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 15, marginBottom: 10, background: "var(--surface-2)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <div className="heading" style={{ fontSize: 14.5, fontWeight: 700 }}>
          {speaker.name}
        </div>
        <StatusChip status={speaker.status} />
      </div>
      {meta && <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 4 }}>{meta}</div>}
      {speaker.bio && <p style={{ fontSize: 13, lineHeight: 1.55, margin: "0 0 6px", color: "var(--muted)" }}>{speaker.bio}</p>}
      <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
        Would speak on: <span style={{ color: "var(--ink)" }}>{speaker.topic}</span>
      </div>
    </div>
  );
}

function PublicSessionBlock({ session }: { session: SessionView }) {
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
            <PublicSpeakerLine key={sp.id} speaker={sp} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PublicSubmissionDetailModal({
  submission,
  onClose,
}: {
  submission: SubmissionView;
  onClose: () => void;
}) {
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
            <PublicSessionBlock key={session.id} session={session} />
          ))}

          {submission.sessions.length === 0 && submission.speakers.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
                Speakers ({submission.speakers.length})
              </div>
              {submission.speakers.map((sp) => (
                <PublicSpeakerLine key={sp.id} speaker={sp} />
              ))}
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
              Submitted by
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{submission.submitterName}</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{submission.orgSectionName ?? "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
