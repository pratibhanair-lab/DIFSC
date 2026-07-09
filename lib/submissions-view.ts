import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SessionStatus, SpeakerStatus, SubmissionKind } from "@/lib/types";

export type SubmissionView = {
  id: string;
  reference: string;
  kind: SubmissionKind;
  submitterName: string;
  submitterEmail: string;
  submitterPhone: string | null;
  orgSectionName: string | null;
  createdAt: string;
  session: null | {
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
  };
  speakers: {
    id: string;
    name: string;
    contact: string | null;
    bio: string | null;
    topic: string;
    status: SpeakerStatus;
  }[];
  /**
   * The one status that drives the review queue and the overview counts.
   * Sessions carry their own status. Speaker-only submissions (no session)
   * are "pending" until every speaker on them has been individually
   * decided, at which point they read as approved (unless all were
   * rejected).
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
  const sessionBySubmission = new Map((sessions ?? []).map((s) => [s.submission_id, s]));

  const speakersBySubmission = new Map<string, NonNullable<typeof speakers>>();
  (speakers ?? []).forEach((sp) => {
    const arr = speakersBySubmission.get(sp.submission_id) ?? [];
    arr.push(sp);
    speakersBySubmission.set(sp.submission_id, arr);
  });

  return (submissions ?? []).map((sub): SubmissionView => {
    const sessionRow = sessionBySubmission.get(sub.id);
    const spRows = speakersBySubmission.get(sub.id) ?? [];

    let overallStatus: SessionStatus;
    if (sessionRow) {
      overallStatus = sessionRow.status;
    } else if (spRows.length > 0 && spRows.every((sp) => sp.status !== "pending")) {
      overallStatus = spRows.every((sp) => sp.status === "rejected") ? "rejected" : "approved";
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
      session: sessionRow
        ? {
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
          }
        : null,
      speakers: spRows.map((sp) => ({
        id: sp.id,
        name: sp.name,
        contact: sp.contact,
        bio: sp.bio,
        topic: sp.topic,
        status: sp.status,
      })),
      overallStatus,
    };
  });
}

export function titleOf(sub: SubmissionView): string {
  if (sub.session) return sub.session.title;
  if (sub.speakers.length) return sub.speakers[0].name;
  return "Speaker suggestion";
}

export function sublineOf(sub: SubmissionView): string {
  if (sub.session && sub.speakers.length) {
    const names = sub.speakers.length === 1 ? sub.speakers[0].name : `${sub.speakers[0].name} +${sub.speakers.length - 1} more`;
    return `Speakers: ${names}`;
  }
  if (!sub.session && sub.speakers.length) return sub.speakers[0].topic || "Speaker suggestion";
  return sub.session?.description?.slice(0, 60) + "..." || "";
}
