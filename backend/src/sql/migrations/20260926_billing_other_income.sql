-- Allow standalone billing income rows with no linked member or membership.
-- Run once in the Supabase SQL Editor for an existing database.
ALTER TABLE public.payments
  ALTER COLUMN member_id DROP NOT NULL,
  ALTER COLUMN membership_id DROP NOT NULL;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_receipt_type_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_receipt_type_check
  CHECK (receipt_type IN ('new_membership', 'renewal', 'other_income'));
