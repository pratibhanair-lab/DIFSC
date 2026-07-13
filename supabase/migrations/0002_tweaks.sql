-- DIFSC 2026 — schema tweaks (7 requested changes)
-- Run this once in Supabase's dashboard: SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------------------
-- 1. Allow multiple sessions per submission (submitters can now add several
--    session topics in one visit, each with its own speakers).
-- ---------------------------------------------------------------------------

alter table sessions drop constraint if exists sessions_submission_id_key;
create index if not exists sessions_submission_idx on sessions(submission_id);

-- ---------------------------------------------------------------------------
-- 2. Drop the old "link speakers to session" flag — now that speakers nest
--    under a specific session block in the form, a single yes/no flag on
--    the submission no longer means anything.
-- ---------------------------------------------------------------------------

alter table submissions drop column if exists link_speakers_to_session;

-- ---------------------------------------------------------------------------
-- 3. New speaker fields: location + affiliation.
-- ---------------------------------------------------------------------------

alter table speakers add column if not exists location text
  check (location is null or location in ('International', 'GCC', 'UAE', 'DM'));
alter table speakers add column if not exists affiliation text;
