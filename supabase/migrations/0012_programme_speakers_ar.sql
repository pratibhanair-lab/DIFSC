-- DIFSC 2026 - Arabic version of the speakers' and moderator's names in the programme.
-- Run this once in Supabase's dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Both are optional. When one is blank, the Arabic programme page shows the
-- English name instead.

alter table programme_items add column speakers_ar text;
alter table programme_items add column moderator_ar text;
