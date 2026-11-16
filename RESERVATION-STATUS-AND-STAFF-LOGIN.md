# Reservation status and staff access

## Guest reservation lookup

Guests can open `/reservation-status` and enter the booking reference shown in their confirmation plus the email address used for the enquiry. The API only returns a matching reservation when both values match. It shows the current reservation status, payment status, dates, occupancy, room count and amount (if configured).

The lookup uses the server-only Supabase service-role client. Keep `SUPABASE_SERVICE_ROLE_KEY` on the server and never prefix it with `NEXT_PUBLIC_`.

## Staff sign-in checklist

An email/password login only works after the account exists in Supabase Authentication → Users and the password is correct. For the first administrator:

1. Create the user in Authentication → Users and set a password.
2. Copy that user's UUID.
3. In SQL Editor, run the bootstrap statement from `ADMIN-BOOTSTRAP.md`, replacing `AUTH_USER_UUID` with the actual UUID.
4. Confirm the matching `public.profiles` row has `active = true` and `role = 'SUPER_ADMIN'`.
5. Confirm `.env.local` contains the correct project URL, publishable key and server-only service role key; restart `npm run dev` after changes.

`Invalid login credentials` is an Auth email/password error; creating a profile row alone does not create an Auth user or set its password. If the user exists, reset its password from Supabase Authentication before trying again.
