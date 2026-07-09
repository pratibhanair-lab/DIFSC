"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addLookup, removeLookup } from "@/lib/actions/lookups";

type Table = "categories" | "session_types" | "org_sections" | "halls";
type Item = { id: string; name: string; count: number };

export default function LookupManager({
  table,
  items,
  dotColor,
  placeholder,
}: {
  table: Table;
  items: Item[];
  dotColor: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    setError("");
    setBusy(true);
    const result = await addLookup(table, value);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not add that.");
      return;
    }
    setValue("");
    router.refresh();
  }

  async function handleRemove(id: string) {
    setError("");
    const result = await removeLookup(table, id);
    if (!result.ok) {
      setError(result.error ?? "Could not remove that.");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: error ? 10 : 20 }}>
        <input
          className="input"
          style={{ flex: 1 }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button className="btn btn-primary" onClick={handleAdd} disabled={busy}>
          Add
        </button>
      </div>
      {error && <div style={{ color: "var(--rej)", fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
      <div className="card" style={{ overflow: "hidden" }}>
        {items.map((item, i) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 18px",
              borderBottom: i === items.length - 1 ? "none" : "1px solid var(--line)",
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor }} />
            <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{item.name}</div>
            <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              {item.count} used
            </div>
            <button
              onClick={() => handleRemove(item.id)}
              style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, padding: "4px 8px", borderRadius: 7 }}
            >
              Remove
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>None yet.</div>
        )}
      </div>
    </div>
  );
}
