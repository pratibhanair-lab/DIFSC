import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProgrammeItem, ProgrammeRoom, ProgrammeSession } from "@/lib/programme-config";

type RoomRow = { id: string; name_en: string; name_ar: string | null; sort_order: number };
type ItemRow = {
  id: string;
  parent_id: string | null;
  day: string;
  start_time: string;
  end_time: string | null;
  title_en: string;
  title_ar: string | null;
  room_id: string | null;
  speakers: string | null;
  speakers_ar: string | null;
  moderator: string | null;
  moderator_ar: string | null;
  live_url: string | null;
  sort_order: number;
};

// Postgres hands back times as "09:45:00" - we only ever show "09:45".
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

function toItem(r: ItemRow): ProgrammeItem {
  return {
    id: r.id,
    parentId: r.parent_id,
    day: r.day,
    startTime: hhmm(r.start_time)!,
    endTime: hhmm(r.end_time),
    titleEn: r.title_en,
    titleAr: r.title_ar,
    roomId: r.room_id,
    speakers: r.speakers,
    speakersAr: r.speakers_ar,
    moderator: r.moderator,
    moderatorAr: r.moderator_ar,
    liveUrl: r.live_url,
    sortOrder: r.sort_order,
  };
}

export type ProgrammeData = {
  rooms: ProgrammeRoom[];
  /** Every day that has at least one session, oldest first. */
  days: { day: string; sessions: ProgrammeSession[] }[];
  /** Flat list of every item (sessions and sub-sessions), for the editor. */
  items: ProgrammeItem[];
};

/**
 * Reads the whole programme. Used by the two public pages (no login) and by
 * the editor. Contains no personal/contact data - only what is printed in the
 * programme itself.
 */
export async function fetchProgramme(): Promise<ProgrammeData> {
  const admin = createAdminClient();
  const [roomsRes, itemsRes] = await Promise.all([
    admin.from("programme_rooms").select("id,name_en,name_ar,sort_order").order("sort_order").order("name_en"),
    admin
      .from("programme_items")
      .select("id,parent_id,day,start_time,end_time,title_en,title_ar,room_id,speakers,speakers_ar,moderator,moderator_ar,live_url,sort_order")
      .order("day")
      .order("start_time")
      .order("sort_order"),
  ]);
  if (roomsRes.error) throw new Error(roomsRes.error.message);
  if (itemsRes.error) throw new Error(itemsRes.error.message);

  const rooms: ProgrammeRoom[] = ((roomsRes.data ?? []) as RoomRow[]).map((r) => ({
    id: r.id,
    nameEn: r.name_en,
    nameAr: r.name_ar,
    sortOrder: r.sort_order,
  }));
  const items = ((itemsRes.data ?? []) as ItemRow[]).map(toItem);

  const childrenOf = new Map<string, ProgrammeItem[]>();
  for (const it of items) {
    if (it.parentId) {
      const list = childrenOf.get(it.parentId) ?? [];
      list.push(it);
      childrenOf.set(it.parentId, list);
    }
  }

  const byDay = new Map<string, ProgrammeSession[]>();
  for (const it of items) {
    if (it.parentId) continue;
    const list = byDay.get(it.day) ?? [];
    list.push({ ...it, children: childrenOf.get(it.id) ?? [] });
    byDay.set(it.day, list);
  }
  const days = [...byDay.keys()].sort().map((day) => ({ day, sessions: byDay.get(day)! }));

  return { rooms, days, items };
}
