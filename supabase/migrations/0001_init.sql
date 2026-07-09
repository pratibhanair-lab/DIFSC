-- DIFSC 2026 — initial schema
-- Run this once in Supabase's dashboard: SQL Editor -> New query -> paste -> Run.

create extension if not exists pgcrypto;   -- gives us gen_random_uuid()
create extension if not exists btree_gist; -- lets us build the "no double-booking" rule below

-- ---------------------------------------------------------------------------
-- Lookup tables (admin-managed dropdown options)
-- ---------------------------------------------------------------------------

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table session_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table org_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table halls (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Staff accounts (profile row mirroring a Supabase Auth user)
-- ---------------------------------------------------------------------------

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('admin', 'referee')),
  focus_area text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Raw public form submissions
-- ---------------------------------------------------------------------------

create table submissions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  kind text not null check (kind in ('session', 'speaker', 'both')),
  submitter_name text not null,
  submitter_email text not null,
  submitter_phone text,
  org_section_id uuid references org_sections(id) on delete set null,
  link_speakers_to_session boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sessions (one per submitted session topic)
-- ---------------------------------------------------------------------------

create table sessions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references submissions(id) on delete cascade,
  title text not null,
  description text,
  category_id uuid not null references categories(id) on delete restrict,
  session_type_id uuid not null references session_types(id) on delete restrict,
  recommended_duration_hours int not null check (recommended_duration_hours between 1 and 3),
  partner_org text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_comment text,
  decided_by uuid references users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sessions_status_idx on sessions(status);

-- ---------------------------------------------------------------------------
-- Speakers (one per suggested speaker; may or may not belong to a session)
-- ---------------------------------------------------------------------------

create table speakers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  name text not null,
  contact text,
  bio text,
  topic text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'confirmed', 'rejected')),
  review_comment text,
  decided_by uuid references users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index speakers_submission_idx on speakers(submission_id);
create index speakers_session_idx on speakers(session_id);
create index speakers_status_idx on speakers(status);

-- ---------------------------------------------------------------------------
-- Schedule (the final programme grid — one row per scheduled session)
-- ---------------------------------------------------------------------------

create table schedule (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions(id) on delete cascade,
  hall_id uuid not null references halls(id) on delete restrict,
  day date not null,
  start_slot int not null check (start_slot between 0 and 7),   -- 0 = 9AM ... 7 = 4PM
  duration_hours int not null check (duration_hours between 1 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_fits_in_day check (start_slot + duration_hours <= 8),
  -- The exclusion constraint below is what actually prevents double-booking:
  -- no two rows for the same hall + day may have overlapping time ranges.
  exclude using gist (
    hall_id with =,
    day with =,
    int4range(start_slot, start_slot + duration_hours) with &&
  )
);

-- ---------------------------------------------------------------------------
-- Which speakers are assigned to a scheduled session, and in what order
-- ---------------------------------------------------------------------------

create table session_speakers (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedule(id) on delete cascade,
  speaker_id uuid not null references speakers(id) on delete cascade,
  position int not null default 0,
  unique (schedule_id, speaker_id)
);

-- ---------------------------------------------------------------------------
-- Reference numbers (DFSC-2026-001, DFSC-2026-002, ...) generated atomically
-- so two people submitting at the same instant never get the same number.
-- ---------------------------------------------------------------------------

create sequence submission_reference_seq start 1;

create function next_submission_reference() returns text
language sql
as $$
  select 'DFSC-2026-' || lpad(nextval('submission_reference_seq')::text, 3, '0');
$$;

-- ---------------------------------------------------------------------------
-- Keep updated_at current
-- ---------------------------------------------------------------------------

create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sessions_set_updated_at before update on sessions
  for each row execute function set_updated_at();
create trigger speakers_set_updated_at before update on speakers
  for each row execute function set_updated_at();
create trigger schedule_set_updated_at before update on schedule
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- The app's server code always talks to Supabase with the secret key (which
-- bypasses RLS) and checks the logged-in user's role itself before doing
-- anything sensitive. RLS here is a safety net: if the publishable ("anon")
-- key were ever used directly, it could only read the public dropdown
-- options below — nothing else, and it could write nothing.
-- ---------------------------------------------------------------------------

alter table categories enable row level security;
alter table session_types enable row level security;
alter table org_sections enable row level security;
alter table halls enable row level security;
alter table users enable row level security;
alter table submissions enable row level security;
alter table sessions enable row level security;
alter table speakers enable row level security;
alter table schedule enable row level security;
alter table session_speakers enable row level security;

create policy "categories are publicly readable" on categories for select using (true);
create policy "session_types are publicly readable" on session_types for select using (true);
create policy "org_sections are publicly readable" on org_sections for select using (true);
create policy "halls are publicly readable" on halls for select using (true);

-- ---------------------------------------------------------------------------
-- Seed data (matches the mockup's defaults; edit/add more later from the
-- admin Categories page — this is just a starting point)
-- ---------------------------------------------------------------------------

insert into categories (name) values
  ('Foodborne Pathogens & Microbiology'),
  ('Regulatory Compliance & Standards'),
  ('Food Fraud & Authenticity'),
  ('Cold Chain & Logistics'),
  ('Emerging Technologies & AI'),
  ('Risk Assessment & HACCP'),
  ('Consumer Awareness & Education')
on conflict (name) do nothing;

insert into session_types (name) values
  ('Short Symposium'),
  ('Long Symposium'),
  ('Round Table'),
  ('Panel Discussion'),
  ('Workshop'),
  ('Masterclass')
on conflict (name) do nothing;

insert into org_sections (name) values
  ('Food inspection section'),
  ('Food trade section'),
  ('Food studies section'),
  ('Food safety awareness section'),
  ('Food permits section')
on conflict (name) do nothing;

insert into halls (name) values
  ('Al Ghubaiba Hall'),
  ('Deira Hall'),
  ('Jumeirah Hall')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- One-time manual step: create your first admin account
--
-- 1. In the Supabase dashboard: Authentication -> Users -> Add user.
--    Enter your email + a password, and check "Auto Confirm User".
-- 2. Copy the new user's "User UID" from that screen.
-- 3. Run this (with your own values) in the SQL Editor:
--
--    insert into public.users (id, name, email, role)
--    values ('paste-the-user-uid-here', 'Your Name', 'your@email.com', 'admin');
-- ---------------------------------------------------------------------------
