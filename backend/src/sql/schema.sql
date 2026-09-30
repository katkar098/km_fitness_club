-- KM Fitness Club - Supabase schema
-- Run this ONCE in Supabase SQL Editor. It never drops existing data.
-- The browser must not query these tables directly. All application data is
-- accessed through the Express backend using the Supabase service-role key.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_days integer not null check (duration_days > 0),
  price numeric(12,2) not null check (price >= 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  member_code text not null unique,
  biometric_user_id text unique,
  full_name text not null,
  phone text,
  email text,
  gender text check (gender in ('male','female','other')),
  date_of_birth date,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  photo_path text,
  status text not null default 'active' check (status in ('active','expired','suspended','inactive')),
  biometric_access_enabled boolean not null default false,
  -- A member record is created only when an administrator completes Create User.
  created_by_admin_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe for databases where the members table already exists.
alter table public.members
  add column if not exists created_by_admin_id uuid;

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  plan_id uuid not null references public.membership_plans(id) on delete restrict,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_active_membership_per_member
  on public.memberships(member_id) where status = 'active';

create unique index if not exists membership_plans_name_duration_key
  on public.membership_plans(name, duration_days);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete restrict,
  membership_id uuid references public.memberships(id) on delete restrict,
  receipt_type text not null check (receipt_type in ('new_membership','renewal','other_income')),
  amount numeric(12,2) not null check (amount >= 0),
  base_amount numeric(12,2),
  admission_fee numeric(12,2),
  discount numeric(12,2),
  payment_method text not null check (payment_method in ('cash','upi','card','bank_transfer','other')),
  transaction_reference text,
  status text not null default 'completed' check (status in ('completed','pending','failed','refunded')),
  paid_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists unique_transaction_reference
  on public.payments(transaction_reference) where transaction_reference is not null;

create table if not exists public.biometric_sync_queue (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  action text not null check (action in ('enable','disable','create','update')),
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  attempts integer not null default 0,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_status_idx on public.members(status);
create index if not exists members_code_idx on public.members(member_code);
create index if not exists memberships_end_date_idx on public.memberships(end_date);
create index if not exists biometric_queue_pending_idx on public.biometric_sync_queue(status, created_at);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists members_updated_at on public.members;
create trigger members_updated_at before update on public.members for each row execute function public.set_updated_at();
drop trigger if exists plans_updated_at on public.membership_plans;
create trigger plans_updated_at before update on public.membership_plans for each row execute function public.set_updated_at();
drop trigger if exists memberships_updated_at on public.memberships;
create trigger memberships_updated_at before update on public.memberships for each row execute function public.set_updated_at();
drop trigger if exists biometric_queue_updated_at on public.biometric_sync_queue;
create trigger biometric_queue_updated_at before update on public.biometric_sync_queue for each row execute function public.set_updated_at();

-- Deny browser access by default. service_role (backend only) bypasses RLS.
alter table public.admin_users enable row level security;
alter table public.membership_plans enable row level security;
alter table public.members enable row level security;
alter table public.memberships enable row level security;
alter table public.payments enable row level security;
alter table public.biometric_sync_queue enable row level security;
