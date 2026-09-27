-- Persist the parts of each membership payment so monthly reports can
-- separate plan revenue from admission fees after refresh/restart.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS base_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS admission_fee numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount numeric(12,2);

-- Backfill legacy payments from their plan. Admission for old records is
-- inferred from amount minus plan price; old discounts were not stored.
UPDATE public.payments AS pay
SET base_amount = COALESCE(
      pay.base_amount,
      (SELECT plan.price
       FROM public.memberships AS ms
       JOIN public.membership_plans AS plan ON plan.id = ms.plan_id
       WHERE ms.id = pay.membership_id),
      pay.amount
    ),
    admission_fee = COALESCE(
      pay.admission_fee,
      CASE WHEN pay.receipt_type = 'new_membership'
        THEN GREATEST(
          pay.amount - COALESCE(
            (SELECT plan.price
             FROM public.memberships AS ms
             JOIN public.membership_plans AS plan ON plan.id = ms.plan_id
             WHERE ms.id = pay.membership_id),
            pay.amount
          ),
          0
        )
        ELSE 0
      END
    ),
    discount = COALESCE(pay.discount, 0);
