@AGENTS.md

# DIFSC 2026 Conference App

Public session/speaker submission + admin review + scheduling tool for the
20th Dubai International Food Safety Conference (Nov 16-18, 2026). The owner
(Pratibha) is a complete beginner to coding — explain changes in plain
language, avoid jargon, and confirm before anything destructive or
public-facing (pushing, deploying, deleting data).

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
- `lib/types.ts` — shared TS types mirroring the schema.
- `lib/supabase/server.ts` — auth-only client (cookie-bound, anon key). Only
  used for login/logout/`getUser()`.
- `lib/supabase/admin.ts` — secret-key client. **All** table reads/writes go
  through this; authorization is enforced in code (`lib/auth.ts:
  requireRole()`), not via RLS, since the app never uses the anon key for
  data access. RLS is enabled as a defense-in-depth safety net only.
- `lib/actions/*.ts` — all Server Actions (`"use server"`), one file per
  feature area: `submissions`, `auth`, `referees`, `lookups`, `review`,
  `schedule`.
- `lib/submissions-view.ts` / `lib/schedule-view.ts` / `lib/approved-view.ts`
  — read-model helpers that join raw tables into the shapes the UI needs.
  Reuse these instead of re-querying tables directly. A `SubmissionView` now
  holds `sessions: SessionView[]` (a submission can have several session
  topics, each with its own nested `speakers`) plus a top-level `speakers`
  array for speaker-only submissions not tied to any session. `overallStatus`
  is still the one derived status driving the review queue and counts.
- `components/SessionReviewCard.tsx` — self-contained per-session
  approve/revise/reject card (mirrors `SpeakerCard.tsx`'s pattern), reused by
  both `ReviewQueue.tsx` and `SubmissionDetailModal.tsx` since a submission
  can now contain multiple sessions.
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
- `components/PublicSubmissionsBrowser.tsx` /
  `components/PublicSubmissionDetailModal.tsx` — read-only counterparts of
  `SubmissionsBrowser.tsx` / `SubmissionDetailModal.tsx` for `/submissions`.
  Show every submission across all statuses (pending/approved/rejected) and
  the submitter's **name**, but never their email/phone, and no
  approve/reject/revise/delete controls.
- `components/ShareScheduleButton.tsx` — client component on the admin
  `/schedule` page that copies the `/programme` URL to the clipboard.
- Routes: `/` (public form — also has nav buttons to the four public pages
  below), `/login`, `/admin` (+ `/admin/submissions`, `/admin/setup` =
  categories/session types/org sections/halls, `/admin/referees`),
  `/review` (admin + referee shared queue), `/schedule` (admin only, own
  header, not under `/admin`'s layout), `/programme` (public, no login,
  read-only conference programme — shareable link, reuses
  `fetchScheduleBoard`), `/approved` (public, no login — every approved
  session + speaker regardless of whether it's been scheduled yet, reuses
  `fetchApprovedListing`), `/overview` (public, no login — read-only copy of
  the admin overview dashboard, reuses `fetchAllSubmissions`), `/submissions`
  (public, no login — read-only copy of `/admin/submissions`, reuses
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
  `SuggestionForm.tsx`, read server-side in `app/page.tsx`) — not a login,
  just a convenience pre-fill.

## Known limitations / deliberate scope decisions

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
- `/programme`, `/approved`, `/overview`, and `/submissions` are all fully
  open public links (no login, no secret token) by the user's explicit
  choice. `/programme` shows every scheduled session regardless of
  speaker-confirmation status; `/approved` shows every approved
  session/speaker regardless of whether it's been scheduled. `/overview` and
  `/submissions` go further and expose **pending and rejected** submissions
  too (the user chose this over an approved-only view, so submitters can
  track their own submission's status) — submitter **name** is shown but
  email/phone never are. If this needs tightening later (secret token in the
  URL, hiding unconfirmed/pending/rejected items), that's a deliberate
  reversal, not a bug fix.
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
