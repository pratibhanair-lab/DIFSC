"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { submitPoster } from "@/lib/actions/posters";
import { POSTER_DEADLINE_LABEL } from "@/lib/submission-config";

type Lookup = { id: string; name: string };

const ABSTRACT_WORD_LIMIT = 300;

function labelStyle(): React.CSSProperties {
  return { display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 };
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function PosterSubmissionForm({ categories }: { categories: Lookup[] }) {
  const [phase, setPhase] = useState<"form" | "confirm">("form");
  const [confirmName, setConfirmName] = useState("");
  const [confirmRef, setConfirmRef] = useState("");

  const [presenterName, setPresenterName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const words = wordCount(abstract);
  const overLimit = words > ABSTRACT_WORD_LIMIT;

  async function handleSubmit() {
    setError("");
    if (overLimit) {
      setError(`The abstract must be ${ABSTRACT_WORD_LIMIT} words or fewer (currently ${words}).`);
      return;
    }
    setSubmitting(true);
    const result = await submitPoster({ presenterName, affiliation, email, phone, title, abstract, categoryId });
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
    setPresenterName("");
    setAffiliation("");
    setEmail("");
    setPhone("");
    setTitle("");
    setAbstract("");
    setCategoryId("");
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
            Poster submission received
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, margin: "0 0 24px" }}>
            Thank you, {confirmName}. Your poster has been sent to the review committee. We&apos;ll be in touch
            at the email you provided.
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
              Submit another poster
            </button>
            <Link href="/posters/approved" className="btn btn-outline">
              View approved posters
            </Link>
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
          CALL FOR POSTERS
        </div>
        <h1 className="heading" style={{ fontWeight: 800, fontSize: 34, lineHeight: 1.12, margin: "10px 0 8px", letterSpacing: "-.01em" }}>
          Submit a poster
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, margin: "0 0 24px", maxWidth: 560 }}>
          Present your work at the poster session. Our review committee evaluates every submission before
          acceptance.
        </p>

        <div
          className="card"
          style={{ padding: "16px 20px", marginBottom: 28, maxWidth: 560, background: "var(--accent-weak)", border: "1px solid var(--accent)" }}
        >
          <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0, color: "var(--accent-ink)" }}>
            Submissions are open until <strong>{POSTER_DEADLINE_LABEL}</strong>.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "0 0 32px" }}>
          <Link href="/" className="btn btn-outline" style={{ fontSize: 13 }}>
            Home
          </Link>
          <Link href="/posters/approved" className="btn btn-outline" style={{ fontSize: 13 }}>
            View approved posters
          </Link>
        </div>

        <div className="card" style={{ padding: "26px 26px 28px", marginBottom: 20 }}>
          <h3 className="heading" style={{ fontWeight: 700, fontSize: 16, margin: "0 0 4px" }}>
            Presenter details
          </h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px" }}>So we can follow up on your submission.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <label style={{ display: "block" }}>
              <span style={labelStyle()}>
                Presenter&apos;s name <span style={{ color: "var(--rej)" }}>*</span>
              </span>
              <input className="input" value={presenterName} onChange={(e) => setPresenterName(e.target.value)} placeholder="Jane Doe" />
            </label>
            <label style={{ display: "block" }}>
              <span style={labelStyle()}>Affiliation</span>
              <input className="input" value={affiliation} onChange={(e) => setAffiliation(e.target.value)} placeholder="Organization / employer" />
            </label>
            <label style={{ display: "block" }}>
              <span style={labelStyle()}>
                Email <span style={{ color: "var(--rej)" }}>*</span>
              </span>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@org.gov" />
            </label>
            <label style={{ display: "block" }}>
              <span style={labelStyle()}>Telephone number</span>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 ..." />
            </label>
          </div>
        </div>

        <div className="card" style={{ padding: 26, marginBottom: 20 }}>
          <h3 className="heading" style={{ fontWeight: 700, fontSize: 16, margin: "0 0 18px" }}>
            Poster details
          </h3>
          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={labelStyle()}>
              Poster title <span style={{ color: "var(--rej)" }}>*</span>
            </span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rapid pathogen detection in poultry supply chains" />
          </label>
          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={labelStyle()}>
              Category <span style={{ color: "var(--rej)" }}>*</span>
            </span>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
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
              Abstract <span style={{ color: "var(--rej)" }}>*</span>
            </span>
            <textarea
              className="input"
              rows={6}
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Summarize your poster (300 words maximum)"
              style={{ resize: "vertical", lineHeight: 1.5 }}
            />
            <div style={{ fontSize: 12, marginTop: 6, color: overLimit ? "var(--rej)" : "var(--muted)", fontWeight: overLimit ? 600 : 400 }}>
              {words} / {ABSTRACT_WORD_LIMIT} words
            </div>
          </label>
        </div>

        {error && (
          <div style={{ background: "var(--rej-bg)", color: "var(--rej)", borderRadius: 11, padding: "12px 16px", fontSize: 13.5, fontWeight: 500, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit poster"}
          </button>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>You&apos;ll receive a confirmation and reference number.</span>
        </div>
      </div>
    </div>
  );
}
