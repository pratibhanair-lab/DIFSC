@AGENTS.md

# DIFSC 2026 Conference App

Public session/speaker submission + admin review + scheduling tool for the
20th Dubai International Food Safety Conference (Nov 16-18, 2026). The owner
(Pratibha) is a complete beginner to coding — explain changes in plain
language, avoid jargon, and confirm before anything destructive or
public-facing (pushing, deploying, deleting data).

There are two submission entry points feeding the same review pipeline: `/`
for external/public submitters and `/proposals` for internal Dubai
Municipality staff. Every submission is tagged `source: "external" |
"internal"` automatically (based on which page it came from, never
submitter-chosen) so admins can tell the two tracks apart — see Routes and
Conventions below.

There's also a separate, simpler **poster submission** track at `/posters`
(one presenter, one poster, no session/speaker nesting) that feeds into its
own `poster_submissions` table but is reviewed through the same `/review`
queue — see the poster-specific entries under Where things live.

**Speaker/session submissions are CLOSED** (both `/` and `/proposals`) and
enforced in code, controlled by one switch in `lib/submission-config.ts`
(`SESSION_SUBMISSIONS_OPEN`, currently `false`; set it to `true` to reopen —
the original `SuggestionForm` is untouched). **Poster submissions stay open
until 10 October 2026** (end of day, Dubai time, UTC+4), also defined in
`lib/submission-config.ts` (`postersOpen()`, `POSTER_DEADLINE_LABEL`); after
that date `/posters` shows the closed page and `submitPoster` rejects.

There's also a **delegate registration** track at `/register` — a free
registration form for delegates who are already known to be eligible (the
link is shared directly with them). Unlike every other track, this one is
**not reviewed/approved** — every registration is final the moment it's
submitted; eligibility ("government employees only") is enforced by wording
on the form, not an admin decision. It collects contact/affiliation details
into its own `delegate_registrations` table with no status column at all —
see the delegate-specific entries under Where things live.

## Stack

- Next.js 16 (App Router, Turbopack). **Note:** `middleware.ts` is now
  `proxy.ts` in v16 — see `node_modules/next/dist/docs` for other breaking
  changes vs. training data before assuming v15 conventions apply.
- Supabase: Postgres DB + Auth (admin/referee login only; the public
  suggestion form needs no auth).
- Resend: transactional email.
- Deployed on Vercel, auto-deploys on push to GitHub `main`
  (repo: https://github.com/pratibhanair-lab/DIFSC).

## Where things live

- `supabase/migrations/0001_init.sql` — full schema (11 tables), RLS, seed
  data. Source of truth for the data model; read this before touching DB
  logic. New schema changes should be added as a new `NNNN_*.sql` file here
  (the user runs these manually in Supabase's SQL Editor — no migration
  tooling is wired up). `0002_tweaks.sql` (applied) added `speakers.location`
  / `speakers.affiliation`, dropped the `sessions.submission_id` unique
  constraint (a submission can now hold multiple sessions), and dropped
  `submissions.link_speakers_to_session` (obsolete now that speakers nest
  under a specific session block in the form instead of a yes/no flag).
  `0003_prior_presentation_and_commercial.sql` and
  `0004_submission_source.sql` add `sessions.previously_presented` (+
  `_where` / `_when` text fields), `commercial_involvement` on both
  `sessions` and `speakers`, and `submissions.source`
  (`'external' | 'internal'`, not null, default `'external'`) — see the
  intro section above. `0005_poster_submissions.sql` (applied) adds the
  standalone `poster_submissions` table (its own `reference` sequence,
  `DFSC-P-2026-XXX`) — see the poster-specific entries below.
  `0006_delegate_registrations.sql` adds the standalone
  `delegate_registrations` table (its own `reference` sequence,
  `DFSC-D-2026-XXX`) — no status/review columns, since this track isn't
  reviewed (see the intro section above) — see the delegate-specific
  entries below.
- `lib/submission-config.ts` — the one place that says which tracks are
  open: `SESSION_SUBMISSIONS_OPEN`, `postersOpen()`, `POSTER_DEADLINE_LABEL`,
  and the "closed" messages. Not a `"use server"` file, so constants can be
  exported from it. `submitSuggestion` and `submitPoster` check it
  server-side, so old links/open tabs can't sneak a submission through.
- `components/SubmissionsClosed.tsx` — the "speaker & session submissions
  are closed" page shown by `/` and `/proposals` (and by `/posters` after
  its deadline). While posters are open it shows a "Submit a poster" button
  and the poster deadline; afterwards it says posters are closed too.
  `/proposals` passes `showNavTabs` to keep its public-page buttons.
