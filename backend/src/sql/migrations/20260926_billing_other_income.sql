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

ALTER TABLE public.receipts
  DROP CONSTRAINT IF EXISTS receipts_receipt_type_check;
ALTER TABLE public.receipts
  ADD CONSTRAINT receipts_receipt_type_check
  CHECK (receipt_type IN ('new_membership', 'renewal', 'other_income'));

-- Give older unlinked other-income entries stable ledger references too.
UPDATE public.payments
SET transaction_reference = 'KM' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
WHERE receipt_type = 'other_income'
  AND member_id IS NULL
  AND transaction_reference IS NULL;
