-- DIFSC 2026 — poster submissions
-- Run this once in Supabase's dashboard: SQL Editor -> New query -> paste -> Run.
--
-- A separate, simpler submission track: one presenter, one poster, no
-- session/speaker nesting. Reviewed through the same /review queue as
-- sessions and speakers, but kept in its own table since the shape is
-- different (single row per poster, no "kind"/"both" concept).

create table poster_submissions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  presenter_name text not null,
  affiliation text,
  email text not null,
  phone text,
  title text not null,
  abstract text not null,
  category_id uuid not null references categories(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_comment text,
  decided_by uuid references users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index poster_submissions_status_idx on poster_submissions(status);

create trigger poster_submissions_set_updated_at before update on poster_submissions
  for each row execute function set_updated_at();

-- Reference numbers (DFSC-P-2026-001, DFSC-P-2026-002, ...), separate
-- counter from the session/speaker submission references.
create sequence poster_reference_seq start 1;

create function next_poster_reference() returns text
language sql
as $$
  select 'DFSC-P-2026-' || lpad(nextval('poster_reference_seq')::text, 3, '0');
$$;

-- Same defense-in-depth stance as the other submission tables: the app
-- always talks to Supabase with the secret key and checks roles in code, so
-- RLS here just makes sure the anon key (if it were ever used directly)
-- couldn't read or write anything.
alter table poster_submissions enable row level security;
