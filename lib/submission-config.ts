// Single place that controls which submission tracks are open.
// (Not a "use server" file, so plain constants can be exported from here.)

// Speaker / session suggestions (/ and /proposals). Set to true to reopen both forms.
export const SESSION_SUBMISSIONS_OPEN = false;

// Poster submissions close at the end of this day, Dubai time (UTC+4).
export const POSTER_DEADLINE_LABEL = "10 October 2026";
const POSTER_DEADLINE = new Date("2026-10-10T23:59:59+04:00");

export function postersOpen(now: Date = new Date()): boolean {
  return now.getTime() <= POSTER_DEADLINE.getTime();
}

// Delegate registration (/register: government employees, guests and online).
// Set to true to reopen the form and accept registrations again.
export const DELEGATE_REGISTRATION_OPEN = false;
export const DELEGATE_CLOSED_MESSAGE =
  "Registration for the 20th Dubai International Food Safety Conference is now closed. Thank you for your interest.";

export const SESSIONS_CLOSED_MESSAGE =
  "Speaker and session submissions are now closed. Thank you for your interest.";
export const POSTERS_CLOSED_MESSAGE =
  "Poster submissions are now closed. Thank you for your interest.";
