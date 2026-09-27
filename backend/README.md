# KM Fitness Club backend

This Express backend is the only application allowed to access Supabase gym data. React uses it through HTTPS; React must never receive the Supabase service-role key or connect to the database directly.

## One-time setup

1. In Supabase Authentication, create exactly one email/password user for the administrator. Use a new, strong password; do not store it in code or `.env`.
2. In Supabase SQL Editor, run `src/sql/schema.sql`. It enables Row Level Security and creates a **private** `receipts` storage bucket. For an existing database, also run `src/sql/migrations/20260806_member_creation_source.sql`, `src/sql/migrations/20260926_billing_other_income.sql`, and `src/sql/migrations/20260927_payment_revenue_breakdown.sql` once.
3. Copy `.env.example` to `.env` and set the Supabase URL, publishable key, secret key, database URL, frontend origin, and the email created in step 1. The secret key stays in the backend `.env` only.
4. Run `npm install`. When this server is installed on the ETimeTrackLite PC, this also installs `node-adodb`; Microsoft Access Database Engine must be present.
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
| Receipt | `GET /api/receipts/:receiptNumber`, `GET /api/receipts/:receiptNumber/download` |
| Attendance | `GET /api/attendance?date=YYYY-MM-DD` |

All endpoints except `/api/auth/login` and `/api/auth/forgot-password` need `Authorization: Bearer <accessToken>`.

## ETimeTrackLite (MS Access)

Set the `ACCESS_*` fields only on the Windows PC containing the ETimeTrackLite parallel `.mdb` database. The backend reads the `USERINFO` user list for Create User and reads attendance every minute, de-duplicates each event, and writes attendance to Supabase. The `.mdb` file is read-only to this project.

The provided `CHECKINOUT`, `ID`, `USERID`, `CHECKTIME`, and `CHECKTYPE` values are examples. Replace them with the exact table and column names found in your parallel Access database. Attendance rows are imports only: an ETimeTrackLite user is linked to a member only after the administrator creates that member through Create User; it can never create a member by itself.

## Receipt behaviour

New memberships and renewals create different receipt types (`new_membership` and `renewal`). A PDF is generated into the private Supabase `receipts` bucket. The download endpoint returns a short-lived signed URL, so receipts are not public.
