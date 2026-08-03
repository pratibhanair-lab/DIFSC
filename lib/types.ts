export type Role = "admin" | "referee";

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  focus_area: string | null;
};

export type SessionStatus = "pending" | "approved" | "rejected";
export type SpeakerStatus = "pending" | "approved" | "confirmed" | "rejected";
export type SubmissionKind = "session" | "speaker" | "both";
export type SpeakerLocation = "International" | "GCC" | "UAE" | "DM";
/** external = public home page (/), internal = Dubai Municipality staff page (/proposals). */
export type SubmissionSource = "external" | "internal";

export type Category = { id: string; name: string };
export type SessionType = { id: string; name: string };
export type OrgSection = { id: string; name: string };
export type Hall = { id: string; name: string };

export type Speaker = {
  id: string;
  submission_id: string;
  session_id: string | null;
  name: string;
  contact: string | null;
  bio: string | null;
  topic: string;
  location: SpeakerLocation | null;
  affiliation: string | null;
  commercial_involvement: boolean;
  status: SpeakerStatus;
  review_comment: string | null;
};

export type SessionRow = {
  id: string;
  submission_id: string;
  title: string;
  description: string | null;
  category_id: string;
  session_type_id: string;
  recommended_duration_hours: number;
  partner_org: string | null;
  previously_presented: boolean;
  previously_presented_where: string | null;
  previously_presented_when: string | null;
  commercial_involvement: boolean;
  status: SessionStatus;
  review_comment: string | null;
};

export type Submission = {
  id: string;
  reference: string;
  kind: SubmissionKind;
  source: SubmissionSource;
  submitter_name: string;
  submitter_email: string;
  submitter_phone: string | null;
  org_section_id: string | null;
  created_at: string;
};
