-- DIFSC 2026 — track which page a submission came in through
-- Run this once in Supabase's dashboard: SQL Editor -> New query -> paste -> Run.

-- 'external' = public home page (/), 'internal' = Dubai Municipality staff
-- page (/proposals). Set automatically by the app when a submission is
-- created — not something the submitter chooses.

alter table submissions add column if not exists source text not null default 'external'
  check (source in ('external', 'internal'));
