"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import StatusChip from "@/components/StatusChip";
import { decidePoster } from "@/lib/actions/posters";
import type { PosterView } from "@/lib/posters-view";

export default function PosterReviewCard({ poster }: { poster: PosterView }) {
  const router = useRouter();
  const [comment, setComment] = useState(poster.reviewComment ?? "");
  const [busy, setBusy] = useState(false);

  async function decide(status: "approved" | "rejected") {
    setBusy(true);
    await decidePoster(poster.id, status, comment);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ padding: 22, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <h3 className="heading" style={{ fontWeight: 700, fontSize: 17, margin: 0 }}>
          {poster.title}
        </h3>
        <StatusChip status={poster.status} />
      </div>
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Category</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{poster.categoryName}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Presenter</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{poster.presenterName}</div>
        </div>
        {poster.affiliation && (
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Affiliation</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{poster.affiliation}</div>
          </div>
        )}
      </div>
      <p style={{ fontSize: 14.5, lineHeight: 1.65, margin: "0 0 16px" }}>{poster.abstract}</p>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
          Decision on this poster (optional comment)
        </div>
        <textarea
          className="input"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add feedback for the committee..."
          style={{ resize: "vertical", lineHeight: 1.5, marginBottom: 14 }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-primary" style={{ flex: 1, background: "var(--appr)" }} onClick={() => decide("approved")} disabled={busy}>
            &#10003; Approve poster
          </button>
          <button className="btn btn-danger-outline" style={{ flex: 1 }} onClick={() => decide("rejected")} disabled={busy}>
            &#10007; Reject poster
          </button>
        </div>
      </div>
    </div>
  );
}
