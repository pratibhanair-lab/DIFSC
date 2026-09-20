# DIFSC 2026 Conference App

Submission, review, and scheduling tool for the 20th Dubai International
Food Safety Conference (Nov 16–18, 2026).

This app collects session/speaker/poster suggestions from the public,
lets an admin and referees review and approve them, and helps build the
final conference programme. Submissions are open until **30 September
2026**.

## What's in this app

- **`/`** — public form to suggest a session topic or speaker.
- **`/proposals`** — the same form for internal Dubai Municipality staff.
- **`/posters`** — public form to submit a poster (presenter details +
  poster title/abstract/category).
- **`/register`** — public free-registration form for delegates, strictly
  for government employees (name, email, organization, designation, etc).
  Not reviewed — every registration is accepted immediately.
- **`/programme`**, **`/approved`**, **`/overview`**, **`/submissions`**,
  **`/posters/approved`** — public, read-only pages anyone with the link
  can view (no login needed) — the conference programme, approved
  items, and submission status.
- **`/login`** then **`/admin`** — staff area (admin/referee login
  required): review queue, scheduling grid, category/hall setup,
  submissions browser, and a delegate list with CSV export.

## Running it locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

You'll need a `.env.local` file with the Supabase and Resend keys — see
`.env.example` for the list of names. Ask whoever set up the project for
the actual values (they're not stored in this repo).

## Database changes

The database (Supabase Postgres) is set up by running SQL files by hand —
there's no automatic migration tool. All the SQL files live in
`supabase/migrations/`, numbered in order (`0001_...`, `0002_...`, etc.).
If you're told a new one has been added, run it once in Supabase's
dashboard: **SQL Editor → New query → paste the file's contents → Run.**

## Deploying

This app is deployed on [Vercel](https://vercel.com) and **automatically
redeploys every time changes are pushed to the `main` branch** on GitHub
(repo: https://github.com/pratibhanair-lab/DIFSC). There's no separate
manual deploy step — pushing to `main` *is* the deploy.

## More detail

`CLAUDE.md` and `AGENTS.md` in this folder have a much more detailed,
technical map of the codebase (routes, database schema, conventions) —
useful if you're working with Claude Code on this project, or want the
fuller picture of how things fit together.
