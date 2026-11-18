# Supabase migration

Apply `202611160001_initial_hotel_platform.sql` once in the target Supabase project's SQL Editor. It creates the initial hotel schema, booking RPC functions, RLS, notifications, room-rate/tax configuration tables and Storage buckets/policies.

The migration seeds only the two room categories (40 Deluxe, 2 Executive) and the client-provided venue capacity brief. It intentionally does not invent room numbers, rates, taxes, hotel contact details or a verified address.

After applying it:
1. Invite the first staff user in Supabase Auth.
2. Insert that user's UUID into `profiles` with `role='SUPER_ADMIN'` and `active=true`.
3. Invite additional staff and assign approved roles.
4. Enter actual room numbers in `rooms` and associate them with `room_types`.
5. Configure rates and taxes only after management/finance approval.
6. Test booking approval and payment webhooks in Razorpay test mode before enabling live mode.

Do not create anonymous insert policies for reservations, payments, event enquiries or guest documents. Public writes are handled by validated Next.js server endpoints using the server-only service role key.

Apply `202611160004_guest_consent_and_analytics.sql` after migrations 001–003. It adds reservation-level essential-contact and channel-specific marketing consent fields. Do not skip this migration before using the updated booking form.


## 2026-11-18 — Hotel operations scheduler

Apply `202611180001_hotel_operations_scheduler.sql` after the existing payment reconciliation migration. It creates the hotel calendar, scheduled activity records, and deduplicated email reminder queue. Configure `CRON_SECRET` in Vercel and ensure the deployment scheduler can invoke `/api/cron/scheduled-reminders` every minute. All schedule timestamps are stored as UTC `timestamptz` and entered/displayed in `Asia/Kolkata`.
