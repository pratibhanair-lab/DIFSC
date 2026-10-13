-- DIFSC 2026 — delegate registration type (government employee vs guest)
-- Run this once in Supabase's dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Delegates can now register either as a government employee or as a guest
-- (guests must enter a joining code on the form). This records which one
-- they chose. Every registration that already exists was made before guests
-- were allowed, so they all become 'government'.

alter table delegate_registrations
  add column registration_type text not null default 'government'
  check (registration_type in ('government', 'guest'));
