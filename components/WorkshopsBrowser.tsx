"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { exportWorkshopsCsv, updateWorkshopStatus } from "@/lib/actions/workshops";
import type { WorkshopRegistrationView } from "@/lib/workshops-view";
import { WORKSHOPS, WORKSHOP_STATUSES, WORKSHOP_STATUS_LABELS, workshopTitle, type WorkshopStatus } from "@/lib/workshops-config";

function downloadCsv(csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `workshop-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function WorkshopsBrowser({ registrations }: { registrations: WorkshopRegistrationView[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [workshopFilter, setWorkshopFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | WorkshopStatus>("all");
  const [exporting, setExporting] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations.filter(
      (r) =>
        (workshopFilter === "all" || r.workshopId === workshopFilter) &&
        (statusFilter === "all" || r.status === statusFilter) &&
        (!q ||
          r.fullName.toLowerCase().includes(q) ||
          r.organization.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q))
    );
  }, [registrations, search, workshopFilter, statusFilter]);

  // Confirmed seats per workshop, shown above the list so the admin can keep an eye on the seat limit.
  const confirmedCounts = WORKSHOPS.map((w) => ({
    title: w.title,
    confirmed: registrations.filter((r) => r.workshopId === w.id && r.status === "confirmed").length,
    total: registrations.filter((r) => r.workshopId === w.id).length,
  }));

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportWorkshopsCsv();
      downloadCsv(csv);
    } finally {
      setExporting(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    setError("");
    setSavingId(id);
    const result = await updateWorkshopStatus(id, status);
    setSavingId(null);
    if (!result.ok) {
      setError(result.error ?? "Couldn't update the status.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 className="heading" style={{ fontWeight: 800, fontSize: 26, margin: "0 0 4px" }}>
            Workshops
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
            Everyone who showed interest through the workshops page. Seats are limited, so set each person&apos;s status
            as you review. Changing a status doesn&apos;t send an email — confirmations are sent by you.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleExport} disabled={exporting || registrations.length === 0}>
          {exporting ? "Preparing..." : "Download CSV"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        {confirmedCounts.map((c) => (
          <div key={c.title} className="card" style={{ padding: "12px 18px", fontSize: 13 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{c.title}</div>
            <div style={{ color: "var(--muted)" }}>
              {c.confirmed} confirmed &middot; {c.total} requests
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          className="input"
          style={{ width: 260 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, organization or email..."
        />
        <select className="input" style={{ width: 260 }} value={workshopFilter} onChange={(e) => setWorkshopFilter(e.target.value)}>
          <option value="all">All workshops</option>
          {WORKSHOPS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.title}
            </option>
          ))}
        </select>
        <select
          className="input"
          style={{ width: 170 }}
          value={statusFilter}
          onChange={(e) => {
            const v = e.target.value;
            setStatusFilter((WORKSHOP_STATUSES as readonly string[]).includes(v) ? (v as WorkshopStatus) : "all");
          }}
        >
          <option value="all">All statuses</option>
          {WORKSHOP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {WORKSHOP_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ background: "var(--rej-bg)", color: "var(--rej)", borderRadius: 11, padding: "12px 16px", fontSize: 13.5, fontWeight: 500, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        {filtered.map((r) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "15px 22px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.fullName}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {r.designation ? `${r.designation} · ` : ""}
                {r.organization}
              </div>
            </div>
            <div style={{ width: 230, flexShrink: 0, fontSize: 12.5, fontWeight: 600 }}>{workshopTitle(r.workshopId)}</div>
            <div style={{ width: 210, flexShrink: 0, fontSize: 12.5, color: "var(--muted)" }}>
              <div>{r.email}</div>
              <div>{r.mobileNumber}</div>
            </div>
            <select
              className="input"
              style={{ width: 130, flexShrink: 0 }}
              value={r.status}
              disabled={savingId === r.id}
              onChange={(e) => handleStatusChange(r.id, e.target.value)}
            >
              {WORKSHOP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {WORKSHOP_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 30, textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>No workshop registrations match.</div>
        )}
      </div>
    </div>
  );
}
