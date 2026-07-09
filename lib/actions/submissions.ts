"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendSubmissionConfirmation } from "@/lib/email";

export type SubmitSpeakerInput = {
  name: string;
  contact: string;
  bio: string;
  topic: string;
};

export type SubmitPayload = {
  kind: "session" | "speaker" | "both";
  subName: string;
  subEmail: string;
  subPhone: string;
  orgSectionId: string;
  linkSpeakersToSession: boolean;
  session?: {
    title: string;
    description: string;
    categoryId: string;
    sessionTypeId: string;
    durationHours: number;
    partnerOrg: string;
  };
  speakers?: SubmitSpeakerInput[];
};

export type SubmitResult =
  | { ok: true; reference: string; firstName: string }
  | { ok: false; error: string };

export async function submitSuggestion(payload: SubmitPayload): Promise<SubmitResult> {
  const name = payload.subName.trim();
  const email = payload.subEmail.trim();
  if (!name || !email) return { ok: false, error: "Please enter your full name and email." };

  const needSession = payload.kind === "session" || payload.kind === "both";
  const needSpeakers = payload.kind === "speaker" || payload.kind === "both";

  if (needSession) {
    const s = payload.session;
    if (!s?.title.trim()) return { ok: false, error: "Please enter a session topic title." };
    if (!s.categoryId) return { ok: false, error: "Please select a category." };
    if (!s.sessionTypeId) return { ok: false, error: "Please select a session type." };
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
      link_speakers_to_session: payload.kind === "both" ? payload.linkSpeakersToSession : false,
    })
    .select("id")
    .single();

  if (subError || !submission) {
    return { ok: false, error: "Something went wrong saving your suggestion. Please try again." };
  }

  let sessionId: string | null = null;
  if (needSession && payload.session) {
    const s = payload.session;
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
    sessionId = sessionRow.id;
  }

  if (needSpeakers && payload.speakers) {
    const shouldLink = payload.kind === "both" && payload.linkSpeakersToSession;
    const rows = payload.speakers.map((sp) => ({
      submission_id: submission.id,
      session_id: shouldLink ? sessionId : null,
      name: sp.name.trim(),
      contact: sp.contact.trim() || null,
      bio: sp.bio.trim() || null,
      topic: sp.topic.trim(),
    }));
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
