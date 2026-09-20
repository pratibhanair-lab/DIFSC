"use client";

import { useMemo, useState } from "react";
import { exportDelegatesCsv } from "@/lib/actions/delegates";
import type { DelegateView } from "@/lib/delegates-view";

function downloadCsv(csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `delegate-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function DelegatesBrowser({ delegates }: { delegates: DelegateView[] }) {
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return delegates;
    return delegates.filter(
      (d) =>
        d.fullName.toLowerCase().includes(q) ||
        d.organization.toLowerCase().includes(q) ||
        d.officialEmail.toLowerCase().includes(q)
    );
  }, [delegates, search]);

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportDelegatesCsv();
      downloadCsv(csv);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 className="heading" style={{ fontWeight: 800, fontSize: 26, margin: "0 0 4px" }}>
            Delegates
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
            Everyone who registered via the free-delegate registration page. Registrations aren&apos;t reviewed —
            this is the full list, for badge issuance.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleExport} disabled={exporting || delegates.length === 0}>
          {exporting ? "Preparing..." : "Download CSV"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          className="input"
          style={{ width: 260 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, organization or email..."
        />
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {filtered.map((d) => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "15px 22px", borderBottom: "1px solid var(--line)" }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)", width: 118, flexShrink: 0 }}>
              {d.reference}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.fullName}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {d.designation} &middot; {d.organization}
                {d.sectionDepartment ? ` · ${d.sectionDepartment}` : ""}
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", width: 200, flexShrink: 0 }}>{d.officialEmail}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", width: 130, flexShrink: 0 }}>{d.nationality}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 30, textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>No delegate registrations match.</div>
        )}
      </div>
    </div>
  );
}
