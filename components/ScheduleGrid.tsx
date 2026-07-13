"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  placeSession,
  resizeSchedule,
  unscheduleSession,
  assignSpeakerToSchedule,
  removeSpeakerFromSchedule,
  reorderSpeaker,
} from "@/lib/actions/schedule";
import type { ScheduleBoard } from "@/lib/schedule-view";

const SLOT_H = 66;
const MAX_DUR = 4;
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

type Dragged = { type: "session"; sessionId: string; durationHours: number } | { type: "speaker"; speakerId: string };

export default function ScheduleGrid({ board, categories }: { board: ScheduleBoard; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [day, setDay] = useState(DAYS[0].key);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [warning, setWarning] = useState("");
  const dragged = useRef<Dragged | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function warn(msg: string) {
    setWarning(msg);
    if (warnTimer.current) clearTimeout(warnTimer.current);
    warnTimer.current = setTimeout(() => setWarning(""), 3400);
  }

  const catColorByName = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c, i) => map.set(c.name, CAT_COLORS[i % CAT_COLORS.length]));
    return map;
  }, [categories]);

  const q = search.trim().toLowerCase();
  const unscheduled = board.unscheduled.filter((u) => !q || u.title.toLowerCase().includes(q));
  const speakerPanel = board.speakerPool.filter((sp) => !q || sp.name.toLowerCase().includes(q));
  const cards = board.cardsByDay[day] ?? [];

  async function onDropHall(hallId: string, e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const d = dragged.current;
    dragged.current = null;
    if (!d) return;
    if (d.type === "speaker") {
      warn("Drop speakers directly onto a scheduled session card.");
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const raw = Math.floor((e.clientY - rect.top) / SLOT_H);
    const startSlot = Math.max(0, Math.min(raw, SLOTS.length - d.durationHours));
    const result = await placeSession({ sessionId: d.sessionId, hallId, day, startSlot, durationHours: d.durationHours });
    if (!result.ok) warn(result.error);
    router.refresh();
  }

  async function onDropCard(scheduleId: string, e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const d = dragged.current;
    dragged.current = null;
    if (d?.type === "speaker") {
      await assignSpeakerToSchedule(scheduleId, d.speakerId);
      router.refresh();
    }
  }

  async function changeDur(scheduleId: string, current: number, delta: number, startSlot: number, e: React.MouseEvent) {
    e.stopPropagation();
    const cap = Math.min(MAX_DUR, SLOTS.length - startSlot);
    const next = Math.max(1, Math.min(current + delta, cap));
    if (next === current) {
      if (delta > 0) warn("Reached the end of the day — move the session earlier to make it longer.");
      return;
    }
    const result = await resizeSchedule(scheduleId, next);
    if (!result.ok) warn(result.error);
    router.refresh();
  }

  return (
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "300px 1fr", minHeight: 0 }}>
      <div style={{ borderRight: "1px solid var(--line)", background: "var(--surface)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <input className="input" style={{ background: "var(--surface-2)" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sessions or speakers..." />
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", borderBottom: "1px solid var(--line)" }}>
          <div style={{ padding: "14px 20px 10px" }}>
            <h2 className="heading" style={{ fontWeight: 700, fontSize: 14, margin: "0 0 2px" }}>
              Unscheduled sessions
            </h2>
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: 0 }}>Approved &amp; awaiting a slot. Drag onto the grid &rarr;</p>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {unscheduled.map((u) => (
              <div
                key={u.id}
                draggable
                onDragStart={() => (dragged.current = { type: "session", sessionId: u.id, durationHours: u.durationHours })}
                style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderLeft: "4px solid var(--accent)", borderRadius: 11, padding: "13px 14px", cursor: "grab" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                  <span className="mono" style={{ fontSize: 10.5, letterSpacing: ".03em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 500 }}>
                    {u.category}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "1px 6px" }}>
                    {u.durationHours}h suggested
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.35, marginBottom: 6 }}>{u.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{u.speakerPreview}</div>
              </div>
            ))}
            {unscheduled.length === 0 && <div style={{ padding: "30px 12px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>All approved sessions are scheduled.</div>}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 20px 10px" }}>
            <h2 className="heading" style={{ fontWeight: 700, fontSize: 14, margin: "0 0 2px" }}>
              Speakers
            </h2>
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: 0 }}>Confirmed only. Drag onto a scheduled session &rarr;</p>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {speakerPanel.map((sp) => (
              <div
                key={sp.id}
                draggable
                onDragStart={() => (dragged.current = { type: "speaker", speakerId: sp.id })}
                style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderLeft: "4px solid #8A5CD1", borderRadius: 11, padding: "12px 13px", cursor: "grab" }}
              >
                <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>{sp.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{sp.topic}</div>
              </div>
            ))}
            {speakerPanel.length === 0 && <div style={{ padding: "30px 12px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No approved speakers yet.</div>}
          </div>
        </div>
      </div>

      <div style={{ overflow: "auto", background: "var(--bg)", padding: "24px 28px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
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
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            {cards.length} scheduled &middot; <span style={{ color: "var(--accent)", fontWeight: 600 }}>use &minus;/+ on a card to set its length</span>
          </div>
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
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropHall(hall.id, e)}
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
                      draggable
                      onDragStart={() => (dragged.current = { type: "session", sessionId: card.sessionId, durationHours: card.durationHours })}
                      onDrop={(e) => onDropCard(card.scheduleId, e)}
                      onDragOver={(e) => e.preventDefault()}
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
                        cursor: "grab",
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: isExpanded ? "0 8px 24px rgba(0,0,0,.32)" : "0 3px 10px rgba(0,0,0,.14)",
                        overflow: isExpanded ? "visible" : "hidden",
                        zIndex: isExpanded ? 30 : 1,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 2, background: "rgba(255,255,255,.22)", borderRadius: 6, padding: "1px 2px" }}>
                          <button onClick={(e) => changeDur(card.scheduleId, card.durationHours, -1, card.startSlot, e)} style={{ background: "none", border: "none", color: "#fff", width: 16, height: 16, fontSize: 13, lineHeight: 1, padding: 0 }}>
                            &minus;
                          </button>
                          <span className="mono" style={{ fontSize: 10, minWidth: 16, textAlign: "center", fontWeight: 500 }}>
                            {card.durationHours}h
                          </span>
                          <button onClick={(e) => changeDur(card.scheduleId, card.durationHours, 1, card.startSlot, e)} style={{ background: "none", border: "none", color: "#fff", width: 16, height: 16, fontSize: 12, lineHeight: 1, padding: 0 }}>
                            +
                          </button>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpanded(isExpanded ? null : card.scheduleId);
                            }}
                            style={{ background: "rgba(255,255,255,.25)", border: "none", color: "#fff", padding: "1px 6px", borderRadius: 5, fontSize: 10, lineHeight: 1.6, flexShrink: 0, whiteSpace: "nowrap" }}
                          >
                            {isExpanded ? "▴ Hide" : "▾ Speakers"}
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await unscheduleSession(card.scheduleId);
                              router.refresh();
                            }}
                            style={{ background: "rgba(255,255,255,.25)", border: "none", color: "#fff", width: 16, height: 16, borderRadius: 5, fontSize: 10, lineHeight: 1, flexShrink: 0 }}
                          >
                            &#10005;
                          </button>
                        </div>
                      </div>
                      <div
                        className="heading"
                        style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.22, margin: "3px 0 2px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                      >
                        {card.title}
                      </div>
                      {card.durationHours >= 2 && !isExpanded && (
                        <>
                          <div className="mono" style={{ fontSize: 10.5, opacity: 0.85, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2 }}>
                            {card.category}
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.speakerPreview}</div>
                          <div className="mono" style={{ fontSize: 10, opacity: 0.8, marginTop: "auto", paddingTop: 4 }}>
                            {fmt(startH)} &ndash; {fmt(endH)}
                          </div>
                        </>
                      )}
                      {isExpanded && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.3)", display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ fontSize: 10.5, opacity: 0.85 }}>Submitted by: {card.orgSectionName ?? "—"}</div>
                          {card.speakers.map((spv, i) => {
                            const segLen = card.durationHours / card.speakers.length;
                            const segStart = startH + segLen * i;
                            const segEnd = segStart + segLen;
                            const timeLabel = `${fmtFloat(segStart)} – ${fmtFloat(segEnd)}`;
                            return (
                              <div key={spv.speakerId} style={{ background: "rgba(255,255,255,.16)", borderRadius: 8, padding: "7px 9px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                                  <div style={{ fontWeight: 700, fontSize: 12 }}>{spv.name}</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        await reorderSpeaker(card.scheduleId, spv.speakerId, -1);
                                        router.refresh();
                                      }}
                                      style={{ background: "none", border: "none", color: "#fff", width: 15, height: 15, fontSize: 11, lineHeight: 1, padding: 0 }}
                                    >
                                      &uarr;
                                    </button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        await reorderSpeaker(card.scheduleId, spv.speakerId, 1);
                                        router.refresh();
                                      }}
                                      style={{ background: "none", border: "none", color: "#fff", width: 15, height: 15, fontSize: 11, lineHeight: 1, padding: 0 }}
                                    >
                                      &darr;
                                    </button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        await removeSpeakerFromSchedule(card.scheduleId, spv.speakerId);
                                        router.refresh();
                                      }}
                                      style={{ background: "none", border: "none", color: "#fff", width: 15, height: 15, fontSize: 11, lineHeight: 1, padding: 0 }}
                                    >
                                      &#10005;
                                    </button>
                                  </div>
                                </div>
                                <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 2 }}>{spv.topic}</div>
                                <div className="mono" style={{ fontSize: 10, opacity: 0.8, marginTop: 3 }}>
                                  {timeLabel}
                                </div>
                              </div>
                            );
                          })}
                          {card.speakers.length === 0 && <div style={{ fontSize: 11, opacity: 0.75, textAlign: "center", padding: 8 }}>Drag a speaker here to assign.</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {warning && (
        <div className="toast">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E8A33D", display: "inline-block", marginRight: 10 }} />
          {warning}
        </div>
      )}
    </div>
  );
}

function fmtFloat(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const period = hh >= 12 ? "pm" : "am";
  const h12 = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh;
  return h12 + (mm ? ":" + String(mm).padStart(2, "0") : "") + period;
}
