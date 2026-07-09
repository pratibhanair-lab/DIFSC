"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { submitSuggestion, type SubmitSpeakerInput } from "@/lib/actions/submissions";

type Lookup = { id: string; name: string };

type Kind = "session" | "speaker" | "both";

const KIND_OPTIONS: { key: Kind; label: string; desc: string }[] = [
  { key: "session", label: "Session topic", desc: "Propose a talk or session" },
  { key: "speaker", label: "Speaker", desc: "Recommend a speaker" },
  { key: "both", label: "Both", desc: "Speaker(s) for a session topic" },
];

function blankSpeaker(): SubmitSpeakerInput {
  return { name: "", contact: "", bio: "", topic: "" };
}

export default function SuggestionForm({
  categories,
  sessionTypes,
  orgSections,
}: {
  categories: Lookup[];
  sessionTypes: Lookup[];
  orgSections: Lookup[];
}) {
  const [phase, setPhase] = useState<"form" | "confirm">("form");
  const [confirmName, setConfirmName] = useState("");
  const [confirmRef, setConfirmRef] = useState("");

  const [kind, setKind] = useState<Kind>("session");
  const [subName, setSubName] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [subPhone, setSubPhone] = useState("");
  const [orgSectionId, setOrgSectionId] = useState("");

  const [sesTitle, setSesTitle] = useState("");
  const [sesDesc, setSesDesc] = useState("");
  const [sesCat, setSesCat] = useState("");
  const [sesType, setSesType] = useState("");
  const [sesDur, setSesDur] = useState("1");
  const [sesPartnerOrg, setSesPartnerOrg] = useState("");

  const [speakers, setSpeakers] = useState<SubmitSpeakerInput[]>([blankSpeaker()]);
  const [linkToSession, setLinkToSession] = useState(true);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showSession = kind === "session" || kind === "both";
  const showSpeaker = kind === "speaker" || kind === "both";

  function updateSpeaker(idx: number, patch: Partial<SubmitSpeakerInput>) {
    setSpeakers((prev) => prev.map((sp, i) => (i === idx ? { ...sp, ...patch } : sp)));
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
      linkSpeakersToSession: linkToSession,
      session: showSession
        ? {
            title: sesTitle,
            description: sesDesc,
            categoryId: sesCat,
            sessionTypeId: sesType,
            durationHours: parseInt(sesDur, 10) || 1,
            partnerOrg: sesPartnerOrg,
          }
        : undefined,
      speakers: showSpeaker ? speakers : undefined,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmName(result.firstName);
    setConfirmRef(result.reference);
    setPhase("confirm");
  }

  function resetForm() {
    setKind("session");
    setSubName("");
    setSubEmail("");
    setSubPhone("");
    setOrgSectionId("");
    setSesTitle("");
    setSesDesc("");
    setSesCat("");
    setSesType("");
    setSesDur("1");
    setSesPartnerOrg("");
    setSpeakers([blankSpeaker()]);
    setLinkToSession(true);
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
        <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, margin: "0 0 32px", maxWidth: 560 }}>
          Help shape the programme. Submit a session topic, recommend a speaker, or both. Our review committee
          evaluates every suggestion before scheduling.
        </p>

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
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>
                Full name <span style={{ color: "var(--rej)" }}>*</span>
              </span>
              <input className="input" value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Jane Doe" />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>
                Email <span style={{ color: "var(--rej)" }}>*</span>
              </span>
              <input className="input" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} placeholder="jane@org.gov" />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Phone</span>
              <input className="input" value={subPhone} onChange={(e) => setSubPhone(e.target.value)} placeholder="+971 ..." />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Organization section</span>
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

        {showSession && (
          <div className="card" style={{ padding: 26, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
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
                Session topic
              </h3>
            </div>
            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>
                Topic title <span style={{ color: "var(--rej)" }}>*</span>
              </span>
              <input
                className="input"
                value={sesTitle}
                onChange={(e) => setSesTitle(e.target.value)}
                placeholder="e.g. Rapid pathogen detection in poultry supply chains"
              />
            </label>
            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Short description</span>
              <textarea
                className="input"
                rows={3}
                value={sesDesc}
                onChange={(e) => setSesDesc(e.target.value)}
                placeholder="What will this session cover, and why does it matter?"
                style={{ resize: "vertical", lineHeight: 1.5 }}
              />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>
                  Category <span style={{ color: "var(--rej)" }}>*</span>
                </span>
                <select className="input" value={sesCat} onChange={(e) => setSesCat(e.target.value)}>
                  <option value="">Select a category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>
                  Session type <span style={{ color: "var(--rej)" }}>*</span>
                </span>
                <select className="input" value={sesType} onChange={(e) => setSesType(e.target.value)}>
                  <option value="">Select a type...</option>
                  {sessionTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Recommended duration</span>
                <select className="input" value={sesDur} onChange={(e) => setSesDur(e.target.value)}>
                  <option value="1">1 hour</option>
                  <option value="2">2 hours</option>
                  <option value="3">3 hours</option>
                </select>
              </label>
            </div>
            <label style={{ display: "block", marginTop: 16 }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Partner organization</span>
              <input
                className="input"
                value={sesPartnerOrg}
                onChange={(e) => setSesPartnerOrg(e.target.value)}
                placeholder="Optional - co-organizing or supporting organization"
              />
            </label>
          </div>
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
              <div key={idx} style={{ border: "1px solid var(--line)", borderRadius: 13, padding: 18, marginBottom: 14, background: "var(--surface-2)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 500 }}>
                    Speaker {idx + 1}
                  </span>
                  {speakers.length > 1 && (
                    <button
                      onClick={() => setSpeakers((prev) => prev.filter((_, i) => i !== idx))}
                      style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, padding: "2px 8px", borderRadius: 6 }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <label style={{ display: "block" }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>
                      Speaker name <span style={{ color: "var(--rej)" }}>*</span>
                    </span>
                    <input
                      className="input"
                      style={{ background: "var(--surface)" }}
                      value={sp.name}
                      onChange={(e) => updateSpeaker(idx, { name: e.target.value })}
                      placeholder="Dr. Sarah Kwan"
                    />
                  </label>
                  <label style={{ display: "block" }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Speaker contact</span>
                    <input
                      className="input"
                      style={{ background: "var(--surface)" }}
                      value={sp.contact}
                      onChange={(e) => updateSpeaker(idx, { contact: e.target.value })}
                      placeholder="Email or phone"
                    />
                  </label>
                </div>
                <label style={{ display: "block", marginBottom: 14 }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Bio / credentials</span>
                  <textarea
                    className="input"
                    style={{ background: "var(--surface)", resize: "vertical", lineHeight: 1.5 }}
                    rows={2}
                    value={sp.bio}
                    onChange={(e) => updateSpeaker(idx, { bio: e.target.value })}
                    placeholder="Relevant experience, affiliation, notable work..."
                  />
                </label>
                <label style={{ display: "block" }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>
                    Topic they&apos;d speak on <span style={{ color: "var(--rej)" }}>*</span>
                  </span>
                  <input
                    className="input"
                    style={{ background: "var(--surface)" }}
                    value={sp.topic}
                    onChange={(e) => updateSpeaker(idx, { topic: e.target.value })}
                    placeholder="Free text - what they'd present"
                  />
                </label>
              </div>
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

            {kind === "both" && (
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  marginTop: 18,
                  padding: 14,
                  background: "var(--accent-weak)",
                  borderRadius: 11,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={linkToSession}
                  onChange={(e) => setLinkToSession(e.target.checked)}
                  style={{ marginTop: 2, width: 16, height: 16, accentColor: "var(--accent)" }}
                />
                <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--accent-ink)" }}>
                  Link these speaker(s) to the session topic above{" "}
                  <span style={{ opacity: 0.75 }}>
                    &mdash; <span style={{ fontWeight: 600 }}>&ldquo;{sesTitle || "your session topic"}&rdquo;</span>
                  </span>
                </span>
              </label>
            )}
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
