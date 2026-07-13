import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SpeakerLocation } from "@/lib/types";

export type ApprovedSpeaker = {
  id: string;
  name: string;
  topic: string;
  bio: string | null;
  location: SpeakerLocation | null;
  affiliation: string | null;
};

export type ApprovedSession = {
  id: string;
  title: string;
  description: string | null;
  categoryName: string;
  sessionTypeName: string;
  recommendedDurationHours: number;
  partnerOrg: string | null;
  speakers: ApprovedSpeaker[];
};

export type ApprovedListing = {
  sessions: ApprovedSession[];
  standaloneSpeakers: ApprovedSpeaker[];
};

/**
 * Public "what's been approved so far" listing. Shows everything approved
 * regardless of whether it's been placed on the schedule yet — same
 * "don't gate on confirmed" visibility policy /programme already uses.
 */
export async function fetchApprovedListing(): Promise<ApprovedListing> {
  const admin = createAdminClient();

  const [{ data: sessions }, { data: speakers }, { data: categories }, { data: sessionTypes }] = await Promise.all([
    admin.from("sessions").select("id, title, description, category_id, session_type_id, recommended_duration_hours, partner_org, status").eq("status", "approved"),
    admin.from("speakers").select("id, session_id, name, topic, bio, location, affiliation, status").in("status", ["approved", "confirmed"]),
    admin.from("categories").select("id,name"),
    admin.from("session_types").select("id,name"),
  ]);

  const catMap = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const typeMap = new Map((sessionTypes ?? []).map((t) => [t.id, t.name]));

  const speakersBySession = new Map<string, NonNullable<typeof speakers>>();
  const standalone: NonNullable<typeof speakers> = [];
  (speakers ?? []).forEach((sp) => {
    if (sp.session_id) {
      const arr = speakersBySession.get(sp.session_id) ?? [];
      arr.push(sp);
      speakersBySession.set(sp.session_id, arr);
    } else {
      standalone.push(sp);
    }
  });

  function toApprovedSpeaker(sp: NonNullable<typeof speakers>[number]): ApprovedSpeaker {
    return { id: sp.id, name: sp.name, topic: sp.topic, bio: sp.bio, location: sp.location, affiliation: sp.affiliation };
  }

  const approvedSessions: ApprovedSession[] = (sessions ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    categoryName: catMap.get(s.category_id) ?? "",
    sessionTypeName: typeMap.get(s.session_type_id) ?? "",
    recommendedDurationHours: s.recommended_duration_hours,
    partnerOrg: s.partner_org,
    speakers: (speakersBySession.get(s.id) ?? []).map(toApprovedSpeaker),
  }));

  return {
    sessions: approvedSessions,
    standaloneSpeakers: standalone.map(toApprovedSpeaker),
  };
}
