"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "@/lib/actions/auth";

export default function LoginPage() {
  const [role, setRole] = useState<"admin" | "referee">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function roleStyle(active: boolean): React.CSSProperties {
    return {
      flex: 1,
      border: "none",
      borderRadius: 8,
      padding: 10,
      fontSize: 13.5,
      fontWeight: 600,
      background: active ? "var(--surface)" : "transparent",
      color: active ? "var(--accent)" : "var(--muted)",
      boxShadow: active ? "0 1px 3px rgba(0,0,0,.08)" : "none",
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await login({ email, password, expectedRole: role });
    setSubmitting(false);
    if (result && !result.ok) setError(result.error);
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1.1fr 1fr" }}>
      <div style={{ background: "var(--accent)", color: "#fff", padding: 56, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            className="heading"
            style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}
          >
            DF
          </div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Programme Committee Portal</span>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 12, letterSpacing: ".08em", opacity: 0.8 }}>
            20TH EDITION
          </div>
          <h1 className="heading" style={{ fontWeight: 800, fontSize: 40, lineHeight: 1.1, margin: "12px 0 16px" }}>
            Dubai International Food Safety Conference
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.65, opacity: 0.9, maxWidth: 400 }}>
            Manage session and speaker suggestions from proposal through review to final scheduling. November
            16&ndash;18, 2026.
          </p>
        </div>
        <div style={{ fontSize: 12.5, opacity: 0.75 }}>Internal use only &middot; Dubai Municipality Food Safety Department</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 360 }}>
          <h2 className="heading" style={{ fontWeight: 700, fontSize: 24, margin: "0 0 6px" }}>
            Sign in
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 28px" }}>Select your role and enter your credentials.</p>
          <div style={{ display: "flex", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 11, padding: 4, gap: 4, marginBottom: 20 }}>
            <button type="button" style={roleStyle(role === "admin")} onClick={() => setRole("admin")}>
              Admin
            </button>
            <button type="button" style={roleStyle(role === "referee")} onClick={() => setRole("referee")}>
              Judge / Referee
            </button>
          </div>
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Email</span>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@dm.gov.ae"
            />
          </label>
          <label style={{ display: "block", marginBottom: 22 }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Password</span>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </label>
          {error && (
            <div style={{ background: "var(--rej-bg)", color: "var(--rej)", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}
          <button className="btn btn-primary" style={{ width: "100%", marginBottom: 16 }} disabled={submitting}>
            {submitting ? "Signing in..." : `Sign in as ${role === "admin" ? "Admin" : "Referee"}`}
          </button>
          <div style={{ textAlign: "center", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
            <Link href="/">&larr; Back to public suggestion form</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
