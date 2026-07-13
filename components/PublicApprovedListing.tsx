import type { ApprovedListing, ApprovedSpeaker } from "@/lib/approved-view";

function SpeakerLine({ speaker }: { speaker: ApprovedSpeaker }) {
  const meta = [speaker.location, speaker.affiliation].filter(Boolean).join(" · ");
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{speaker.name}</div>
      {meta && <div style={{ fontSize: 12, color: "var(--muted)" }}>{meta}</div>}
      <div style={{ fontSize: 13, marginTop: 2 }}>{speaker.topic}</div>
      {speaker.bio && <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, margin: "4px 0 0" }}>{speaker.bio}</p>}
    </div>
  );
}

export default function PublicApprovedListing({ listing }: { listing: ApprovedListing }) {
  return (
    <div style={{ flex: 1, overflow: "auto", background: "var(--bg)", padding: "24px 28px 60px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <h1 className="heading" style={{ fontWeight: 800, fontSize: 24, margin: "0 0 6px" }}>
          Approved sessions &amp; speakers
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 28px" }}>
          Everything the programme committee has approved so far, whether or not it&apos;s been placed on the
          schedule yet.
        </p>

        <h2 className="heading" style={{ fontWeight: 700, fontSize: 16, margin: "0 0 14px" }}>
          Sessions ({listing.sessions.length})
        </h2>
        {listing.sessions.map((s) => (
          <div key={s.id} className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 6 }}>
              {s.categoryName} &middot; {s.sessionTypeName}
            </div>
            <h3 className="heading" style={{ fontWeight: 700, fontSize: 17, margin: "0 0 8px" }}>
              {s.title}
            </h3>
            {s.description && <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 10px", color: "var(--muted)" }}>{s.description}</p>}
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
              {s.recommendedDurationHours} {s.recommendedDurationHours > 1 ? "hours" : "hour"}
              {s.partnerOrg ? ` · Partner: ${s.partnerOrg}` : ""}
            </div>
            {s.speakers.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                {s.speakers.map((sp) => (
                  <SpeakerLine key={sp.id} speaker={sp} />
                ))}
              </div>
            )}
          </div>
        ))}
        {listing.sessions.length === 0 && (
          <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13.5, marginBottom: 14 }}>
            No sessions approved yet.
          </div>
        )}

        {listing.standaloneSpeakers.length > 0 && (
          <>
            <h2 className="heading" style={{ fontWeight: 700, fontSize: 16, margin: "28px 0 14px" }}>
              Speakers ({listing.standaloneSpeakers.length})
            </h2>
            <div className="card" style={{ padding: "4px 20px" }}>
              {listing.standaloneSpeakers.map((sp) => (
                <SpeakerLine key={sp.id} speaker={sp} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
