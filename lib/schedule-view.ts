import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type UnscheduledSession = {
  id: string;
  title: string;
  category: string;
  durationHours: number;
  speakerPreview: string;
};

export type SpeakerPoolEntry = {
  id: string;
  name: string;
  topic: string;
};

export type ScheduledCard = {
  scheduleId: string;
  sessionId: string;
  hallId: string;
  startSlot: number;
  durationHours: number;
  title: string;
  category: string;
  speakerPreview: string;
  speakers: { speakerId: string; name: string; topic: string }[];
};

export type ScheduleBoard = {
  halls: { id: string; name: string }[];
  unscheduled: UnscheduledSession[];
  speakerPool: SpeakerPoolEntry[];
  cardsByDay: Record<string, ScheduledCard[]>;
};

const CAT_COLORS = ["#17805A", "#2563B0", "#B0632A", "#8A5CD1", "#158A8F", "#C0453A", "#4B7A1E"];
export function categoryColor(categories: { id: string }[], categoryId: string) {
  const i = categories.findIndex((c) => c.id === categoryId);
  return CAT_COLORS[(i < 0 ? 0 : i) % CAT_COLORS.length];
}

function speakerPreviewFor(speakers: { name: string; status: string }[]) {
  const good = speakers.filter((s) => s.status === "approved" || s.status === "confirmed");
  const use = good.length ? good : speakers;
  if (!use.length) return "Speaker TBD";
  const confirmed = use.some((s) => s.status === "confirmed");
  const base = use.length === 1 ? use[0].name : `${use[0].name} +${use.length - 1}`;
  return (confirmed ? "★ " : "") + base;
}

export async function fetchScheduleBoard(days: string[]): Promise<ScheduleBoard> {
  const admin = createAdminClient();

  const [
    { data: halls },
    { data: categories },
    { data: sessions },
    { data: speakers },
    { data: scheduleRows },
    { data: sessionSpeakers },
  ] = await Promise.all([
    admin.from("halls").select("id,name").order("name"),
    admin.from("categories").select("id,name").order("name"),
    admin.from("sessions").select("id, title, category_id, recommended_duration_hours, status"),
    admin.from("speakers").select("id, session_id, name, topic, status"),
    admin.from("schedule").select("*").in("day", days),
    admin.from("session_speakers").select("*").order("position", { ascending: true }),
  ]);

  const catMap = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const speakersBySession = new Map<string, NonNullable<typeof speakers>>();
  (speakers ?? []).forEach((sp) => {
    if (!sp.session_id) return;
    const arr = speakersBySession.get(sp.session_id) ?? [];
    arr.push(sp);
    speakersBySession.set(sp.session_id, arr);
  });
  const speakerById = new Map((speakers ?? []).map((sp) => [sp.id, sp]));

  const scheduledSessionIds = new Set((scheduleRows ?? []).map((r) => r.session_id));

  const unscheduled: UnscheduledSession[] = (sessions ?? [])
    .filter((s) => s.status === "approved" && !scheduledSessionIds.has(s.id))
    .map((s) => ({
      id: s.id,
      title: s.title,
      category: catMap.get(s.category_id) ?? "",
      durationHours: s.recommended_duration_hours,
      speakerPreview: speakerPreviewFor(speakersBySession.get(s.id) ?? []),
    }));

  const speakerPool: SpeakerPoolEntry[] = (speakers ?? [])
    .filter((sp) => sp.status === "approved" || sp.status === "confirmed")
    .map((sp) => ({ id: sp.id, name: sp.name, topic: sp.topic }));

  const sessionById = new Map((sessions ?? []).map((s) => [s.id, s]));
  const speakersByScheduleId = new Map<string, NonNullable<typeof sessionSpeakers>>();
  (sessionSpeakers ?? []).forEach((row) => {
    const arr = speakersByScheduleId.get(row.schedule_id) ?? [];
    arr.push(row);
    speakersByScheduleId.set(row.schedule_id, arr);
  });

  const cardsByDay: Record<string, ScheduledCard[]> = {};
  for (const day of days) cardsByDay[day] = [];

  (scheduleRows ?? []).forEach((row) => {
    const session = sessionById.get(row.session_id);
    if (!session) return;
    const assigned = (speakersByScheduleId.get(row.id) ?? [])
      .map((r) => speakerById.get(r.speaker_id))
      .filter((sp): sp is NonNullable<typeof sp> => !!sp)
      .map((sp) => ({ speakerId: sp.id, name: sp.name, topic: sp.topic }));

    const card: ScheduledCard = {
      scheduleId: row.id,
      sessionId: row.session_id,
      hallId: row.hall_id,
      startSlot: row.start_slot,
      durationHours: row.duration_hours,
      title: session.title,
      category: catMap.get(session.category_id) ?? "",
      speakerPreview: speakerPreviewFor(speakersBySession.get(session.id) ?? []),
      speakers: assigned,
    };
    cardsByDay[row.day] = [...(cardsByDay[row.day] ?? []), card];
  });

  return { halls: halls ?? [], unscheduled, speakerPool, cardsByDay };
}
