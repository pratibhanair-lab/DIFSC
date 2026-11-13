"use client";

import { useMemo, useState } from "react";
import {
  PROGRAMME_TEXT,
  formatDay,
  formatDayShort,
  formatTimeRange,
  pick,
  type Lang,
  type ProgrammeItem,
  type ProgrammeRoom,
  type ProgrammeSession,
} from "@/lib/programme-config";

type Props = {
  lang: Lang;
  rooms: ProgrammeRoom[];
  days: { day: string; sessions: ProgrammeSession[] }[];
};

/**
 * Read-only programme, shared by /programme-en and /programme-ar. The only
 * difference between the two pages is `lang`: Arabic flips the layout right
 * to left and shows the Arabic text (falling back to English when blank).
 */
export default function PublicProgramme({ lang, rooms, days }: Props) {
  const t = PROGRAMME_TEXT[lang];
  const [dayIndex, setDayIndex] = useState(0);
  const [roomId, setRoomId] = useState("all");

  const roomName = useMemo(() => {
    const map = new Map(rooms.map((r) => [r.id, pick(lang, r.nameEn, r.nameAr)]));
    return (id: string | null) => (id ? (map.get(id) ?? "") : "");
  }, [rooms, lang]);

  const current = days[Math.min(dayIndex, Math.max(days.length - 1, 0))];

  const visible = useMemo(() => {
    if (!current) return [];
    if (roomId === "all") return current.sessions.map((s) => ({ session: s, children: s.children }));
    const out: { session: ProgrammeSession; children: ProgrammeItem[] }[] = [];
    for (const s of current.sessions) {
      if (s.roomId === roomId) {
        out.push({ session: s, children: s.children });
      } else {
        const kids = s.children.filter((c) => c.roomId === roomId);
        if (kids.length) out.push({ session: s, children: kids });
      }
    }
    return out;
  }, [current, roomId]);

  // Only offer rooms that actually appear somewhere in the programme.
  const usedRooms = useMemo(() => {
    const ids = new Set<string>();
    for (const d of days)
      for (const s of d.sessions) {
        if (s.roomId) ids.add(s.roomId);
        for (const c of s.children) if (c.roomId) ids.add(c.roomId);
      }
    return rooms.filter((r) => ids.has(r.id));
  }, [rooms, days]);

  const pill = (active: boolean): React.CSSProperties => ({
    border: "1px solid " + (active ? "var(--accent)" : "var(--line)"),
    background: active ? "var(--accent)" : "var(--surface)",
    color: active ? "#fff" : "var(--ink)",
    borderRadius: 10,
    padding: "9px 16px",
    fontSize: 14,
    fontWeight: 600,
  });

  return (
    <div style={{ maxWidth: 980, width: "100%", margin: "0 auto", padding: "24px 16px 60px" }}>
      <h1 className="heading" style={{ fontWeight: 800, fontSize: 28, margin: "0 0 4px" }}>
        {t.pageTitle}
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 22px" }}>{t.conference}</p>

      {days.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>{t.noItems}</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {days.map((d, i) => (
              <button key={d.day} onClick={() => setDayIndex(i)} style={pill(i === dayIndex)}>
                {t.day} {lang === "ar" ? String(i + 1) : i + 1} · {formatDayShort(d.day, lang)}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
            <select
              className="input"
              style={{ width: "auto", minWidth: 200 }}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              aria-label={t.room}
            >
              <option value="all">{t.allRooms}</option>
              {usedRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {pick(lang, r.nameEn, r.nameAr)}
                </option>
              ))}
            </select>
            {current && <span style={{ color: "var(--muted)", fontSize: 14 }}>{formatDay(current.day, lang)}</span>}
          </div>

          {visible.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>{t.noItems}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {visible.map(({ session, children }) => (
                <article key={session.id} className="card" style={{ padding: "16px 18px" }}>
                  <ItemBlock item={session} lang={lang} roomLabel={roomName(session.roomId)} big />
                  {children.length > 0 && (
                    <div
                      style={{
                        marginTop: 12,
                        paddingInlineStart: 14,
                        borderInlineStart: "3px solid var(--accent-weak)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {children.map((c) => (
                        <ItemBlock
                          key={c.id}
                          item={c}
                          lang={lang}
                          roomLabel={c.roomId && c.roomId !== session.roomId ? roomName(c.roomId) : ""}
                        />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ItemBlock({ item, lang, roomLabel, big }: { item: ProgrammeItem; lang: Lang; roomLabel: string; big?: boolean }) {
  const t = PROGRAMME_TEXT[lang];
  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <span className="mono" dir="ltr" style={{ fontSize: 13, color: "var(--accent-ink)", fontWeight: 500 }}>
          {formatTimeRange(item.startTime, item.endTime)}
        </span>
        {roomLabel && (
          <span className="chip" style={{ background: "var(--accent-weak)", color: "var(--accent-ink)" }}>
            {roomLabel}
          </span>
        )}
        {big && <span style={{ fontSize: 12, color: "var(--muted)" }}>{t.session}</span>}
      </div>
      <div className="heading" style={{ fontWeight: big ? 700 : 600, fontSize: big ? 17 : 15, margin: "4px 0 2px" }}>
        {pick(lang, item.titleEn, item.titleAr)}
      </div>
      {pick(lang, item.moderator ?? "", item.moderatorAr) && (
        <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
          <strong style={{ fontWeight: 600 }}>{t.moderator}:</strong> {pick(lang, item.moderator ?? "", item.moderatorAr)}
        </div>
      )}
      {pick(lang, item.speakers ?? "", item.speakersAr) && (
        <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
          <strong style={{ fontWeight: 600 }}>{t.speakers}:</strong> {pick(lang, item.speakers ?? "", item.speakersAr)}
        </div>
      )}
      {item.liveUrl && (
        <a href={item.liveUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600 }}>
          {t.liveStream} ↗
        </a>
      )}
    </div>
  );
}
