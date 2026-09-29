-- KM Fitness Club: ONE-TIME reset for the unused legacy schema.
-- Use only after confirming all old gym tables contain zero rows.
-- It removes the incompatible integer-ID tables and old views only.

begin;

drop view if exists public.active_members cascade;
drop view if exists public.membership_stats cascade;

drop table if exists public.biometric_sync cascade;
drop table if exists public.payments cascade;
drop table if exists public.members cascade;
drop table if exists public.membership_plans cascade;
drop table if exists public.admins cascade;

commit;
