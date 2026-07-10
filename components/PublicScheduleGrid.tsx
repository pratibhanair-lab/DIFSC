"use client";

import { useMemo, useState } from "react";
import type { ScheduleBoard } from "@/lib/schedule-view";

const SLOT_H = 66;
const SLOTS = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];
const DAYS = [
  { key: "2026-11-16", label: "Sun 16", sub: "Nov" },
  { key: "2026-11-17", label: "Mon 17", sub: "Nov" },
  { key: "2026-11-18", label: "Tue 18", sub: "Nov" },
];
const CAT_COLORS = ["#17805A", "#2563B0", "#B0632A", "#8A5CD1", "#158A8F", "#C0453A", "#4B7A1E"];

function fmt(h: number) {
  return h > 12 ? `${h - 12}pm` : h === 12 ? "12pm" : `${h}am`;
}

function fmtFloat(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const period = hh >= 12 ? "pm" : "am";
  const h12 = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh;
  return h12 + (mm ? ":" + String(mm).padStart(2, "0") : "") + period;
}

export default function PublicScheduleGrid({ board, categories }: { board: ScheduleBoard; categories: { id: string; name: string }[] }) {
  const [day, setDay] = useState(DAYS[0].key);
  const [expanded, setExpanded] = useState<string | null>(null);

  const catColorByName = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c, i) => map.set(c.name, CAT_COLORS[i % CAT_COLORS.length]));
    return map;
  }, [categories]);

  const cards = board.cardsByDay[day] ?? [];

  return (
    <div style={{ flex: 1, overflow: "auto", background: "var(--bg)", padding: "24px 28px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div className="card" style={{ display: "flex", padding: 4, gap: 3 }}>
          {DAYS.map((d) => {
            const active = day === d.key;
            return (
              <button
                key={d.key}
                onClick={() => setDay(d.key)}
                style={{ textAlign: "center", border: "none", borderRadius: 8, padding: "7px 18px", background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--muted)" }}
              >
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{d.label}</div>
                <div style={{ fontSize: 11, opacity: 0.75 }}>{d.sub}</div>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{cards.length} session{cards.length === 1 ? "" : "s"} scheduled</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `70px repeat(${board.halls.length || 1},1fr)`, gap: 10, marginBottom: 8 }}>
        <div />
        {board.halls.map((h) => (
          <div key={h.id} className="heading card" style={{ textAlign: "center", fontWeight: 700, fontSize: 14, padding: 8 }}>
            {h.name}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `70px repeat(${board.halls.length || 1},1fr)`, gap: 10 }}>
        <div style={{ position: "relative", height: SLOTS.length * SLOT_H }}>
          {SLOTS.map((s, i) => (
            <div key={s} style={{ position: "absolute", top: i * SLOT_H, height: SLOT_H, right: 8, fontSize: 11.5, color: "var(--muted)", paddingTop: 6 }} className="mono">
              {s.replace(":00", "")}
            </div>
          ))}
        </div>
        {board.halls.map((hall) => (
          <div
            key={hall.id}
            style={{
              position: "relative",
              height: SLOTS.length * SLOT_H,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${SLOT_H - 1}px, var(--line) ${SLOT_H - 1}px, var(--line) ${SLOT_H}px)`,
            }}
          >
            {cards
              .filter((c) => c.hallId === hall.id)
              .map((card) => {
                const isExpanded = expanded === card.scheduleId;
                const startH = 9 + card.startSlot;
                const endH = startH + card.durationHours;
                const color = catColorByName.get(card.category) ?? CAT_COLORS[0];
                return (
                  <div
                    key={card.scheduleId}
                    onClick={() => setExpanded(isExpanded ? null : card.scheduleId)}
                    style={{
                      position: "absolute",
                      top: card.startSlot * SLOT_H + 3,
                      minHeight: card.durationHours * SLOT_H - 6,
                      height: isExpanded ? "auto" : card.durationHours * SLOT_H - 6,
                      left: 5,
                      right: 5,
                      background: color,
                      color: "#fff",
                      borderRadius: 10,
                      padding: "7px 10px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: isExpanded ? "0 8px 24px rgba(0,0,0,.32)" : "0 3px 10px rgba(0,0,0,.14)",
                      overflow: isExpanded ? "visible" : "hidden",
                      zIndex: isExpanded ? 30 : 1,
                    }}
                  >
                    <div className="mono" style={{ fontSize: 10.5, opacity: 0.85, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {card.category}
                    </div>
                    <div
                      className="heading"
                      style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.22, margin: "3px 0 2px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                    >
                      {card.title}
                    </div>
                    {!isExpanded && (
                      <>
                        <div style={{ fontSize: 11, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.speakerPreview}</div>
                        <div className="mono" style={{ fontSize: 10, opacity: 0.8, marginTop: "auto", paddingTop: 4 }}>
                          {fmt(startH)} &ndash; {fmt(endH)}
                        </div>
                      </>
                    )}
                    {isExpanded && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.3)", display: "flex", flexDirection: "column", gap: 6 }}>
                        {card.speakers.map((spv, i) => {
                          const segLen = card.durationHours / card.speakers.length;
                          const segStart = startH + segLen * i;
                          const segEnd = segStart + segLen;
                          const timeLabel = `${fmtFloat(segStart)} – ${fmtFloat(segEnd)}`;
                          return (
                            <div key={spv.speakerId} style={{ background: "rgba(255,255,255,.16)", borderRadius: 8, padding: "7px 9px" }}>
                              <div style={{ fontWeight: 700, fontSize: 12 }}>{spv.name}</div>
                              <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 2 }}>{spv.topic}</div>
                              <div className="mono" style={{ fontSize: 10, opacity: 0.8, marginTop: 3 }}>
                                {timeLabel}
                              </div>
                            </div>
                          );
                        })}
                        {card.speakers.length === 0 && <div style={{ fontSize: 11, opacity: 0.75, textAlign: "center", padding: 8 }}>Speaker TBD.</div>}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
