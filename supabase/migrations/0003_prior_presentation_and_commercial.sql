-- DIFSC 2026 — prior-presentation and commercial-involvement fields
-- Run this once in Supabase's dashboard: SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------------------
-- 1. Sessions: "has this been presented anywhere before?" + where/when.
-- ---------------------------------------------------------------------------

alter table sessions add column if not exists previously_presented boolean not null default false;
alter table sessions add column if not exists previously_presented_where text;
alter table sessions add column if not exists previously_presented_when text;

-- ---------------------------------------------------------------------------
-- 2. Sessions + speakers: "does this involve commercial products or services?"
-- ---------------------------------------------------------------------------

alter table sessions add column if not exists commercial_involvement boolean not null default false;
alter table speakers add column if not exists commercial_involvement boolean not null default false;
