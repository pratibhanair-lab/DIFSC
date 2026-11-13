"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProgrammeItem,
  updateProgrammeItem,
  deleteProgrammeItem,
  createProgrammeRoom,
  updateProgrammeRoom,
  deleteProgrammeRoom,
  type ProgrammeItemInput,
} from "@/lib/actions/programme";
import { formatDayShort, formatTimeRange, type ProgrammeItem, type ProgrammeRoom } from "@/lib/programme-config";

const missingTitleAr = (i: ProgrammeItem) => !i.titleAr || !i.titleAr.trim();
// Speakers/moderator only count as missing when there is a name to translate.
const missingSpeakersAr = (i: ProgrammeItem) =>
  (!!i.speakers?.trim() && !i.speakersAr?.trim()) || (!!i.moderator?.trim() && !i.moderatorAr?.trim());
const missingAr = (i: ProgrammeItem) => missingTitleAr(i) || missingSpeakersAr(i);

/** What the open form is doing: editing an item, or adding a new one. */
type FormState =
  | { kind: "edit"; id: string }
  | { kind: "new-session" }
  | { kind: "new-sub"; parentId: string };

export default function ProgrammeEditor({ items, rooms }: { items: ProgrammeItem[]; rooms: ProgrammeRoom[] }) {
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [onlyMissingAr, setOnlyMissingAr] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [showRooms, setShowRooms] = useState(false);

  const days = useMemo(() => [...new Set(items.map((i) => i.day))].sort(), [items]);
  const roomName = (id: string | null) => rooms.find((r) => r.id === id)?.nameEn ?? "";
  const missingCount = items.filter(missingAr).length;

  const sessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const kids = new Map<string, ProgrammeItem[]>();
    for (const i of items) {
      if (i.parentId) kids.set(i.parentId, [...(kids.get(i.parentId) ?? []), i]);
    }
    const matches = (i: ProgrammeItem) =>
      (!onlyMissingAr || missingAr(i)) &&
      (!q ||
        i.titleEn.toLowerCase().includes(q) ||
        (i.titleAr ?? "").toLowerCase().includes(q) ||
        (i.speakers ?? "").toLowerCase().includes(q));
    const out: { session: ProgrammeItem; children: ProgrammeItem[] }[] = [];
    for (const s of items) {
      if (s.parentId) continue;
      if (dayFilter !== "all" && s.day !== dayFilter) continue;
      const allKids = kids.get(s.id) ?? [];
      const filtering = onlyMissingAr || q !== "";
      const matchingKids = allKids.filter(matches);
      if (!filtering) out.push({ session: s, children: allKids });
      else if (matches(s) || matchingKids.length) out.push({ session: s, children: matchingKids });
    }
    return out;
  }, [items, dayFilter, onlyMissingAr, search]);

  const pill = (active: boolean): React.CSSProperties => ({
    border: "1px solid " + (active ? "var(--accent)" : "var(--line)"),
    background: active ? "var(--accent)" : "var(--surface)",
    color: active ? "#fff" : "var(--ink)",
    borderRadius: 9,
    padding: "7px 13px",
    fontSize: 13,
    fontWeight: 600,
  });

  return (
    <div style={{ maxWidth: 1040, width: "100%", margin: "0 auto", padding: "26px 20px 70px" }}>
      <h1 className="heading" style={{ fontWeight: 800, fontSize: 26, margin: "0 0 4px" }}>
        Conference programme
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 6px" }}>
        Edit, add or remove sessions and sub-sessions. Changes show on the public pages straight away.
      </p>
      <p style={{ fontSize: 13.5, margin: "0 0 20px" }}>
        Public pages:{" "}
        <a href="/programme-en" target="_blank" rel="noopener noreferrer">
          English ↗
        </a>{" "}
        ·{" "}
        <a href="/programme-ar" target="_blank" rel="noopener noreferrer">
          العربية ↗
        </a>
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button style={pill(dayFilter === "all")} onClick={() => setDayFilter("all")}>
          All days
        </button>
        {days.map((d) => (
          <button key={d} style={pill(dayFilter === d)} onClick={() => setDayFilter(d)}>
            {formatDayShort(d, "en")}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        <input
          className="input"
          style={{ width: 260 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or speaker..."
        />
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600 }}>
          <input type="checkbox" checked={onlyMissingAr} onChange={(e) => setOnlyMissingAr(e.target.checked)} />
          Missing Arabic (title or names)
          <span className="chip" style={{ background: "var(--pend-bg)", color: "var(--pend)" }}>
            {missingCount}
          </span>
        </label>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>
          <button className="btn-small btn-muted" onClick={() => setShowRooms((v) => !v)}>
            {showRooms ? "Hide rooms" : "Manage rooms"}
          </button>
          <button className="btn-small btn-primary" onClick={() => setForm({ kind: "new-session" })}>
            + Add session
          </button>
        </div>
      </div>

      {showRooms && <RoomsPanel rooms={rooms} />}

      {form?.kind === "new-session" && (
        <div className="card" style={{ padding: 18, marginBottom: 14, borderColor: "var(--accent)" }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>New session</div>
          <ItemForm
            rooms={rooms}
            initial={{ day: dayFilter !== "all" ? dayFilter : (days[0] ?? "2026-11-16") }}
            onCancel={() => setForm(null)}
            onSaved={() => setForm(null)}
            save={(v) => createProgrammeItem(v)}
          />
        </div>
      )}

      {sessions.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>Nothing matches.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sessions.map(({ session, children }) => (
            <div key={session.id} className="card" style={{ padding: "14px 16px" }}>
              <Row
                item={session}
                roomLabel={roomName(session.roomId)}
                showDay={dayFilter === "all"}
                form={form}
                setForm={setForm}
                rooms={rooms}
                childCount={items.filter((i) => i.parentId === session.id).length}
                bold
              />
              {children.length > 0 && (
                <div style={{ marginTop: 10, marginInlineStart: 14, paddingInlineStart: 14, borderInlineStart: "3px solid var(--accent-weak)", display: "flex", flexDirection: "column", gap: 10 }}>
                  {children.map((c) => (
                    <Row key={c.id} item={c} roomLabel={roomName(c.roomId)} form={form} setForm={setForm} rooms={rooms} childCount={0} />
                  ))}
                </div>
              )}
              {form?.kind === "new-sub" && form.parentId === session.id ? (
                <div style={{ marginTop: 12, padding: 14, border: "1px solid var(--accent)", borderRadius: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>New sub-session</div>
                  <ItemForm
                    rooms={rooms}
                    initial={{ day: session.day, roomId: session.roomId ?? "", startTime: session.startTime }}
                    lockDay
                    onCancel={() => setForm(null)}
                    onSaved={() => setForm(null)}
                    save={(v) => createProgrammeItem({ ...v, parentId: session.id })}
                  />
                </div>
              ) : (
                <button className="btn-small btn-muted" style={{ marginTop: 10 }} onClick={() => setForm({ kind: "new-sub", parentId: session.id })}>
                  + Add sub-session
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  item,
  roomLabel,
  showDay,
  form,
  setForm,
  rooms,
  childCount,
  bold,
}: {
  item: ProgrammeItem;
  roomLabel: string;
  showDay?: boolean;
  form: FormState | null;
  setForm: (f: FormState | null) => void;
  rooms: ProgrammeRoom[];
  childCount: number;
  bold?: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const editing = form?.kind === "edit" && form.id === item.id;

  async function remove() {
    setBusy(true);
    const res = await deleteProgrammeItem(item.id);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  if (editing) {
    return (
      <div style={{ padding: 14, border: "1px solid var(--accent)", borderRadius: 12 }}>
        <ItemForm
          rooms={rooms}
          initial={{
            day: item.day,
            startTime: item.startTime,
            endTime: item.endTime ?? "",
            titleEn: item.titleEn,
            titleAr: item.titleAr ?? "",
            roomId: item.roomId ?? "",
            speakers: item.speakers ?? "",
            speakersAr: item.speakersAr ?? "",
            moderator: item.moderator ?? "",
            moderatorAr: item.moderatorAr ?? "",
            liveUrl: item.liveUrl ?? "",
          }}
          lockDay={!!item.parentId}
          onCancel={() => setForm(null)}
          onSaved={() => setForm(null)}
          save={(v) => updateProgrammeItem(item.id, v)}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 12.5, color: "var(--accent-ink)" }}>
            {showDay ? formatDayShort(item.day, "en") + " · " : ""}
            {formatTimeRange(item.startTime, item.endTime)}
          </span>
          {roomLabel && (
            <span className="chip" style={{ background: "var(--accent-weak)", color: "var(--accent-ink)" }}>
              {roomLabel}
            </span>
          )}
          {missingTitleAr(item) && (
            <span className="chip" style={{ background: "var(--pend-bg)", color: "var(--pend)" }}>
              Arabic title missing
            </span>
          )}
          {missingSpeakersAr(item) && (
            <span className="chip" style={{ background: "var(--pend-bg)", color: "var(--pend)" }}>
              Arabic names missing
            </span>
          )}
        </div>
        <div className="heading" style={{ fontWeight: bold ? 700 : 600, fontSize: bold ? 16 : 14.5, margin: "3px 0" }}>
          {item.titleEn}
        </div>
        {item.titleAr && (
          <div dir="rtl" lang="ar" style={{ fontFamily: "var(--font-arabic), sans-serif", fontSize: 14, color: "var(--muted)" }}>
            {item.titleAr}
          </div>
        )}
        {item.speakers && <div style={{ fontSize: 13, color: "var(--muted)" }}>Speakers: {item.speakers}</div>}
        {item.speakersAr && (
          <div dir="rtl" lang="ar" style={{ fontFamily: "var(--font-arabic), sans-serif", fontSize: 13.5, color: "var(--muted)" }}>
            {item.speakersAr}
          </div>
        )}
        {item.moderator && <div style={{ fontSize: 13, color: "var(--muted)" }}>Moderator: {item.moderator}</div>}
        {item.moderatorAr && (
          <div dir="rtl" lang="ar" style={{ fontFamily: "var(--font-arabic), sans-serif", fontSize: 13.5, color: "var(--muted)" }}>
            {item.moderatorAr}
          </div>
        )}
        {error && <div style={{ color: "var(--rej)", fontSize: 13, marginTop: 4 }}>{error}</div>}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {confirming ? (
          <>
            <span style={{ fontSize: 13, color: "var(--rej)", fontWeight: 600 }}>
              {childCount > 0 ? `Delete this and its ${childCount} sub-session${childCount === 1 ? "" : "s"}?` : "Delete this?"}
            </span>
            <button className="btn-small btn-danger-outline" disabled={busy} onClick={remove}>
              {busy ? "Deleting..." : "Yes, delete"}
            </button>
            <button className="btn-small btn-muted" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="btn-small btn-outline" onClick={() => setForm({ kind: "edit", id: item.id })}>
              Edit
            </button>
            <button className="btn-small btn-danger-outline" onClick={() => setConfirming(true)}>
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

type FormValues = Partial<Omit<ProgrammeItemInput, "parentId">>;

function ItemForm({
  rooms,
  initial,
  lockDay,
  onCancel,
  onSaved,
  save,
}: {
  rooms: ProgrammeRoom[];
  initial: FormValues;
  lockDay?: boolean;
  onCancel: () => void;
  onSaved: () => void;
  save: (v: Omit<ProgrammeItemInput, "parentId">) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [v, setV] = useState({
    day: initial.day ?? "",
    startTime: initial.startTime ?? "",
    endTime: initial.endTime ?? "",
    titleEn: initial.titleEn ?? "",
    titleAr: initial.titleAr ?? "",
    roomId: initial.roomId ?? "",
    speakers: initial.speakers ?? "",
    speakersAr: initial.speakersAr ?? "",
    moderator: initial.moderator ?? "",
    moderatorAr: initial.moderatorAr ?? "",
    liveUrl: initial.liveUrl ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await save(v);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
    onSaved();
  }

  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 };
  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 12 };

  return (
    <form onSubmit={submit}>
      <div style={grid}>
        <div>
          <label style={label}>Date *{lockDay ? " (same as its session)" : ""}</label>
          <input className="input" type="date" required disabled={lockDay} value={v.day} onChange={set("day")} />
        </div>
        <div>
          <label style={label}>Start time *</label>
          <input className="input" type="time" required value={v.startTime} onChange={set("startTime")} />
        </div>
        <div>
          <label style={label}>End time</label>
          <input className="input" type="time" value={v.endTime} onChange={set("endTime")} />
        </div>
        <div>
          <label style={label}>Room</label>
          <select className="input" value={v.roomId} onChange={set("roomId")}>
            <option value="">— none —</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nameEn}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={grid}>
        <div>
          <label style={label}>Title (English) *</label>
          <input className="input" required value={v.titleEn} onChange={set("titleEn")} />
        </div>
        <div>
          <label style={label}>العنوان (Arabic title)</label>
          <input className="input" dir="rtl" lang="ar" style={{ fontFamily: "var(--font-arabic), sans-serif" }} value={v.titleAr} onChange={set("titleAr")} />
        </div>
      </div>
      <div style={grid}>
        <div>
          <label style={label}>Speakers</label>
          <input className="input" value={v.speakers} onChange={set("speakers")} />
        </div>
        <div>
          <label style={label}>المتحدثون (Speakers in Arabic)</label>
          <input className="input" dir="rtl" lang="ar" style={{ fontFamily: "var(--font-arabic), sans-serif" }} value={v.speakersAr} onChange={set("speakersAr")} />
        </div>
        <div>
          <label style={label}>Moderator</label>
          <input className="input" value={v.moderator} onChange={set("moderator")} />
        </div>
        <div>
          <label style={label}>مدير الجلسة (Moderator in Arabic)</label>
          <input className="input" dir="rtl" lang="ar" style={{ fontFamily: "var(--font-arabic), sans-serif" }} value={v.moderatorAr} onChange={set("moderatorAr")} />
        </div>
        <div>
          <label style={label}>Live-stream link</label>
          <input className="input" type="url" placeholder="https://..." value={v.liveUrl} onChange={set("liveUrl")} />
        </div>
      </div>
      {error && <div style={{ color: "var(--rej)", fontSize: 13.5, marginBottom: 10, fontWeight: 600 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-small btn-primary" type="submit" disabled={busy}>
          {busy ? "Saving..." : "Save"}
        </button>
        <button className="btn-small btn-muted" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function RoomsPanel({ rooms }: { rooms: ProgrammeRoom[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const [newEn, setNewEn] = useState("");
  const [newAr, setNewAr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, after?: () => void) {
    setBusy(true);
    setError("");
    const res = await fn();
    setBusy(false);
    if (!res.ok) return setError(res.error);
    after?.();
    router.refresh();
  }

  const arStyle: React.CSSProperties = { fontFamily: "var(--font-arabic), sans-serif" };

  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Rooms</div>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 12px" }}>
        Rooms double as the programme tracks. Deleting a room keeps its sessions — they just show no room.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {rooms.map((r) =>
          editId === r.id ? (
            <div key={r.id} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input className="input" style={{ width: 200 }} value={en} onChange={(e) => setEn(e.target.value)} />
              <input className="input" dir="rtl" style={{ width: 200, ...arStyle }} value={ar} onChange={(e) => setAr(e.target.value)} placeholder="الاسم بالعربية" />
              <button className="btn-small btn-primary" disabled={busy} onClick={() => run(() => updateProgrammeRoom(r.id, en, ar), () => setEditId(null))}>
                Save
              </button>
              <button className="btn-small btn-muted" onClick={() => setEditId(null)}>
                Cancel
              </button>
            </div>
          ) : (
            <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ minWidth: 160, fontWeight: 600 }}>{r.nameEn}</span>
              <span dir="rtl" style={{ minWidth: 160, color: r.nameAr ? "var(--muted)" : "var(--pend)", ...arStyle }}>
                {r.nameAr ?? "Arabic missing"}
              </span>
              {confirmId === r.id ? (
                <>
                  <span style={{ fontSize: 13, color: "var(--rej)", fontWeight: 600 }}>Delete this room?</span>
                  <button className="btn-small btn-danger-outline" disabled={busy} onClick={() => run(() => deleteProgrammeRoom(r.id), () => setConfirmId(null))}>
                    Yes, delete
                  </button>
                  <button className="btn-small btn-muted" onClick={() => setConfirmId(null)}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn-small btn-outline"
                    onClick={() => {
                      setEditId(r.id);
                      setEn(r.nameEn);
                      setAr(r.nameAr ?? "");
                    }}
                  >
                    Edit
                  </button>
                  <button className="btn-small btn-danger-outline" onClick={() => setConfirmId(r.id)}>
                    Delete
                  </button>
                </>
              )}
            </div>
          )
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input className="input" style={{ width: 200 }} placeholder="New room (English) *" value={newEn} onChange={(e) => setNewEn(e.target.value)} />
        <input className="input" dir="rtl" style={{ width: 200, ...arStyle }} placeholder="الاسم بالعربية" value={newAr} onChange={(e) => setNewAr(e.target.value)} />
        <button
          className="btn-small btn-primary"
          disabled={busy}
          onClick={() => run(() => createProgrammeRoom(newEn, newAr), () => { setNewEn(""); setNewAr(""); })}
        >
          + Add room
        </button>
      </div>
      {error && <div style={{ color: "var(--rej)", fontSize: 13.5, marginTop: 10, fontWeight: 600 }}>{error}</div>}
    </div>
  );
}
