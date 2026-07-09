"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import StatusChip from "@/components/StatusChip";
import { decideSpeaker } from "@/lib/actions/review";
import type { SpeakerStatus } from "@/lib/types";

type Speaker = {
  id: string;
  name: string;
  bio: string | null;
  contact: string | null;
  topic: string;
  status: SpeakerStatus;
};

const smallBtn: React.CSSProperties = { border: "none", borderRadius: 8, padding: "8px 13px", fontSize: 12.5, fontWeight: 600 };

export default function SpeakerCard({ speaker, showContact }: { speaker: Speaker; showContact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(status: SpeakerStatus) {
    setBusy(true);
    await decideSpeaker(speaker.id, status);
    setBusy(false);
    router.refresh();
  }

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 15, marginBottom: 10, background: "var(--surface-2)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <div className="heading" style={{ fontSize: 14.5, fontWeight: 700 }}>
          {speaker.name}
        </div>
        <StatusChip status={speaker.status} />
      </div>
      {speaker.bio && <p style={{ fontSize: 13, lineHeight: 1.55, margin: "0 0 6px", color: "var(--muted)" }}>{speaker.bio}</p>}
      {showContact && speaker.contact && (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
          Contact: <span style={{ color: "var(--ink)" }}>{speaker.contact}</span>
        </div>
      )}
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
        Would speak on: <span style={{ color: "var(--ink)" }}>{speaker.topic}</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {speaker.status === "pending" && (
          <button disabled={busy} onClick={() => set("approved")} style={{ ...smallBtn, background: "var(--appr)", color: "#fff" }}>
            &#10003; Approve
          </button>
        )}
        {speaker.status === "approved" && (
          <button disabled={busy} onClick={() => set("confirmed")} style={{ ...smallBtn, background: "var(--accent)", color: "#fff" }}>
            &#9733; Mark confirmed
          </button>
        )}
        {speaker.status !== "rejected" && (
          <button
            disabled={busy}
            onClick={() => set("rejected")}
            style={{ ...smallBtn, background: "transparent", color: "var(--rej)", border: "1px solid var(--rej)" }}
          >
            &#10007; Reject
          </button>
        )}
        {speaker.status === "rejected" && (
          <button
            disabled={busy}
            onClick={() => set("pending")}
            style={{ ...smallBtn, background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--line)" }}
          >
            Reconsider
          </button>
        )}
      </div>
    </div>
  );
}
