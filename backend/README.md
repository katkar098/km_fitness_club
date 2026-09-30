# KM Fitness Club backend

This Express backend is the only application allowed to access Supabase gym data. React uses it through HTTPS; React must never receive the Supabase service-role key or connect to the database directly.

## One-time setup

1. In Supabase Authentication, create exactly one email/password user for the administrator. Use a new, strong password; do not store it in code or `.env`.
2. In Supabase SQL Editor, run `src/sql/schema.sql`. It enables Row Level Security for application tables. For an existing database, also run `src/sql/migrations/20260806_member_creation_source.sql`, `src/sql/migrations/20260926_billing_other_income.sql`, `src/sql/migrations/20260927_payment_revenue_breakdown.sql`, and `src/sql/migrations/20260930_temporary_receipts_only.sql` once.
3. Copy `.env.example` to `.env` and set the Supabase URL, publishable key, secret key, database URL, frontend origin, and the email created in step 1. The secret key stays in the backend `.env` only.
4. Run `npm install`.
5. Run `npm run dev`.

If the project was created using the old integer-ID schema and every old table is empty, first run `src/sql/reset-empty-legacy-schema.sql`, then run `src/sql/schema.sql`.

## Frontend endpoint map

| Screen | Backend endpoint |
| --- | --- |
| Login | `POST /api/auth/login` |
| Dashboard / Home | `GET /api/dashboard` |
| Members | `GET /api/members?search=` and `GET /api/members/:id` |
| Create User | `POST /api/members/enroll` |
| Member edit | `PUT /api/members/:id` |
| Membership Plan / Price Config | `GET/POST/PUT /api/plans` |
| Renew Membership | `POST /api/members/:id/renew` |
| Billing | `GET /api/payments` |
| Receipt | Generated temporarily in the browser from the saved payment/member data; no receipt endpoint or database record is used. |

All endpoints except `/api/auth/login` and `/api/auth/forgot-password` need `Authorization: Bearer <accessToken>`.

## Biometric integration

Biometric user discovery, unregistered user detection, registration, synchronization, and expired-user removal continue through the ESSL device integration.

## Receipt behaviour

Payments remain in `public.payments` as the permanent transaction history. Admission and renewal receipt views are generated from the saved response in browser memory, downloaded as a temporary PDF, and shared through WhatsApp as text. Receipt files and identifiers are not stored in Supabase or on the server.
