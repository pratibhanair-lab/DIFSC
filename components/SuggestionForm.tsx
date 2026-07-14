"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { submitSuggestion, type SubmitSessionInput, type SubmitSpeakerInput } from "@/lib/actions/submissions";
import type { SpeakerLocation } from "@/lib/types";

type Lookup = { id: string; name: string };

type Kind = "session" | "speaker" | "both";

export type InitialSubmitter = {
  name: string;
  email: string;
  phone: string;
  orgSectionId: string;
};

const SUBMITTER_COOKIE = "difsc_submitter";
const LOCATION_OPTIONS: SpeakerLocation[] = ["International", "GCC", "UAE", "DM"];

const KIND_OPTIONS: { key: Kind; label: string; desc: string }[] = [
  { key: "session", label: "Session topic", desc: "Propose a talk or session" },
  { key: "speaker", label: "Speaker", desc: "Recommend a speaker" },
  { key: "both", label: "Both", desc: "Speaker(s) for a session topic" },
];

function blankSpeaker(): SubmitSpeakerInput {
  return { name: "", contact: "", bio: "", topic: "", location: "", affiliation: "" };
}

function blankSession(withSpeaker: boolean): SubmitSessionInput {
  return {
    title: "",
    description: "",
    categoryId: "",
    sessionTypeId: "",
    durationHours: 1,
    partnerOrg: "",
    speakers: withSpeaker ? [blankSpeaker()] : [],
  };
}

function labelStyle(): React.CSSProperties {
  return { display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 };
}

/** Shared fields for one speaker, used both standalone and nested under a session. */
function SpeakerFields({
  sp,
  onChange,
  onRemove,
  canRemove,
  label,
}: {
  sp: SubmitSpeakerInput;
  onChange: (patch: Partial<SubmitSpeakerInput>) => void;
  onRemove: () => void;
  canRemove: boolean;
  label: string;
}) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 13, padding: 18, marginBottom: 14, background: "var(--surface-2)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 500 }}>
          {label}
        </span>
        {canRemove && (
          <button onClick={onRemove} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, padding: "2px 8px", borderRadius: 6 }}>
            Remove
          </button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <label style={{ display: "block" }}>
          <span style={labelStyle()}>
            Speaker name <span style={{ color: "var(--rej)" }}>*</span>
          </span>
          <input className="input" style={{ background: "var(--surface)" }} value={sp.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Dr. Sarah Kwan" />
        </label>
        <label style={{ display: "block" }}>
          <span style={labelStyle()}>Speaker contact</span>
          <input className="input" style={{ background: "var(--surface)" }} value={sp.contact} onChange={(e) => onChange({ contact: e.target.value })} placeholder="Email or phone" />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <label style={{ display: "block" }}>
          <span style={labelStyle()}>Speaker location</span>
          <select className="input" style={{ background: "var(--surface)" }} value={sp.location} onChange={(e) => onChange({ location: e.target.value as SpeakerLocation | "" })}>
            <option value="">Select...</option>
            {LOCATION_OPTIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "block" }}>
          <span style={labelStyle()}>Affiliation</span>
          <input className="input" style={{ background: "var(--surface)" }} value={sp.affiliation} onChange={(e) => onChange({ affiliation: e.target.value })} placeholder="Organization / employer" />
        </label>
      </div>
      <label style={{ display: "block", marginBottom: 14 }}>
        <span style={labelStyle()}>Bio / credentials</span>
        <textarea
          className="input"
          style={{ background: "var(--surface)", resize: "vertical", lineHeight: 1.5 }}
          rows={2}
          value={sp.bio}
          onChange={(e) => onChange({ bio: e.target.value })}
          placeholder="Relevant experience, affiliation, notable work..."
        />
      </label>
      <label style={{ display: "block" }}>
        <span style={labelStyle()}>
          Topic they&apos;d speak on <span style={{ color: "var(--rej)" }}>*</span>
        </span>
        <input className="input" style={{ background: "var(--surface)" }} value={sp.topic} onChange={(e) => onChange({ topic: e.target.value })} placeholder="Free text - what they'd present" />
      </label>
    </div>
  );
}

