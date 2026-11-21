# The Aurelia — first administrator setup

Do not create a public sign-up route for hotel staff. The first administrator must be provisioned manually by the project owner.

## 1. Create the first Auth user

1. Open Supabase Dashboard → Authentication → Users.
2. Choose **Add user** and create the hotel's designated administrator using an email controlled by hotel management.
3. Use a strong temporary password and require the administrator to change it after first sign-in.
4. Copy the user's UUID from the Auth user list.

## 2. Assign the Super Admin role

In Supabase SQL Editor, replace `AUTH_USER_UUID` with the exact UUID copied above and execute:

```sql
insert into public.profiles (id, full_name, role, active)
values ('AUTH_USER_UUID', 'Hotel Administrator', 'SUPER_ADMIN', true)
on conflict (id) do update
set role = 'SUPER_ADMIN', active = true;
```

Only do this for the one authorised initial administrator. Never expose the Supabase service-role key in a browser or commit it to Git.

## 3. Add additional staff

Create each staff account in Supabase Authentication, then insert a profile with one of:

- `GENERAL_MANAGER`
- `RECEPTION`
- `EVENT_MANAGER`
- `HOUSEKEEPING`
- `FINANCE`

Example:

```sql
insert into public.profiles (id, full_name, phone, role, active)
values ('AUTH_USER_UUID', 'Staff Member', null, 'RECEPTION', true);
```

The current application role model is one role per profile. Do not give staff `SUPER_ADMIN` unless explicitly authorised by hotel management.

## 4. Seed physical rooms gradually

Open Admin → Rooms. Add actual room numbers, floors and categories supplied by hotel management. The system starts with room categories only; it intentionally does not invent physical room numbers.

Set nightly base rates in Admin → Rooms → Room names, prices & capacity. Verify tax rules and final guest-facing prices with hotel management before accepting live payments.

## 5. Cron configuration

`vercel.json` schedules the payment-hold expiry endpoint once daily (Vercel Hobby limit). Scheduler reminders run every minute through Supabase pg_cron; see `SCHEDULER-SETUP.md`. Add a strong `CRON_SECRET` to Vercel Production and Preview environment variables. Vercel sends the cron authorization header. Run a manual authenticated test after deployment.

## 6. Production secrets

Set these only in Vercel server-side environment variables as applicable:

- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `RESEND_API_KEY`, `EMAIL_FROM`, `HOTEL_NOTIFICATION_EMAIL`
- `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_ALERT_TO`
- `CRON_SECRET`

Never put a service-role key or payment secret in any `NEXT_PUBLIC_` variable.
