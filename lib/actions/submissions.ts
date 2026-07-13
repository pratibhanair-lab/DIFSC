"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSubmissionConfirmation } from "@/lib/email";
import type { SpeakerLocation } from "@/lib/types";

export type SubmitSpeakerInput = {
  name: string;
  contact: string;
  bio: string;
  topic: string;
  location: SpeakerLocation | "";
  affiliation: string;
};

export type SubmitSessionInput = {
  title: string;
  description: string;
  categoryId: string;
  sessionTypeId: string;
  durationHours: number;
  partnerOrg: string;
  speakers: SubmitSpeakerInput[];
};

export type SubmitPayload = {
  kind: "session" | "speaker" | "both";
  subName: string;
  subEmail: string;
  subPhone: string;
  orgSectionId: string;
  sessions?: SubmitSessionInput[];
  speakers?: SubmitSpeakerInput[];
};

export type SubmitResult =
  | { ok: true; reference: string; firstName: string }
  | { ok: false; error: string };

export type ActionResult = { ok: true } | { ok: false; error: string };

function speakerRow(sp: SubmitSpeakerInput, submissionId: string, sessionId: string | null) {
  return {
    submission_id: submissionId,
    session_id: sessionId,
    name: sp.name.trim(),
    contact: sp.contact.trim() || null,
    bio: sp.bio.trim() || null,
    topic: sp.topic.trim(),
    location: sp.location || null,
    affiliation: sp.affiliation.trim() || null,
  };
}

export async function submitSuggestion(payload: SubmitPayload): Promise<SubmitResult> {
  const name = payload.subName.trim();
  const email = payload.subEmail.trim();
  if (!name || !email) return { ok: false, error: "Please enter your full name and email." };

  const needSessions = payload.kind === "session" || payload.kind === "both";
  const needSpeakers = payload.kind === "speaker";

  const sessions = payload.sessions ?? [];
  if (needSessions) {
    if (sessions.length === 0) return { ok: false, error: "Please add at least one session topic." };
    const incomplete = sessions.some((s) => !s.title.trim() || !s.categoryId || !s.sessionTypeId);
    if (incomplete) return { ok: false, error: "Please fill in the title, category and session type for every session." };
    if (payload.kind === "both") {
      const totalSpeakers = sessions.reduce((n, s) => n + s.speakers.length, 0);
      if (totalSpeakers === 0) return { ok: false, error: "Please add at least one speaker." };
      const incompleteSpeaker = sessions.some((s) => s.speakers.some((sp) => !sp.name.trim() || !sp.topic.trim()));
      if (incompleteSpeaker) return { ok: false, error: "Please fill in speaker name and topic for every speaker." };
    }
  }
  if (needSpeakers) {
    const speakers = payload.speakers ?? [];
    if (speakers.length === 0) return { ok: false, error: "Please add at least one speaker." };
    const incomplete = speakers.some((sp) => !sp.name.trim() || !sp.topic.trim());
    if (incomplete)
      return { ok: false, error: "Please fill in speaker name and topic for every speaker." };
  }

  const admin = createAdminClient();

  const { data: reference, error: refError } = await admin.rpc("next_submission_reference");
  if (refError || !reference) {
    return { ok: false, error: "Something went wrong generating a reference number. Please try again." };
  }

  const { data: submission, error: subError } = await admin
    .from("submissions")
    .insert({
      reference,
      kind: payload.kind,
      submitter_name: name,
      submitter_email: email,
      submitter_phone: payload.subPhone.trim() || null,
      org_section_id: payload.orgSectionId || null,
    })
    .select("id")
    .single();

  if (subError || !submission) {
    return { ok: false, error: "Something went wrong saving your suggestion. Please try again." };
  }

  if (needSessions) {
    for (const s of sessions) {
      const { data: sessionRow, error: sessionError } = await admin
        .from("sessions")
        .insert({
          submission_id: submission.id,
          title: s.title.trim(),
          description: s.description.trim() || null,
          category_id: s.categoryId,
          session_type_id: s.sessionTypeId,
          recommended_duration_hours: s.durationHours,
          partner_org: s.partnerOrg.trim() || null,
        })
        .select("id")
        .single();

      if (sessionError || !sessionRow) {
        return { ok: false, error: "Something went wrong saving the session details. Please try again." };
      }

      if (payload.kind === "both" && s.speakers.length > 0) {
        const rows = s.speakers.map((sp) => speakerRow(sp, submission.id, sessionRow.id));
        const { error: speakersError } = await admin.from("speakers").insert(rows);
        if (speakersError) {
          return { ok: false, error: "Something went wrong saving the speaker details. Please try again." };
        }
      }
    }
  }

  if (needSpeakers && payload.speakers) {
    const rows = payload.speakers.map((sp) => speakerRow(sp, submission.id, null));
    const { error: speakersError } = await admin.from("speakers").insert(rows);
    if (speakersError) {
      return { ok: false, error: "Something went wrong saving the speaker details. Please try again." };
    }
  }

  try {
    await sendSubmissionConfirmation({ to: email, name, reference });
  } catch (err) {
    // Don't fail the submission just because the email didn't send.
    console.error("sendSubmissionConfirmation failed:", err);
  }

  return { ok: true, reference, firstName: name.split(" ")[0] };
}

export async function deleteSubmission(submissionId: string, passcode: string): Promise<ActionResult> {
  await requireRole(["admin"]);

  const expected = process.env.DELETE_PASSCODE;
  if (!expected) {
    return { ok: false, error: "Delete passcode isn't configured on the server yet." };
  }
  if (passcode !== expected) {
    return { ok: false, error: "Incorrect passcode." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("submissions").delete().eq("id", submissionId);
  if (error) {
    return { ok: false, error: "Could not delete that submission." };
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/admin");
  revalidatePath("/review");
  revalidatePath("/schedule");
  revalidatePath("/approved");

  return { ok: true };
}