export default function SuggestionForm({
  categories,
  sessionTypes,
  orgSections,
  initialSubmitter,
}: {
  categories: Lookup[];
  sessionTypes: Lookup[];
  orgSections: Lookup[];
  initialSubmitter?: InitialSubmitter | null;
}) {
  const [phase, setPhase] = useState<"form" | "confirm">("form");
  const [confirmName, setConfirmName] = useState("");
  const [confirmRef, setConfirmRef] = useState("");

  const [kind, setKind] = useState<Kind>("session");
  const [subName, setSubName] = useState(initialSubmitter?.name ?? "");
  const [subEmail, setSubEmail] = useState(initialSubmitter?.email ?? "");
  const [subPhone, setSubPhone] = useState(initialSubmitter?.phone ?? "");
  const [orgSectionId, setOrgSectionId] = useState(initialSubmitter?.orgSectionId ?? "");

  const [sessions, setSessions] = useState<SubmitSessionInput[]>([blankSession(false)]);
  const [speakers, setSpeakers] = useState<SubmitSpeakerInput[]>([blankSpeaker()]);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showSession = kind === "session" || kind === "both";
  const showSpeaker = kind === "speaker";
  const showNestedSpeakers = kind === "both";

  function updateSession(idx: number, patch: Partial<SubmitSessionInput>) {
    setSessions((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function addSession() {
    setSessions((prev) => [...prev, blankSession(showNestedSpeakers)]);
  }
  function removeSession(idx: number) {
    setSessions((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateSessionSpeaker(sessionIdx: number, speakerIdx: number, patch: Partial<SubmitSpeakerInput>) {
    setSessions((prev) =>
      prev.map((s, i) => (i === sessionIdx ? { ...s, speakers: s.speakers.map((sp, j) => (j === speakerIdx ? { ...sp, ...patch } : sp)) } : s))
    );
  }
  function addSessionSpeaker(sessionIdx: number) {
    setSessions((prev) => prev.map((s, i) => (i === sessionIdx ? { ...s, speakers: [...s.speakers, blankSpeaker()] } : s)));
  }
  function removeSessionSpeaker(sessionIdx: number, speakerIdx: number) {
    setSessions((prev) => prev.map((s, i) => (i === sessionIdx ? { ...s, speakers: s.speakers.filter((_, j) => j !== speakerIdx) } : s)));
  }
  function updateSpeaker(idx: number, patch: Partial<SubmitSpeakerInput>) {
    setSpeakers((prev) => prev.map((sp, i) => (i === idx ? { ...sp, ...patch } : sp)));
  }

  function rememberSubmitter() {
    const value = JSON.stringify({ name: subName.trim(), email: subEmail.trim(), phone: subPhone.trim(), orgSectionId });
    document.cookie = `${SUBMITTER_COOKIE}=${encodeURIComponent(value)}; max-age=15552000; path=/`;
  }

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    const result = await submitSuggestion({
      kind,
      subName,
      subEmail,
      subPhone,
      orgSectionId,
      sessions: showSession ? sessions.map((s) => ({ ...s, speakers: showNestedSpeakers ? s.speakers : [] })) : undefined,
      speakers: showSpeaker ? speakers : undefined,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    rememberSubmitter();
    setConfirmName(result.firstName);
    setConfirmRef(result.reference);
    setPhase("confirm");
  }

  function resetForm() {
    setKind("session");
    setSessions([blankSession(false)]);
    setSpeakers([blankSpeaker()]);
    setError("");
    setPhase("form");
  }

  if (phase === "confirm") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--accent-weak)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="heading" style={{ fontWeight: 800, fontSize: 28, margin: "0 0 12px" }}>
            Suggestion received
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, margin: "0 0 24px" }}>
            Thank you, {confirmName}. Your suggestion has been sent to the review committee. We&apos;ll be in
            touch at the email you provided.
          </p>
          <div className="card" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 18px", marginBottom: 32 }}>
            <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              REFERENCE
            </span>
            <span className="mono" style={{ fontWeight: 500, fontSize: 14 }}>
              {confirmRef}
            </span>
          </div>
          <div>
            <button className="btn btn-primary" onClick={resetForm}>
              Submit another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ height: 6, background: "var(--accent)" }} />
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            className="heading"
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            DF
          </div>
          <div>
            <div className="heading" style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>
              DIFSC 2026
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: ".03em" }}>
              20TH EDITION &middot; NOV 16&ndash;18, 2026
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ThemeToggle />
          <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
            Staff login &rarr;
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "44px 24px 80px" }}>
        <div className="mono" style={{ fontSize: 12, color: "var(--accent)", letterSpacing: ".08em", fontWeight: 500 }}>
          CALL FOR CONTRIBUTIONS
        </div>
        <h1 className="heading" style={{ fontWeight: 800, fontSize: 34, lineHeight: 1.12, margin: "10px 0 8px", letterSpacing: "-.01em" }}>
          Suggest a session or speaker
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, margin: "0 0 24px", maxWidth: 560 }}>
          Help shape the programme. Submit a session topic, recommend a speaker, or both. Our review committee
          evaluates every suggestion before scheduling.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "0 0 32px" }}>
          <Link href="/overview" className="btn btn-outline" style={{ fontSize: 13 }}>
            Overview dashboard
          </Link>
          <Link href="/submissions" className="btn btn-outline" style={{ fontSize: 13 }}>
            All submissions
          </Link>
          <Link href="/programme" className="btn btn-outline" style={{ fontSize: 13 }}>
            Conference programme
          </Link>
          <Link href="/approved" className="btn btn-outline" style={{ fontSize: 13 }}>
            Approved sessions &amp; speakers
          </Link>
        </div>

        <div className="mono" style={{ fontSize: 12, fontWeight: 500, letterSpacing: ".03em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 12 }}>
          What are you suggesting?
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 36 }}>
          {KIND_OPTIONS.map((opt) => {
            const active = kind === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setKind(opt.key)}
                style={{
                  textAlign: "left",
                  padding: 16,
                  borderRadius: 13,
                  background: active ? "var(--accent-weak)" : "var(--surface)",
                  border: `1.5px solid ${active ? "var(--accent)" : "var(--line)"}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      border: `3px solid ${active ? "var(--accent)" : "var(--line)"}`,
                      background: active ? "var(--accent)" : "transparent",
                    }}
                  />
                  <span className="heading" style={{ fontWeight: 700, fontSize: 15 }}>
                    {opt.label}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.4 }}>{opt.desc}</div>
              </button>
            );
          })}
        </div>

        <div className="card" style={{ padding: "26px 26px 28px", marginBottom: 20 }}>
          <h3 className="heading" style={{ fontWeight: 700, fontSize: 16, margin: "0 0 4px" }}>
            Your details
          </h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px" }}>So we can follow up on your suggestion.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <label style={{ display: "block" }}>
              <span style={labelStyle()}>
                Full name <span style={{ color: "var(--rej)" }}>*</span>
              </span>
              <input className="input" value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Jane Doe" />
            </label>
            <label style={{ display: "block" }}>
              <span style={labelStyle()}>
                Email <span style={{ color: "var(--rej)" }}>*</span>
              </span>
              <input className="input" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} placeholder="jane@org.gov" />
            </label>
            <label style={{ display: "block" }}>
              <span style={labelStyle()}>Phone</span>
              <input className="input" value={subPhone} onChange={(e) => setSubPhone(e.target.value)} placeholder="+971 ..." />
            </label>
            <label style={{ display: "block" }}>
              <span style={labelStyle()}>Organization section</span>
              <select className="input" value={orgSectionId} onChange={(e) => setOrgSectionId(e.target.value)}>
                <option value="">Select a section...</option>
                {orgSections.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {showSession &&
          sessions.map((s, sIdx) => (
            <div key={sIdx} className="card" style={{ padding: 26, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    className="heading"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      background: "var(--accent-weak)",
                      color: "var(--accent-ink)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    S
                  </div>
                  <h3 className="heading" style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>
                    Session topic {sessions.length > 1 ? sIdx + 1 : ""}
                  </h3>
                </div>
                {sessions.length > 1 && (
                  <button onClick={() => removeSession(sIdx)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, padding: "2px 8px", borderRadius: 6 }}>
                    Remove
                  </button>
                )}
              </div>
              <label style={{ display: "block", marginBottom: 16 }}>
                <span style={labelStyle()}>
                  Topic title <span style={{ color: "var(--rej)" }}>*</span>
                </span>
                <input
                  className="input"
                  value={s.title}
                  onChange={(e) => updateSession(sIdx, { title: e.target.value })}
                  placeholder="e.g. Rapid pathogen detection in poultry supply chains"
                />
              </label>
              <label style={{ display: "block", marginBottom: 16 }}>
                <span style={labelStyle()}>Short description</span>
                <textarea
                  className="input"
                  rows={3}
                  value={s.description}
                  onChange={(e) => updateSession(sIdx, { description: e.target.value })}
                  placeholder="What will this session cover, and why does it matter?"
                  style={{ resize: "vertical", lineHeight: 1.5 }}
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <label style={{ display: "block" }}>
                  <span style={labelStyle()}>
                    Category <span style={{ color: "var(--rej)" }}>*</span>
                  </span>
                  <select className="input" value={s.categoryId} onChange={(e) => updateSession(sIdx, { categoryId: e.target.value })}>
                    <option value="">Select a category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "block" }}>
                  <span style={labelStyle()}>
                    Session type <span style={{ color: "var(--rej)" }}>*</span>
                  </span>
                  <select className="input" value={s.sessionTypeId} onChange={(e) => updateSession(sIdx, { sessionTypeId: e.target.value })}>
                    <option value="">Select a type...</option>
                    {sessionTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "block" }}>
                  <span style={labelStyle()}>Recommended duration</span>
                  <select className="input" value={s.durationHours} onChange={(e) => updateSession(sIdx, { durationHours: parseInt(e.target.value, 10) || 1 })}>
                    <option value="1">1 hour</option>
                    <option value="2">2 hours</option>
                    <option value="3">3 hours</option>
                  </select>
                </label>
              </div>
              <label style={{ display: "block", marginTop: 16 }}>
                <span style={labelStyle()}>Partner organization</span>
                <input
                  className="input"
                  value={s.partnerOrg}
                  onChange={(e) => updateSession(sIdx, { partnerOrg: e.target.value })}
                  placeholder="Optional - co-organizing or supporting organization"
                />
              </label>

              {showNestedSpeakers && (
                <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1px dashed var(--line)" }}>
                  <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>
                    Speakers for this session
                  </div>
                  {s.speakers.map((sp, spIdx) => (
                    <SpeakerFields
                      key={spIdx}
                      sp={sp}
                      label={`Speaker ${spIdx + 1}`}
                      canRemove={s.speakers.length > 1}
                      onChange={(patch) => updateSessionSpeaker(sIdx, spIdx, patch)}
                      onRemove={() => removeSessionSpeaker(sIdx, spIdx)}
                    />
                  ))}
                  <button
                    onClick={() => addSessionSpeaker(sIdx)}
                    style={{ width: "100%", background: "none", border: "1.5px dashed var(--line)", borderRadius: 11, padding: 12, fontWeight: 600, fontSize: 14, color: "var(--accent)" }}
                  >
                    + Add speaker for this session
                  </button>
                </div>
              )}
            </div>
          ))}

        {showSession && (
          <button
            onClick={addSession}
            style={{
              width: "100%",
              background: "none",
              border: "1.5px dashed var(--accent)",
              borderRadius: 11,
              padding: 14,
              fontWeight: 700,
              fontSize: 14.5,
              color: "var(--accent)",
              marginBottom: 20,
            }}
          >
            + Add another session
          </button>
        )}

        {showSpeaker && (
          <div className="card" style={{ padding: 26, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div
                className="heading"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  background: "var(--accent-weak)",
                  color: "var(--accent-ink)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                P
              </div>
              <h3 className="heading" style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>
                Speaker(s)
              </h3>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 18px" }}>
              Suggest one or more speakers. Add as many as you&apos;d like.
            </p>

            {speakers.map((sp, idx) => (
              <SpeakerFields
                key={idx}
                sp={sp}
                label={`Speaker ${idx + 1}`}
                canRemove={speakers.length > 1}
                onChange={(patch) => updateSpeaker(idx, patch)}
                onRemove={() => setSpeakers((prev) => prev.filter((_, i) => i !== idx))}
              />
            ))}

            <button
              onClick={() => setSpeakers((prev) => [...prev, blankSpeaker()])}
              style={{
                width: "100%",
                background: "none",
                border: "1.5px dashed var(--line)",
                borderRadius: 11,
                padding: 12,
                fontWeight: 600,
                fontSize: 14,
                color: "var(--accent)",
              }}
            >
              + Add another speaker
            </button>
          </div>
        )}

        {error && (
          <div style={{ background: "var(--rej-bg)", color: "var(--rej)", borderRadius: 11, padding: "12px 16px", fontSize: 13.5, fontWeight: 500, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit suggestion"}
          </button>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>You&apos;ll receive a confirmation and reference number.</span>
        </div>
      </div>
    </div>
  );
}
