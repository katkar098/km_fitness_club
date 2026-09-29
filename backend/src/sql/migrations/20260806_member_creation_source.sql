-- Run once for an existing KM Fitness database.
-- members created by the administrator through Create User.
alter table public.members
  add column if not exists created_by_admin_id uuid;

