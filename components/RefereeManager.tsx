"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addReferee, removeReferee } from "@/lib/actions/referees";

type Referee = { id: string; name: string; email: string; focus_area: string | null };

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function RefereeManager({ referees }: { referees: Referee[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [focus, setFocus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  async function handleAdd() {
    setError("");
    setBusy(true);
    const result = await addReferee({ name, email, focusArea: focus });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCreated({ email: result.email, tempPassword: result.tempPassword });
    setName("");
    setEmail("");
    setFocus("");
    router.refresh();
  }

  async function handleRemove(id: string) {
    await removeReferee(id);
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, marginBottom: 14 }}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="input" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Focus area" />
        <button className="btn btn-primary" onClick={handleAdd} disabled={busy}>
          Add
        </button>
      </div>
      {error && <div style={{ color: "var(--rej)", fontSize: 12.5, marginBottom: 14 }}>{error}</div>}
      {created && (
        <div className="card" style={{ padding: 16, marginBottom: 20, borderColor: "var(--accent)" }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
            Referee account created for {created.email}
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px" }}>
            Share this temporary password with them directly (it won&apos;t be shown again). They can log in at
            the Judge / Referee tab on the login page.
          </p>
          <div className="mono" style={{ background: "var(--surface-2)", padding: "8px 12px", borderRadius: 8, fontSize: 14, display: "inline-block" }}>
            {created.tempPassword}
          </div>
        </div>
      )}
      <div className="card" style={{ overflow: "hidden" }}>
        {referees.map((j, i) => (
          <div
            key={j.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 18px",
              borderBottom: i === referees.length - 1 ? "none" : "1px solid var(--line)",
            }}
          >
            <div
              style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--accent-weak)", color: "var(--accent-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}
            >
              {initials(j.name)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{j.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {j.email} &middot; {j.focus_area || "General"}
              </div>
            </div>
            <button
              onClick={() => handleRemove(j.id)}
              style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, padding: "4px 8px", borderRadius: 7 }}
            >
              Remove
            </button>
          </div>
        ))}
        {referees.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>No referees yet.</div>
        )}
      </div>
    </div>
  );
}
