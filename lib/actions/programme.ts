"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProgrammeItemInput = {
  /** Set when adding a sub-session under an existing session. */
  parentId?: string | null;
  day: string;
  startTime: string;
  endTime: string;
  titleEn: string;
  titleAr: string;
  roomId: string;
  speakers: string;
  speakersAr: string;
  moderator: string;
  moderatorAr: string;
  liveUrl: string;
};

export type ProgrammeResult = { ok: true } | { ok: false; error: string };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const blank = (s: string | undefined) => {
  const t = (s ?? "").trim();
  return t === "" ? null : t;
};

function refresh() {
  revalidatePath("/programme-en");
  revalidatePath("/programme-ar");
  revalidatePath("/review/programme");
}

/** Checks the form values and turns them into a database row, or an error. */
async function buildRow(input: ProgrammeItemInput, existingId?: string) {
  const titleEn = input.titleEn.trim();
  if (!titleEn) return { error: "Please enter the English title." } as const;
  if (!DATE.test(input.day) || Number.isNaN(Date.parse(`${input.day}T00:00:00Z`))) {
    return { error: "Please choose a valid date." } as const;
  }
  if (!TIME.test(input.startTime)) return { error: "Please enter a start time (like 09:30)." } as const;
  const endTime = blank(input.endTime);
  if (endTime && !TIME.test(endTime)) return { error: "The end time isn't valid (use a format like 10:30)." } as const;
  if (endTime && endTime <= input.startTime) return { error: "The end time must be after the start time." } as const;

  const liveUrl = blank(input.liveUrl);
  if (liveUrl && !/^https?:\/\//i.test(liveUrl)) {
    return { error: "The live-stream link must start with http:// or https://" } as const;
  }

  const admin = createAdminClient();

  // A room, if chosen, must really exist.
  const roomId = blank(input.roomId);
  if (roomId) {
    const { data } = await admin.from("programme_rooms").select("id").eq("id", roomId).maybeSingle();
    if (!data) return { error: "That room no longer exists. Please pick another." } as const;
  }

  // Sub-sessions: parent must be a top-level session, and they share its day.
  let parentId = blank(input.parentId ?? undefined);
  let day = input.day;
  if (existingId && !parentId) {
    // Editing: keep whatever nesting the item already has.
    const { data: cur } = await admin.from("programme_items").select("parent_id").eq("id", existingId).maybeSingle();
    parentId = (cur?.parent_id as string | null) ?? null;
  }
  if (parentId) {
    if (parentId === existingId) return { error: "A session can't be its own parent." } as const;
    const { data: parent } = await admin.from("programme_items").select("id,day,parent_id").eq("id", parentId).maybeSingle();
    if (!parent) return { error: "The parent session no longer exists." } as const;
    if (parent.parent_id) return { error: "Sub-sessions can't have their own sub-sessions." } as const;
    day = parent.day as string;
  }

  return {
    row: {
      parent_id: parentId,
      day,
      start_time: input.startTime,
      end_time: endTime,
      title_en: titleEn,
      title_ar: blank(input.titleAr),
      room_id: roomId,
      speakers: blank(input.speakers),
      speakers_ar: blank(input.speakersAr),
      moderator: blank(input.moderator),
      moderator_ar: blank(input.moderatorAr),
      live_url: liveUrl,
    },
  } as const;
}

export async function createProgrammeItem(input: ProgrammeItemInput): Promise<ProgrammeResult> {
  await requireRole(["admin", "referee"]);
  const built = await buildRow(input);
  const row = built.row;
  if (!row) return { ok: false, error: built.error ?? "Please check the form." };

  const admin = createAdminClient();
  // New items go to the end of their group (the page sorts by time first).
  const { data: last } = await admin
    .from("programme_items")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = ((last?.sort_order as number | undefined) ?? 0) + 1;

  const { error } = await admin.from("programme_items").insert({ ...row, sort_order: sortOrder });
  if (error) return { ok: false, error: "Something went wrong saving. Please try again." };
  refresh();
  return { ok: true };
}

export async function updateProgrammeItem(id: string, input: ProgrammeItemInput): Promise<ProgrammeResult> {
  await requireRole(["admin", "referee"]);
  const built = await buildRow(input, id);
  const row = built.row;
  if (!row) return { ok: false, error: built.error ?? "Please check the form." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("programme_items")
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "Something went wrong saving. Please try again." };

  // If a session moved to another day, its sub-sessions move with it.
  const { error: childError } = await admin.from("programme_items").update({ day: row.day }).eq("parent_id", id);
  if (childError) return { ok: false, error: "Saved, but moving its sub-sessions to the new day failed. Please check them." };

  refresh();
  return { ok: true };
}

/** Deleting a session also deletes its sub-sessions (database cascade). */
export async function deleteProgrammeItem(id: string): Promise<ProgrammeResult> {
  await requireRole(["admin", "referee"]);
  const admin = createAdminClient();
  const { error } = await admin.from("programme_items").delete().eq("id", id);
  if (error) return { ok: false, error: "Something went wrong deleting. Please try again." };
  refresh();
  return { ok: true };
}

export async function createProgrammeRoom(nameEn: string, nameAr: string): Promise<ProgrammeResult> {
  await requireRole(["admin", "referee"]);
  const en = nameEn.trim();
  if (!en) return { ok: false, error: "Please enter the room name in English." };
  const admin = createAdminClient();
  const { data: last } = await admin
    .from("programme_rooms")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await admin
    .from("programme_rooms")
    .insert({ name_en: en, name_ar: blank(nameAr), sort_order: ((last?.sort_order as number | undefined) ?? 0) + 1 });
  if (error) return { ok: false, error: "Something went wrong saving the room." };
  refresh();
  return { ok: true };
}

export async function updateProgrammeRoom(id: string, nameEn: string, nameAr: string): Promise<ProgrammeResult> {
  await requireRole(["admin", "referee"]);
  const en = nameEn.trim();
  if (!en) return { ok: false, error: "Please enter the room name in English." };
  const admin = createAdminClient();
  const { error } = await admin.from("programme_rooms").update({ name_en: en, name_ar: blank(nameAr) }).eq("id", id);
  if (error) return { ok: false, error: "Something went wrong saving the room." };
  refresh();
  return { ok: true };
}

/** Sessions that used this room are kept - they just show no room. */
export async function deleteProgrammeRoom(id: string): Promise<ProgrammeResult> {
  await requireRole(["admin", "referee"]);
  const admin = createAdminClient();
  const { error } = await admin.from("programme_rooms").delete().eq("id", id);
  if (error) return { ok: false, error: "Something went wrong deleting the room." };
  refresh();
  return { ok: true };
}
