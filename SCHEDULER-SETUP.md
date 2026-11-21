# The Aurelia — Hotel Operations Scheduler Setup

## Included features

- Admin navigation: **Schedule & Calendar**.
- Live clock and calendar views, with all displayed/input times explicitly using `Asia/Kolkata` (IST, UTC+05:30).
- Schedule categories for reservations, guests, housekeeping, events, staff, payments and other hotel activities.
- Assign-to field, reminder email recipient, start/end times and configurable reminder lead time.
- Email reminder queue with duplicate-claim protection and up to three delivery attempts.

## Required deployment steps

1. Apply `supabase/migrations/202611180001_hotel_operations_scheduler.sql` to the production Supabase project after the existing migrations.
2. In Vercel Project Settings → Environment Variables, set:
   - `HOTEL_NOTIFICATION_EMAIL=leovsmgrowth@gmail.com`
   - `CRON_SECRET` to a long random secret shared only with the deployment.
3. Confirm the existing Brevo settings are present: `BREVO_API_KEY`, `EMAIL_FROM`, and `EMAIL_FROM_NAME`.
4. Deploy the updated project. `vercel.json` registers only daily crons, because the Vercel Hobby plan **fails the whole deployment** for any cron that runs more than once a day. Production then keeps serving the previous build, and `/api/cron/scheduled-reminders` returns 404. The daily `scheduled-reminders` entry is only a safety net.
4a. Turn on the every-minute trigger in Supabase:
   - In the SQL Editor, store the two Vault secrets listed at the top of `supabase/migrations/202611180002_scheduler_pg_cron_trigger.sql`. Use the production domain, and the same `CRON_SECRET` value that is set in Vercel.
   - Run that migration.
   - Verify it with `select * from cron.job_run_details order by start_time desc limit 5;` and `select status_code, content from net._http_response order by created desc limit 5;`. The `status_code` must be `200`.
   - On the Vercel Pro plan, you can instead set the `scheduled-reminders` schedule in `vercel.json` back to `* * * * *` and unschedule the Supabase job with `select cron.unschedule('aurelia-scheduled-reminders');`. Do not run both.
5. Open `/admin/schedule`, create a test activity a few minutes in the future, choose “At scheduled time”, and confirm the email arrives. Check the reminder row status in `hotel_schedule_reminders` and the Brevo activity log.

## Time handling

- Database timestamps remain UTC `timestamptz` values.
- Admin-facing reservation creation times, payment deadlines, notifications, calendar entries and reminder email times are formatted in `Asia/Kolkata`.
- The scheduler interprets `datetime-local` values as IST regardless of the browser machine timezone.

## Email recipient behaviour

The hotel notification recipient defaults to `leovsmgrowth@gmail.com`. Set the same value explicitly in Vercel so an old environment variable cannot override the confirmed recipient. A schedule reminder is sent to the recipient selected on that schedule; new schedules default to the hotel notification address.
