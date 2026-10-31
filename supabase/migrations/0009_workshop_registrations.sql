-- DIFSC 2026 — workshop registrations
-- Run this once in Supabase's dashboard: SQL Editor -> New query -> paste -> Run.
--
-- People who show interest in a workshop through the public /workshops page.
-- One row per person per workshop (someone who picks both workshops gets two
-- rows), so each seat can be confirmed, waitlisted or declined on its own —
-- workshops have limited seats and an admin reviews every request.
--
-- workshop_id matches the "id" of a workshop in lib/workshops-config.ts.
-- Email is stored in lowercase, and (workshop_id, email) is unique so the same
-- person can't register for the same workshop twice.

create table workshop_registrations (
  id uuid primary key default gen_random_uuid(),
  workshop_id text not null,
  full_name text not null,
  email text not null,
  mobile_number text not null,
  organization text not null,
  designation text,
  status text not null default 'interested'
    check (status in ('interested', 'confirmed', 'waitlisted', 'declined')),
  created_at timestamptz not null default now(),
  unique (workshop_id, email)
);

-- Same defense-in-depth stance as the other tables: the app always uses the
-- secret key and checks roles in code, so RLS just blocks the anon key.
alter table workshop_registrations enable row level security;
