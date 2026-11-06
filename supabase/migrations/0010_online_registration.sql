-- DIFSC 2026 — online registration type
-- Run this once in Supabase's dashboard: SQL Editor -> New query -> paste -> Run.
-- Run it BEFORE the matching code goes live, or online registrations will fail.
--
-- Delegates can now also register as "online" participants (with their own
-- joining code, checked in the app). No new columns are needed.

alter table delegate_registrations
  drop constraint delegate_registrations_registration_type_check;

alter table delegate_registrations
  add constraint delegate_registrations_registration_type_check
  check (registration_type in ('government', 'guest', 'volunteer', 'online'));
