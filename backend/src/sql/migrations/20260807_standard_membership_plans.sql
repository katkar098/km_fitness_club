-- Allow a plan name to have multiple durations, then add the club's standard
-- Gym, Gym + Cardio, and Personal Trainer plan prices.
alter table public.membership_plans
  drop constraint if exists membership_plans_name_key;

create unique index if not exists membership_plans_name_duration_key
  on public.membership_plans(name, duration_days);

insert into public.membership_plans (name, duration_days, price, description, is_active)
values
  ('Gym Membership', 30, 700, 'Gym membership - 1 month', true),
  ('Gym Membership', 90, 2000, 'Gym membership - 3 months', true),
  ('Gym Membership', 180, 3500, 'Gym membership - 6 months', true),
  ('Gym Membership', 365, 6999, 'Gym membership - 1 year', true),
  ('Gym + Cardio', 30, 900, 'Gym and cardio - 1 month', true),
  ('Gym + Cardio', 90, 2600, 'Gym and cardio - 3 months', true),
  ('Gym + Cardio', 180, 4800, 'Gym and cardio - 6 months', true),
  ('Gym + Cardio', 365, 8999, 'Gym and cardio - 1 year', true),
  ('Personal Trainer (PT)', 30, 3000, 'Personal training - 1 month', true),
  ('Personal Trainer (PT)', 90, 9000, 'Personal training - 3 months', true),
  ('Personal Trainer (PT)', 180, 18000, 'Personal training - 6 months', true),
  ('Personal Trainer (PT)', 365, 36000, 'Personal training - 1 year', true)
on conflict (name, duration_days) do update
set price = excluded.price,
    description = excluded.description,
    is_active = true;
