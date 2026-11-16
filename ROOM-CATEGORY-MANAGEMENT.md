# Room category management

After the existing Supabase migration has been applied and staff authentication is configured:

1. Sign in as a `SUPER_ADMIN` or `GENERAL_MANAGER`.
2. Open Admin → Rooms.
3. Under “Room names, prices & capacity”, select Edit for Deluxe or Executive.
4. Change the category name, nightly base rate (INR), inventory count, adult/child occupancy limits, or active visibility.
5. Select Save. The API validates the values, writes to `room_types`, and records an audit event.

Active room categories are served to the public booking form by `/api/room-types`. The booking form displays the configured category name and base rate. Inactive categories are not offered to new guests.

Notes:
- The existing database migration already has `room_types.base_rate`; no additional migration is needed for these fields.
- Changes to a base rate do not retroactively alter approved reservation totals.
- Changing inventory affects future availability checks. Do not reduce inventory below the number of rooms already committed to overlapping stays.
- Only Super Admin and General Manager can edit category configuration. Reception and Housekeeping can view the room inventory page.
- Physical room numbers/floors are separate from room categories and should be entered after management confirms the actual room list.
- The public endpoint uses the server-side Supabase service role. Keep `SUPABASE_SERVICE_ROLE_KEY` private and never prefix it with `NEXT_PUBLIC_`.


## Default nightly rates
The initial management rates are Deluxe ₹2,500 per room per night and Executive ₹3,000 per room per night. Apply `supabase/migrations/202611160003_default_room_rates.sql` once in the Supabase SQL Editor. Authorised Super Admin and General Manager users can change these values later under Admin → Rooms → Room names, prices & capacity. The front-desk reservation approval form pre-fills the current category rate; staff can override the rate for an individual reservation before approval. Existing approved reservations keep their saved totals.
