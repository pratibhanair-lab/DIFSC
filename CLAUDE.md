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
  tooling is wired up).
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
- `lib/submissions-view.ts` / `lib/schedule-view.ts` — read-model helpers
  that join raw tables into the shapes the UI needs, including the derived
  `overallStatus`. Reuse these instead of re-querying tables directly.
- `proxy.ts` — route protection for `/admin`, `/review`, `/schedule`
  (optimistic redirect only). The real role check is `requireRole()`, called
  on every protected page and Server Action.
- Routes: `/` (public form), `/login`, `/admin` (+ `/admin/submissions`,
  `/admin/setup` = categories/session types/org sections/halls,
  `/admin/referees`), `/review` (admin + referee shared queue), `/schedule`
  (admin only, own header, not under `/admin`'s layout).

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
- The Supabase secret key and Resend API key were shown in plain text during
  this project's build conversation; the user declined to rotate them (see
  Claude memory `project_key_exposure` for details) — don't re-raise unless
  it becomes newly relevant.

## Env vars

Names only — see `.env.example`. Real values live in `.env.local`
(gitignored) and in Vercel's project settings. Never put real values in a
file that gets committed.