- `lib/types.ts` — shared TS types mirroring the schema, including
  `PosterStatus` / `PosterSubmission` and `DelegateRegistration` (no status
  type — delegates have no review state).
- `lib/supabase/server.ts` — auth-only client (cookie-bound, anon key). Only
  used for login/logout/`getUser()`.
- `lib/supabase/admin.ts` — secret-key client. **All** table reads/writes go
  through this; authorization is enforced in code (`lib/auth.ts:
  requireRole()`), not via RLS, since the app never uses the anon key for
  data access. RLS is enabled as a defense-in-depth safety net only.
- `lib/actions/*.ts` — all Server Actions (`"use server"`), one file per
  feature area: `submissions`, `auth`, `referees`, `lookups`, `review`,
  `schedule`, `posters` (`submitPoster`, `decidePoster` — the poster
  equivalent of `submissions.ts` + `review.ts`, but simpler since a poster is
  one row with no session/speaker nesting), `delegates`
  (`submitDelegateRegistration`, `exportDelegatesCsv` — no `decideDelegate`,
  since this track has no review step; `exportDelegatesCsv` builds the CSV
  used only by `/admin/delegates`; no confirmation email is sent either —
  deliberate, see Known limitations).
- `lib/submissions-view.ts` / `lib/schedule-view.ts` / `lib/approved-view.ts`
  / `lib/posters-view.ts` — read-model helpers that join raw tables into the
  shapes the UI needs. Reuse these instead of re-querying tables directly. A
  `SubmissionView` now holds `sessions: SessionView[]` (a submission can have
  several session topics, each with its own nested `speakers`) plus a
  top-level `speakers` array for speaker-only submissions not tied to any
  session. `overallStatus` is still the one derived status driving the
  review queue and counts. `posters-view.ts` exports
  `fetchPosterSubmissions()` (all posters, admin-only, includes
  email/phone/review fields — used by `/review` and `/admin`) and
  `fetchApprovedPosters()` (approved-only, no contact info — used by the
  public `/posters/approved`). `fetchPosterSubmissions()` is also used by
  `/admin/posters` (see `PostersBrowser.tsx` below). `lib/delegates-view.ts`
  exports
  `fetchDelegateRegistrations()` (all delegates, admin-only, includes every
  field including email/mobile — used only by `/admin/delegates`, since
  there's no review queue entry or public listing for this track).
- `components/SessionReviewCard.tsx` — self-contained per-session
  approve/revise/reject card (mirrors `SpeakerCard.tsx`'s pattern), reused by
  both `ReviewQueue.tsx` and `SubmissionDetailModal.tsx` since a submission
  can now contain multiple sessions. Also displays the previously-presented
  (where/when) and commercial-involvement fields when set;
  `SpeakerCard.tsx` displays commercial-involvement for individual speakers.
- `components/PosterReviewCard.tsx` — the poster equivalent of
  `SessionReviewCard.tsx` (approve/reject + optional comment, no
  revise step since there's nothing to revise into categories/session
  types). Used only in `ReviewQueue.tsx`.
- `components/ReviewQueue.tsx` — merges pending `SubmissionView[]` and
  pending `PosterView[]` into one discriminated-union list (`QueueItem =
  { type: "submission" | "poster" }`) so admins/referees review both
  sessions/speakers and posters from a single queue. `TypeBadge` gets a
  `"poster"` kind for this; `SourceBadge` is skipped for poster items since
  posters have no `source`/org-section concept. Delegates are **not** in
  this queue at all — see the intro section above.
- `components/SourceBadge.tsx` — small chip showing "External" or "Internal
  (DM staff)" based on `SubmissionView.source` / `Submission.source`.
  Admin-only: used in `ReviewQueue.tsx`, `SubmissionsBrowser.tsx`,
  `SubmissionDetailModal.tsx`, and `app/admin/page.tsx`, but deliberately
  **not** in any of the `Public*` components — see the source-tracking note
  in Conventions below.
- `proxy.ts` — route protection for `/admin`, `/review`, `/schedule`
  (optimistic redirect only). The real role check is `requireRole()`, called
  on every protected page and Server Action. `/programme` and `/approved`
  are deliberately **not** in this list — see Routes below.
- `components/PublicScheduleGrid.tsx` — read-only version of
  `components/ScheduleGrid.tsx` for `/programme`: same visual layout, no
  drag/drop, no edit buttons, and it only renders `cardsByDay` (never the
  `unscheduled` or `speakerPool` parts of `ScheduleBoard`, which are
  internal working data and must stay off any public page).
- `components/PublicApprovedListing.tsx` — same public/admin split, for
  `/approved`: read-only cards, no Server Action calls, no decision buttons.
  Any new public-facing view should follow this pattern rather than reusing
  an admin component that has action buttons wired in.
- `components/PublicPosterListing.tsx` — same pattern, for
  `/posters/approved`: approved posters only, title/presenter/affiliation/
  abstract, no email/phone, no action buttons.
- `components/PublicSubmissionsBrowser.tsx` /
  `components/PublicSubmissionDetailModal.tsx` — read-only counterparts of
  `SubmissionsBrowser.tsx` / `SubmissionDetailModal.tsx` for `/submissions`.
  Show every submission across all statuses (pending/approved/rejected) and
  the submitter's **name**, but never their email/phone, and no
  approve/reject/revise/delete controls.
- `components/ShareScheduleButton.tsx` — client component on the admin
  `/schedule` page that copies the `/programme` URL to the clipboard.
- `components/SuggestionForm.tsx` — the one submission form, mounted by both
  `/` and `/proposals` with different props: `source` (required —
  `"external"` on `/`, `"internal"` on `/proposals`, stamped onto every
  submission it creates), `showNavTabs` (nav buttons to the five public
  pages — off on `/`, on on `/proposals`), `showDeadlineNotice` (the
  submission-deadline/theme callout — on on `/`, off on `/proposals`), and
  `showOrgSection` (the "Organization section" field under Your details —
  off on `/`, on by default on `/proposals`, since only DM staff belong to a
  section), and `showPosterLink` (a small callout linking to `/posters` for
  people who meant to submit a poster instead — on on both `/` and
  `/proposals`). When changing the form, check both pages' props before
  assuming a change should apply to both tracks.
- `components/PosterSubmissionForm.tsx` — the standalone poster form
  (`/posters`): presenter name/affiliation/email/phone, poster
  title/abstract (client-side word counter, 300-word cap enforced again
  server-side in `submitPoster`)/category. Not a `SuggestionForm` variant —
  kept separate on purpose since a poster has no session/speaker nesting and
  reusing the bigger form would have meant threading a lot of conditional
  logic through it for one field set.
- `components/DelegateRegistrationForm.tsx` — the standalone delegate
  registration form (`/register`): full name*, official email*, preferred
  email (defaults to official email, editable — the "same as official"
  behavior is a plain `preferredEmailTouched` flag, not a checkbox),
  organization* (a fixed `<select>` of government entities, alphabetical,
  "Other" last, hardcoded as `ORGANIZATION_OPTIONS` in the component — not
  an admin-editable lookup table like `categories`/`org_sections`; picking
  "Other" reveals a free-text field whose value becomes the submitted
  organization), section/department, designation*, mobile number*,
  nationality*. Shows a fixed "exclusively for government employees" notice
  near the top of the page, and on successful submit shows a fixed
  confirmation message (badge-by-email-and-mobile timeline + the same
  government-employees-only wording) instead of a generic "thanks" —
  don't reword either without being asked, they're policy text, not
  copywriting. Not a `SuggestionForm` or `PosterSubmissionForm` variant —
  kept separate for the same reason posters are: a completely different
  field set with no session/speaker/poster nesting, and no review step.
- `components/DelegatesBrowser.tsx` — admin-only table/list at
  `/admin/delegates` of every delegate registration, with a search box and
  a "Download CSV" button (`exportDelegatesCsv` in
  `lib/actions/delegates.ts`) that builds the CSV server-side and triggers
  a client-side blob download. Read-only — there's nothing to
  approve/reject since this track isn't reviewed.
- `components/PostersBrowser.tsx` — admin-only table/list at
  `/admin/posters` of every poster submission, any status (unlike
  `/review`, which only shows pending ones). Has a search box and a status
  filter; clicking a row expands it in place to show the same
  `PosterReviewCard` used in `/review` (approve/reject + optional comment)
  plus the presenter's contact info, so an admin can re-decide a poster
  after the fact (e.g. undo a rejection) — not just work the initial queue.
  No CSV export (unlike `DelegatesBrowser`) — add one following that
  pattern if it's wanted later.
- Routes: `/` (currently shows `SubmissionsClosed` — normally the public
  external-submitter form: no nav buttons, no organization-section field,
  deadline/theme notice + poster callout), `/proposals` (currently
  `SubmissionsClosed` with nav buttons — normally the internal Dubai
  Municipality staff form: same component, nav buttons to the five public
  pages below + poster callout, organization-section field, no deadline
  notice; **not** login-protected, see Known limitations), `/posters` (public poster
  submission form, no login), `/posters/approved` (public, no login —
  approved posters only, reuses `fetchApprovedPosters`), `/register`
  (public delegate registration form, no login, not reviewed — see
  `DelegateRegistrationForm.tsx` above; there is no public "approved
  delegates" listing), `/login`, `/admin` (+ `/admin/submissions`,
  `/admin/delegates` = the read-only delegate list + CSV export,
  `/admin/posters` = the browsable poster list with approve/reject (see
  `PostersBrowser.tsx` above), `/admin/setup` = categories/session
  types/org sections/halls,
  `/admin/referees`; the overview page's stat-card row also shows poster
  counts alongside submission counts, plus a single delegate-count card
  linking to `/admin/delegates`), `/review` (admin + referee shared queue —
  sessions/speakers and posters together, see `ReviewQueue.tsx` above;
  delegates are not in this queue), `/schedule` (admin only, own header, not under
  `/admin`'s layout), `/programme` (public, no login, read-only conference
  programme — shareable link, reuses `fetchScheduleBoard`), `/approved`
  (public, no login — every approved session + speaker regardless of
  whether it's been scheduled yet, reuses `fetchApprovedListing`),
  `/overview` (public, no login — read-only copy of the admin overview
  dashboard, reuses `fetchAllSubmissions`), `/submissions` (public, no
  login — read-only copy of `/admin/submissions`, reuses
  `fetchAllSubmissions`).

## Conventions

- Styling: no Tailwind — plain inline `style` objects plus a few shared
  classes in `app/globals.css` (`.card`, `.input`, `.btn*`, `.chip*`), and
  CSS variables for the two themes (`data-theme="verdant"|"clinical"` on
  `<html>`, toggled by `components/ThemeToggle.tsx`). Match this pattern
  rather than introducing a new styling approach.
- Mutations: Server Actions only, no separate API routes. Client components
  call them directly, then `router.refresh()`.
- A `"use server"` file can only export async functions — `export type` /
  `export type { X }` re-exports from such a file crashes the page at
  runtime (bit us once; see git history "SessionStatus is not defined").
- Every submission has a computed `overallStatus`
  (`lib/submissions-view.ts`) since `sessions.status` and per-speaker
  `speakers.status` are tracked independently — don't add a redundant status
  column to `submissions` itself.
- The scheduler's speaker pool (draggable onto the grid) only shows speakers
  with `status === "confirmed"` — being `"approved"` alone isn't enough. An
  admin/referee moves a speaker from approved to confirmed with the "Mark
  confirmed" button on `SpeakerCard` (`review.ts: decideSpeaker`).
- The public form remembers a returning submitter's name/email/phone/org
  section via a plain browser cookie (`difsc_submitter`, set client-side in
  `SuggestionForm.tsx`, read server-side in `app/page.tsx` /
  `app/proposals/page.tsx`) — not a login, just a convenience pre-fill.
- `submissions.source` (`"external" | "internal"`) is set once at insert
  time from the `source` prop the submitting page passed to
  `SuggestionForm` — it is never a form field the submitter fills in, so it
  can't be mistyped or gamed. Shown to admins via `SourceBadge`; kept off
  every public-facing page (submitter contact info follows the same
  admin-only pattern).

## Known limitations / deliberate scope decisions

- Session/speaker submissions closed after the 30 September 2026 deadline;
  posters extended to 10 October 2026. The deadline notice text inside
  `SuggestionForm.tsx` still says "30 September 2026" — it's hidden while
  the form is closed, so update it if the form is ever reopened.
- Resend is in **sandbox mode** — confirmation/decision emails only deliver
  to the Resend account owner's own address until a domain is verified
  (Resend dashboard → Domains) and `RESEND_FROM_EMAIL` is updated in
  `.env.local` + Vercel. Flag this before the real conference goes live.
- No in-app "change my password" flow (explicitly declined by the user) —
  admin/referee credential changes go through the Supabase Auth Admin API
  directly via a one-off temp script (pattern: small `.cjs` file in the
  project root using the same client as `lib/supabase/admin.ts`, run once
  with `node`, then deleted — see git history for examples).
- Referees do **not** get a welcome email when created (explicitly declined
  by the user) — the admin sees the temp password once in the Referees UI
  and shares it manually.
- `/proposals` (the "internal DM staff" submission form) is **not**
  login-protected — it's a plain public URL, same as `/`. The
  external/internal distinction is a labeling convenience for reviewers
  (who submitted through which page), not an access-control boundary;
  anyone with the link can use either form. Don't assume `source ===
  "internal"` implies the submitter's identity was verified.
- `/programme`, `/approved`, `/overview`, `/submissions`, `/posters`, and
  `/posters/approved` are all fully open public links (no login, no secret
  token) by the user's explicit choice. `/programme` shows every scheduled
  session regardless of speaker-confirmation status; `/approved` shows every
  approved session/speaker regardless of whether it's been scheduled.
  `/overview` and `/submissions` go further and expose **pending and
  rejected** submissions too (the user chose this over an approved-only
  view, so submitters can track their own submission's status) — submitter
  **name** is shown but email/phone never are. `/posters/approved` is
  approved-only (unlike `/overview`/`/submissions`, it doesn't show
  pending/rejected posters). If this needs tightening later (secret token in
  the URL, hiding unconfirmed/pending/rejected items), that's a deliberate
  reversal, not a bug fix.
- Poster submissions have their own browsable admin list at
  `/admin/posters` (`PostersBrowser.tsx`, added after the feature's initial
  build) plus `/review` (pending-only queue) and `/admin` (dashboard
  counts). They are still **not** surfaced on `/admin/submissions` (the
  session/speaker browsable/deletable list — posters have no delete
  action anywhere) or on `/overview`/`/submissions` (the public read-only
  copies of that list). Deliberate scope decision; extend those views too
  if posters need the same public-status or delete treatment as sessions
  and speakers.
- Delegate registrations (`/register`) are **not reviewed at all** —
  no pending/approved/rejected status, no entry in `/review`, no
  `decideDelegate` action. Every registration is accepted as submitted; the
  "government employees only" eligibility rule is enforced by wording on
  the form and the confirmation message, not by an admin gate. This also
  means **no email is sent** — no submit confirmation and no decision
  email — unlike sessions/speakers/posters, which do send decision emails
  via Resend. Both were deliberate choices when the feature was built. If
  a review step or confirmation email is wanted later, that's a real
  schema change (adding status/review columns back to
  `delegate_registrations`), not just a UI tweak — see
  `0006_delegate_registrations.sql`.
- Deleting a submission (admin-only, `/admin/submissions` → open an entry →
  "Delete this submission") requires typing the shared `DELETE_PASSCODE`
  env secret. There's no per-admin passcode — everyone with the passcode can
  delete anything. Deletion cascades to that submission's sessions,
  speakers, and any schedule placement (DB `on delete cascade`).
- The Supabase secret key and Resend API key were shown in plain text during
  this project's build conversation; the user declined to rotate them (see
  Claude memory `project_key_exposure` for details) — don't re-raise unless
  it becomes newly relevant.

## Env vars

Names only — see `.env.example`. Real values live in `.env.local`
(gitignored) and in Vercel's project settings. Never put real values in a
file that gets committed.
