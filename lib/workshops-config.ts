// Not a "use server" file, so the page, the form and the Server Actions can
// all import it.
//
// To fill in a workshop's brief or speakers later, edit the `about` and
// `speakers` fields below. Leave them as null / [] and the page shows
// "details coming soon". Don't change a workshop's `id` once people have
// registered — it is how registrations are matched to workshops.

export type WorkshopSpeaker = {
  name: string;
  role: string; // job title and organization
  bio?: string;
};

export type Workshop = {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  venue: string;
  about: string | null;
  speakers: WorkshopSpeaker[];
};

export const WORKSHOPS: Workshop[] = [
  {
    id: "modern-food-safety-regulator",
    title: "Developing the Modern Food Safety Regulator",
    dateLabel: "18 November 2026",
    timeLabel: "9:00 AM – 12:00 PM",
    venue: "Marriott Al Jadaf Hotel",
    about: null,
    speakers: [],
  },
  {
    id: "food-defense-strategies",
    title: "Food Defense Strategies for Regulators",
    dateLabel: "19 November 2026",
    timeLabel: "8:30 AM – 4:30 PM",
    venue: "Marriott Al Jadaf Hotel",
    about: null,
    speakers: [],
  },
];

export const WORKSHOP_STATUSES = ["interested", "confirmed", "waitlisted", "declined"] as const;
export type WorkshopStatus = (typeof WORKSHOP_STATUSES)[number];

export const WORKSHOP_STATUS_LABELS: Record<WorkshopStatus, string> = {
  interested: "Interested",
  confirmed: "Confirmed",
  waitlisted: "Waitlisted",
  declined: "Declined",
};

export function workshopTitle(id: string): string {
  return WORKSHOPS.find((w) => w.id === id)?.title ?? id;
}
