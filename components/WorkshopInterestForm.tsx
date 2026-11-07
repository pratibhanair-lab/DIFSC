"use client";

import { useEffect, useRef, useState } from "react";
import { submitWorkshopRegistration } from "@/lib/actions/workshops";
import { WORKSHOPS } from "@/lib/workshops-config";

function labelStyle(): React.CSSProperties {
  return { display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 };
}

export default function WorkshopInterestForm() {
  const [phase, setPhase] = useState<"form" | "confirm">("form");
  const [confirmedFirstName, setConfirmedFirstName] = useState("");

  const [selected, setSelected] = useState<string[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [organization, setOrganization] = useState("");
  const [designation, setDesignation] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Bring the thank-you message into view once it appears, so it isn't missed.
  const confirmRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase === "confirm") confirmRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [phase]);

  function toggleWorkshop(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    const result = await submitWorkshopRegistration({
      workshopIds: selected,
      fullName,
      email,
      mobileNumber,
      organization,
      designation,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmedFirstName(result.firstName);
    setPhase("confirm");
  }

  function resetForm() {
    setSelected([]);
    setFullName("");
    setEmail("");
    setMobileNumber("");
    setOrganization("");
    setDesignation("");
    setError("");
    setPhase("form");
  }

  if (phase === "confirm") {
    return (
      <div ref={confirmRef} className="card" style={{ padding: "36px 28px", textAlign: "center" }}>
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
        <h2 className="heading" style={{ fontWeight: 800, fontSize: 26, margin: "0 0 12px" }}>
          Thank you for your interest{confirmedFirstName ? `, ${confirmedFirstName}` : ""}
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, margin: "0 auto 24px", maxWidth: 480 }}>
          We have received your interest in the workshop(s) below. Please note that all workshop confirmations are
          subject to review. You will be sent an email to confirm your seat.
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px" }}>
          {WORKSHOPS.filter((w) => selected.includes(w.id)).map((w) => (
            <li key={w.id} style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 6 }}>
              {w.title}
            </li>
          ))}
        </ul>
        <button className="btn btn-primary" onClick={resetForm}>
          Register another person
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ padding: "26px 26px 28px", marginBottom: 20 }}>
        <h3 className="heading" style={{ fontWeight: 700, fontSize: 16, margin: "0 0 4px" }}>
          Show your interest
        </h3>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px" }}>
          Choose one or more workshops. Seats are limited and every request is reviewed before it is confirmed.
        </p>

        <div style={{ marginBottom: 22 }}>
          <span style={labelStyle()}>
            Workshops <span style={{ color: "var(--rej)" }}>*</span>
          </span>
          {WORKSHOPS.map((w) => (
            <label key={w.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={selected.includes(w.id)}
                onChange={() => toggleWorkshop(w.id)}
                style={{ marginTop: 3 }}
              />
              <span style={{ fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{w.title}</span>
                <span style={{ color: "var(--muted)" }}>
                  {" "}
                  &middot; {w.dateLabel}, {w.timeLabel}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>
              Full name <span style={{ color: "var(--rej)" }}>*</span>
            </span>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
          </label>
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>
              Email <span style={{ color: "var(--rej)" }}>*</span>
            </span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@org.com" />
          </label>
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>
              Mobile number <span style={{ color: "var(--rej)" }}>*</span>
            </span>
            <input className="input" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="+971 ..." />
          </label>
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>
              Organization <span style={{ color: "var(--rej)" }}>*</span>
            </span>
            <input className="input" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Organization name" />
          </label>
          <label style={{ display: "block" }}>
            <span style={labelStyle()}>Designation</span>
            <input className="input" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Optional" />
          </label>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--rej-bg)", color: "var(--rej)", borderRadius: 11, padding: "12px 16px", fontSize: 13.5, fontWeight: 500, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit interest"}
        </button>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>Confirmation is subject to review.</span>
      </div>
    </div>
  );
}
