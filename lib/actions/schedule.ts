"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: true } | { ok: false; error: string };

const CONFLICT_CODE = "23P01"; // Postgres exclusion_violation

async function revalidate() {
  revalidatePath("/schedule");
  revalidatePath("/admin");
}

export async function placeSession(opts: {
  sessionId: string;
  hallId: string;
  day: string;
  startSlot: number;
  durationHours: number;
}): Promise<ActionResult> {
  await requireRole(["admin"]);
  const admin = createAdminClient();

  const { data: existing } = await admin.from("schedule").select("id").eq("session_id", opts.sessionId).maybeSingle();

  const row = {
    session_id: opts.sessionId,
    hall_id: opts.hallId,
    day: opts.day,
    start_slot: opts.startSlot,
    duration_hours: opts.durationHours,
  };

  const { error } = existing
    ? await admin.from("schedule").update(row).eq("id", existing.id)
    : await admin.from("schedule").insert(row);

  if (error) {
    if (error.code === CONFLICT_CODE) {
      return { ok: false, error: "That time overlaps another session in this hall." };
    }
    return { ok: false, error: "Could not schedule that session." };
  }
  await revalidate();
  return { ok: true };
}

export async function resizeSchedule(scheduleId: string, durationHours: number): Promise<ActionResult> {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  const { error } = await admin.from("schedule").update({ duration_hours: durationHours }).eq("id", scheduleId);
  if (error) {
    if (error.code === CONFLICT_CODE) return { ok: false, error: "Can't resize — that would overlap the next session." };
    if (error.code === "23514") return { ok: false, error: "Reached the end of the day." };
    return { ok: false, error: "Could not resize that session." };
  }
  await revalidate();
  return { ok: true };
}

export async function unscheduleSession(scheduleId: string) {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  await admin.from("schedule").delete().eq("id", scheduleId);
  await revalidate();
}

export async function assignSpeakerToSchedule(scheduleId: string, speakerId: string) {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  const { data: existing } = await admin.from("session_speakers").select("position").eq("schedule_id", scheduleId).order("position", { ascending: false }).limit(1);
  const nextPosition = existing && existing.length ? existing[0].position + 1 : 0;
  await admin.from("session_speakers").insert({ schedule_id: scheduleId, speaker_id: speakerId, position: nextPosition });
  await revalidate();
}

export async function removeSpeakerFromSchedule(scheduleId: string, speakerId: string) {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  await admin.from("session_speakers").delete().eq("schedule_id", scheduleId).eq("speaker_id", speakerId);
  await revalidate();
}

export async function reorderSpeaker(scheduleId: string, speakerId: string, direction: -1 | 1) {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("session_speakers")
    .select("speaker_id, position")
    .eq("schedule_id", scheduleId)
    .order("position", { ascending: true });
  if (!rows) return;
  const idx = rows.findIndex((r) => r.speaker_id === speakerId);
  const swapIdx = idx + direction;
  if (idx === -1 || swapIdx < 0 || swapIdx >= rows.length) return;

  const a = rows[idx];
  const b = rows[swapIdx];
  await admin.from("session_speakers").update({ position: b.position }).eq("schedule_id", scheduleId).eq("speaker_id", a.speaker_id);
  await admin.from("session_speakers").update({ position: a.position }).eq("schedule_id", scheduleId).eq("speaker_id", b.speaker_id);
  await revalidate();
}
