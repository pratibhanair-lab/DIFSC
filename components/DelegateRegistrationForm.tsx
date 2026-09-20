"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { submitDelegateRegistration } from "@/lib/actions/delegates";

function labelStyle(): React.CSSProperties {
  return { display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 };
}

// Fixed list of government entities eligible for free registration. Not
// admin-editable (unlike categories/session types) — nobody's asked for
// that, and it would be a different table + setup UI for a list that only
// changes when policy changes.
const ORGANIZATION_OPTIONS = [
  "ADFCA",
  "Ajman Municipality",
  "Al Ain Municipality",
  "Al Dhaid Municipality",
  "Dubai Municipality",
  "Fujairah Municipality",
  "Kalba Municipality",
  "MOCCAE",
  "MOIAT",
  "QCC Abu Dhabi",
  "RAK Municipality",
  "Sharjah Municipality",
  "UAQ Municipality",
  "Other",
];

export default function DelegateRegistrationForm() {
  const searchParams = useSearchParams();
  const embed = searchParams.get("embed") === "1";

  const [phase, setPhase] = useState<"form" | "confirm">("form");
  const [confirmRef, setConfirmRef] = useState("");

  const [fullName, setFullName] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [preferredEmail, setPreferredEmail] = useState("");
  const [preferredEmailTouched, setPreferredEmailTouched] = useState(false);
  const [organizationChoice, setOrganizationChoice] = useState("");
  const [organizationOther, setOrganizationOther] = useState("");
  const [sectionDepartment, setSectionDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [nationality, setNationality] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleOfficialEmailChange(value: string) {
    setOfficialEmail(value);
    if (!preferredEmailTouched) setPreferredEmail(value);
  }

  function handlePreferredEmailChange(value: string) {
    setPreferredEmailTouched(true);
    setPreferredEmail(value);
  }

  async function handleSubmit() {
    setError("");
    const organization = organizationChoice === "Other" ? organizationOther.trim() : organizationChoice;
    setSubmitting(true);
    const result = await submitDelegateRegistration({
      fullName,
      officialEmail,
      preferredEmail,
      organization,
      sectionDepartment,
      designation,
      mobileNumber,
      nationality,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmRef(result.reference);
    setPhase("confirm");
  }

  function resetForm() {
    setFullName("");
    setOfficialEmail("");
    setPreferredEmail("");
    setPreferredEmailTouched(false);
    setOrganizationChoice("");
    setOrganizationOther("");
    setSectionDepartment("");
    setDesignation("");
    setMobileNumber("");
    setNationality("");
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
            Registration received
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, margin: "0 0 24px" }}>
            Thank you for registering for DIFSC2026. Your digital registration badge will be sent to your email
            and mobile 3 days before the event. Please note that this registration is strictly for government
            employees. If you are not a government employee, your registration will not be validated.
          </p>
          <div className="card" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 18px", marginBottom: 32 }}>
            <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              REFERENCE
            </span>
            <span className="mono" style={{ fontWeight: 500, fontSize: 14 }}>
              {confirmRef}
            </span>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={resetForm}>
              Register another delegate
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      {!embed && (
        <>
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
        </>
      )}

      <div style={{ maxWidth: 760, margin: "0 auto", padding: embed ? "24px 24px 60px" : "44px 24px 80px" }}>
        <div className="mono" style={{ fontSize: 12, color: "var(--accent)", letterSpacing: ".08em", fontWeight: 500 }}>
          DELEGATE REGISTRATION
        </div>
        <h1 className="heading" style={{ fontWeight: 800, fontSize: 34, lineHeight: 1.12, margin: "10px 0 24px", letterSpacing: "-.01em" }}>
          Government Delegate Registration
        </h1>

        <div
          className="card"
          style={{ padding: "16px 20px", marginBottom: 28, maxWidth: 560, background: "var(--pend-bg)", border: "1px solid var(--pend)" }}
        >
          <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0, color: "var(--pend)", fontWeight: 600 }}>
            This registration is exclusively for government employees.
          </p>
        </div>

        <div className="card" style={{ padding: "26px 26px 28px", marginBottom: 20 }}>
          <h3 className="heading" style={{ fontWeight: 700, fontSize: 16, margin: "0 0 4px" }}>
            Delegate details
          </h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px" }}>So we can confirm and process your registration.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <label style={{ display: "block" }}>
              <span style={labelStyle()}>
                Full name <span style={{ color: "var(--rej)" }}>*</span>
              </span>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
            </label>
            <label style={{ display: "block" }}>
              <span style={labelStyle()}>
                Official email <span style={{ color: "var(--rej)" }}>*</span>
              </span>
              <input className="input" value={officialEmail} onChange={(e) => handleOfficialEmailChange(e.target.value)} placeholder="jane@org.gov" />
            </label>
            <label style={{ display: "block" }}>
              <span style={labelStyle()}>Preferred email</span>
              <input
                className="input"
                value={preferredEmail}
                onChange={(e) => handlePreferredEmailChange(e.target.value)}
                placeholder="Defaults to official email"
              />
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
              <select className="input" value={organizationChoice} onChange={(e) => setOrganizationChoice(e.target.value)}>
                <option value="">Select your organization...</option>
                {ORGANIZATION_OPTIONS.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </label>
            {organizationChoice === "Other" ? (
              <label style={{ display: "block" }}>
                <span style={labelStyle()}>
                  Please specify your organization <span style={{ color: "var(--rej)" }}>*</span>
                </span>
                <input className="input" value={organizationOther} onChange={(e) => setOrganizationOther(e.target.value)} placeholder="Organization name" />
              </label>
            ) : (
              <div />
            )}
            <label style={{ display: "block" }}>
              <span style={labelStyle()}>Section/Department</span>
              <input className="input" value={sectionDepartment} onChange={(e) => setSectionDepartment(e.target.value)} placeholder="Optional" />
            </label>
            <label style={{ display: "block" }}>
              <span style={labelStyle()}>
                Designation <span style={{ color: "var(--rej)" }}>*</span>
              </span>
              <input className="input" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Job title" />
            </label>
            <label style={{ display: "block" }}>
              <span style={labelStyle()}>
                Nationality <span style={{ color: "var(--rej)" }}>*</span>
              </span>
              <input className="input" value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="e.g. Emirati" />
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
            {submitting ? "Submitting..." : "Submit registration"}
          </button>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>You&apos;ll receive a reference number for your registration.</span>
        </div>
      </div>
    </div>
  );
}
