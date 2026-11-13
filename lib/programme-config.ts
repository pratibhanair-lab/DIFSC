// Shared bits for the conference programme (English + Arabic). Deliberately NOT
// a "use server" file so both the server pages and the client components can
// import it.

export type Lang = "en" | "ar";

export type ProgrammeRoom = {
  id: string;
  nameEn: string;
  nameAr: string | null;
  sortOrder: number;
};

export type ProgrammeItem = {
  id: string;
  parentId: string | null;
  day: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string | null; // HH:MM
  titleEn: string;
  titleAr: string | null;
  roomId: string | null;
  speakers: string | null;
  speakersAr: string | null;
  moderator: string | null;
  moderatorAr: string | null;
  liveUrl: string | null;
  sortOrder: number;
};

/** A top-level session with its sub-sessions nested underneath. */
export type ProgrammeSession = ProgrammeItem & { children: ProgrammeItem[] };

/** All the words on the public programme pages, in both languages. */
export const PROGRAMME_TEXT = {
  en: {
    pageTitle: "Conference Programme",
    conference: "20th Dubai International Food Safety Conference · 16–18 November 2026",
    allRooms: "All rooms",
    room: "Room",
    speakers: "Speakers",
    moderator: "Moderator",
    session: "Session",
    subSession: "Sub-session",
    liveStream: "Watch live",
    noItems: "No sessions to show for this selection.",
    otherLanguage: "العربية",
    otherLanguageHref: "/programme-ar",
    day: "Day",
  },
  ar: {
    pageTitle: "برنامج المؤتمر",
    conference: "المؤتمر الدولي العشرون لسلامة الغذاء في دبي · ١٦–١٨ نوفمبر ٢٠٢٦",
    allRooms: "جميع القاعات",
    room: "القاعة",
    speakers: "المتحدثون",
    moderator: "مدير الجلسة",
    session: "جلسة",
    subSession: "جلسة فرعية",
    liveStream: "البث المباشر",
    noItems: "لا توجد جلسات لعرضها ضمن هذا الاختيار.",
    otherLanguage: "English",
    otherLanguageHref: "/programme-en",
    day: "اليوم",
  },
} as const;

/** "2026-11-16" -> "Monday, 16 November 2026" / Arabic equivalent. */
export function formatDay(day: string, lang: Lang): string {
  const date = new Date(`${day}T00:00:00Z`);
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Short form for tabs: "Mon 16 Nov". */
export function formatDayShort(day: string, lang: Lang): string {
  const date = new Date(`${day}T00:00:00Z`);
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

/** Times are kept as 24-hour "HH:MM" text everywhere. */
export function formatTimeRange(start: string, end: string | null): string {
  return end ? `${start} – ${end}` : start;
}

/** The title in the chosen language, falling back to English when blank. */
export function pick(lang: Lang, en: string, ar: string | null): string {
  return lang === "ar" && ar && ar.trim() ? ar : en;
}
