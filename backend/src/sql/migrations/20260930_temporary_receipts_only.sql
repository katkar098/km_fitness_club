-- Remove legacy receipt persistence. Payment rows remain the permanent billing ledger.
DELETE FROM storage.objects WHERE bucket_id = 'receipts';
DELETE FROM storage.buckets WHERE id = 'receipts';
DROP TABLE IF EXISTS public.receipts;
