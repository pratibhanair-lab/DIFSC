import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SessionStatus, SpeakerLocation, SpeakerStatus, SubmissionKind } from "@/lib/types";

export type SpeakerView = {
  id: string;
  name: string;
  contact: string | null;
  bio: string | null;
  topic: string;
  location: SpeakerLocation | null;
  affiliation: string | null;
  status: SpeakerStatus;
};

export type SessionView = {
  id: string;
  title: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  sessionTypeId: string;
  sessionTypeName: string;
  recommendedDurationHours: number;
  partnerOrg: string | null;
  status: SessionStatus;
  reviewComment: string | null;
  speakers: SpeakerView[];
};

export type SubmissionView = {
  id: string;
  reference: string;
  kind: SubmissionKind;
  submitterName: string;
  submitterEmail: string;
  submitterPhone: string | null;
  orgSectionName: string | null;
  createdAt: string;
  /** Every session topic submitted alongside this submission (0, 1, or many). */
  sessions: SessionView[];
  /** Speakers not tied to a specific session — only populated for kind === "speaker". */
  speakers: SpeakerView[];
  /**
   * The one status that drives the review queue and the overview counts.
   * With sessions: pending if any session is pending, rejected if every
   * session is rejected, else approved. Speaker-only submissions (no
   * sessions) are "pending" until every speaker has been individually
   * decided, at which point they read as approved (unless all rejected).
   */
  overallStatus: SessionStatus;
};

export async function fetchAllSubmissions(): Promise<SubmissionView[]> {
  const admin = createAdminClient();
  const [
    { data: submissions },
    { data: sessions },
    { data: speakers },
    { data: categories },
    { data: sessionTypes },
    { data: orgSections },
  ] = await Promise.all([
    admin.from("submissions").select("*").order("created_at", { ascending: false }),
    admin.from("sessions").select("*"),
    admin.from("speakers").select("*"),
    admin.from("categories").select("id,name"),
    admin.from("session_types").select("id,name"),
    admin.from("org_sections").select("id,name"),
  ]);

  const catMap = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const typeMap = new Map((sessionTypes ?? []).map((t) => [t.id, t.name]));
  const orgMap = new Map((orgSections ?? []).map((o) => [o.id, o.name]));

  const sessionsBySubmission = new Map<string, NonNullable<typeof sessions>>();
  (sessions ?? []).forEach((s) => {
    const arr = sessionsBySubmission.get(s.submission_id) ?? [];
    arr.push(s);
    sessionsBySubmission.set(s.submission_id, arr);
  });

  const speakersBySession = new Map<string, NonNullable<typeof speakers>>();
  const unlinkedSpeakersBySubmission = new Map<string, NonNullable<typeof speakers>>();
  (speakers ?? []).forEach((sp) => {
    if (sp.session_id) {
      const arr = speakersBySession.get(sp.session_id) ?? [];
      arr.push(sp);
      speakersBySession.set(sp.session_id, arr);
    } else {
      const arr = unlinkedSpeakersBySubmission.get(sp.submission_id) ?? [];
      arr.push(sp);
      unlinkedSpeakersBySubmission.set(sp.submission_id, arr);
    }
  });

  function toSpeakerView(sp: NonNullable<typeof speakers>[number]): SpeakerView {
    return {
      id: sp.id,
      name: sp.name,
      contact: sp.contact,
      bio: sp.bio,
      topic: sp.topic,
      location: sp.location,
      affiliation: sp.affiliation,
      status: sp.status,
    };
  }

  return (submissions ?? []).map((sub): SubmissionView => {
    const sessionRows = sessionsBySubmission.get(sub.id) ?? [];
    const unlinkedSpeakers = unlinkedSpeakersBySubmission.get(sub.id) ?? [];

    const sessionViews: SessionView[] = sessionRows.map((sessionRow) => ({
      id: sessionRow.id,
      title: sessionRow.title,
      description: sessionRow.description,
      categoryId: sessionRow.category_id,
      categoryName: catMap.get(sessionRow.category_id) ?? "",
      sessionTypeId: sessionRow.session_type_id,
      sessionTypeName: typeMap.get(sessionRow.session_type_id) ?? "",
      recommendedDurationHours: sessionRow.recommended_duration_hours,
      partnerOrg: sessionRow.partner_org,
      status: sessionRow.status,
      reviewComment: sessionRow.review_comment,
      speakers: (speakersBySession.get(sessionRow.id) ?? []).map(toSpeakerView),
    }));

    let overallStatus: SessionStatus;
    if (sessionViews.length > 0) {
      if (sessionViews.some((s) => s.status === "pending")) overallStatus = "pending";
      else if (sessionViews.every((s) => s.status === "rejected")) overallStatus = "rejected";
      else overallStatus = "approved";
    } else if (unlinkedSpeakers.length > 0 && unlinkedSpeakers.every((sp) => sp.status !== "pending")) {
      overallStatus = unlinkedSpeakers.every((sp) => sp.status === "rejected") ? "rejected" : "approved";
    } else {
      overallStatus = "pending";
    }

    return {
      id: sub.id,
      reference: sub.reference,
      kind: sub.kind,
      submitterName: sub.submitter_name,
      submitterEmail: sub.submitter_email,
      submitterPhone: sub.submitter_phone,
      orgSectionName: sub.org_section_id ? orgMap.get(sub.org_section_id) ?? null : null,
      createdAt: sub.created_at,
      sessions: sessionViews,
      speakers: unlinkedSpeakers.map(toSpeakerView),
      overallStatus,
    };
  });
}

export function titleOf(sub: SubmissionView): string {
  if (sub.sessions.length) {
    const first = sub.sessions[0].title;
    return sub.sessions.length === 1 ? first : `${first} +${sub.sessions.length - 1} more`;
  }
  if (sub.speakers.length) return sub.speakers[0].name;
  return "Speaker suggestion";
}

export function sublineOf(sub: SubmissionView): string {
  if (sub.sessions.length) {
    const allSpeakers = sub.sessions.flatMap((s) => s.speakers);
    if (allSpeakers.length) {
      const names = allSpeakers.length === 1 ? allSpeakers[0].name : `${allSpeakers[0].name} +${allSpeakers.length - 1} more`;
      return `Speakers: ${names}`;
    }
    return sub.sessions[0].description?.slice(0, 60) + "..." || "";
  }
  if (sub.speakers.length) return sub.speakers[0].topic || "Speaker suggestion";
  return "";
}
