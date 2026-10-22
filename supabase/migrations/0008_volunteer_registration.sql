-- DIFSC 2026 — volunteer registration type
-- Run this once in Supabase's dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Delegates can now also register as a volunteer. Volunteers pick the kind of
-- support they'd prefer to give; that choice is stored in volunteer_support
-- (empty for government employees and guests).

alter table delegate_registrations
  drop constraint delegate_registrations_registration_type_check;

alter table delegate_registrations
  add constraint delegate_registrations_registration_type_check
  check (registration_type in ('government', 'guest', 'volunteer'));

alter table delegate_registrations
  add column volunteer_support text;
