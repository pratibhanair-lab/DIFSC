-- DIFSC 2026 — delegate registrations
-- Run this once in Supabase's dashboard: SQL Editor -> New query -> paste -> Run.
--
-- A separate track from session/speaker/poster submissions: a free
-- registration form for delegates who are already known to be eligible
-- (e.g. a link shared directly with them). Unlike every other submission
-- track, this one is NOT reviewed/approved — every registration is final
-- as soon as it's submitted (eligibility is enforced by policy/wording on
-- the form, not by an admin decision), so there's no status/review columns
-- here at all, just the collected details.

create table delegate_registrations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  full_name text not null,
  official_email text not null,
  preferred_email text not null,
  organization text not null,
  section_department text,
  designation text not null,
  mobile_number text not null,
  nationality text not null,
  created_at timestamptz not null default now()
);

-- Reference numbers (DFSC-D-2026-001, DFSC-D-2026-002, ...), separate
-- counter from the session/speaker and poster reference sequences.
create sequence delegate_reference_seq start 1;

create function next_delegate_reference() returns text
language sql
as $$
  select 'DFSC-D-2026-' || lpad(nextval('delegate_reference_seq')::text, 3, '0');
$$;

-- Same defense-in-depth stance as the other submission tables: the app
-- always talks to Supabase with the secret key and checks roles in code, so
-- RLS here just makes sure the anon key (if it were ever used directly)
-- couldn't read or write anything.
alter table delegate_registrations enable row level security;
