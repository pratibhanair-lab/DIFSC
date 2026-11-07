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
    timeLabel: "8:30 AM – 12:00 PM",
    venue: "Marriott Al Jadaf Hotel",
    about:
      "Food safety regulation has focused on identifying non-conformances and enforcing compliance. As food safety culture gains regulatory recognition, inspectors must also understand how leadership and organisational behaviour shape outcomes. This workshop shows how routine inspection evidence (maintenance, staff practices, corrective actions, management accountability) can reveal cultural maturity. It also explores the competencies modern regulators need.\n\n" +
      "Participants will be able to:\n\n" +
      "• Explain how technical findings reveal cultural maturity\n" +
      "• Identify food safety culture indicators during inspections\n" +
      "• Apply a maturity perspective to risk signals\n" +
      "• Recognise capabilities needed for modern regulation",
    speakers: [
      { name: "Andrew Wilson", role: "Cultivate SA" },
      { name: "Lone Jesperson", role: "Cultivate SA" },
    ],
  },
  {
    id: "enfit-qualified-inspector",
    title: "Become an ENFIT Qualified Inspector (EQI)",
    dateLabel: "18 November 2026",
    timeLabel: "2:00 PM – 5:00 PM",
    venue: "Marriott Al Jadaf Hotel",
    about:
      "An ENFIT Qualified Inspector (EQI) is a certified professional trained to evaluate, assess, and minimize risks associated with logistics, bulk transport, and cleaning infrastructure within the food supply chain. Developed by ENFIT, the International Association for Supply Chain Safety, this specialized credential ensures that logistics and cleaning operations comply with strict hygiene, food safety, and food defense protocols.\n\n" +
      "What you'll master:\n\n" +
      "• Audit cleaning procedures and verify transport cleanliness\n" +
      "• Identify intentional contamination risks and manage nonconformities on the spot\n" +
      "• Personal ENFIT certification to validate your expertise\n" +
      "• From foundational principles to advanced inspection techniques—no prior experience required\n\n" +
      "Who it's for:\n\n" +
      "Frontline inspectors involved in verification of transportation vehicles and containers, and looking to certify their competence.",
    speakers: [{ name: "Vladimir Surcinski", role: "ENFIT" }],
  },
  {
    id: "food-defense-strategies",
    title: "Food Defense Strategies for Regulators",
    dateLabel: "19 November 2026",
    timeLabel: "8:30 AM – 4:30 PM",
    venue: "Marriott Al Jadaf Hotel",
    about:
      "Protecting public health and maintaining supply-chain continuity requires moving beyond conventional safety measures. This 8-hour masterclass bridges the gap between regulatory theory and frontline decision-making, equipping you with a defensible, risk-based methodology to anticipate threats, eliminate vulnerabilities, and protect consumer trust.",
    speakers: [
      {
        name: "Dr. Abdel-Razak Kadry",
        role: "Adjunct Professor, University of Maryland School of Public Health & Georgetown University; Retired Director, US EPA IRIS Program",
      },
      {
        name: "Dr. Nicolle Tulve",
        role: "Senior Research Fellow, International Risk & Toxicology Institute, LLC; Retired Senior Scientist, US EPA",
      },
      {
        name: "Dr. Mohamed Saad",
        role: "Toxicologist and Research Scientist, Michigan State University",
      },
      {
        name: "Dr. Ahmed Abdelmoneim",
        role: "Clinical Veterinary Toxicologist & Assistant Professor, Louisiana State University",
      },
    ],
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
