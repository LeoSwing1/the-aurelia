# The Aurelia — Hotel Website & Operations Platform

A Next.js App Router application for The Aurelia Hotel & Resort, using Supabase for PostgreSQL, staff authentication, row-level security and Storage, and Vercel for hosting.

## Stack
- Next.js 15 App Router, React 19 and TypeScript
- Tailwind CSS 4, responsive custom design, Lucide icons
- Supabase PostgreSQL, Auth, RLS and Storage
- Vercel deployment and server-side Route Handlers
- Zod validation
- Razorpay checkout/webhook integration (requires merchant credentials)
- Resend email and Meta WhatsApp Cloud API adapters (require provider credentials)

## Current application modules

### Public website
- Home, rooms, weddings, venues, facilities, contact and reservation request pages
- Responsive navigation and enquiry forms
- Accessible thank-you confirmation dialog after successful enquiry submission
- Dynamic sitemap and robots rules, metadata and Hotel structured data
- Next Image optimisation for content and hero imagery

### Room reservation workflow
1. Guest submits room category, stay dates, guest count and contact information.
2. The server validates the request and stores it in Supabase as `PENDING_APPROVAL`.
3. Manager/reception checks availability and approves with the full payable amount.
4. Approval creates an `AWAITING_PAYMENT` hold for 24 hours.
5. Guest pays the full amount through Razorpay when credentials are configured.
6. A signed Razorpay webhook verifies capture; only then does the reservation become `CONFIRMED`.
7. Reception assigns physical room numbers after confirmation. Database exclusion constraints prevent overlapping assignments.
8. Expired payment holds are excluded from availability and can be marked `EXPIRED` by the protected cron endpoint.

A guest request is not a confirmed booking. Inventory is rechecked at approval time. Category inventory starts at 40 Deluxe and 2 Executive rooms. Physical room numbers have deliberately not been invented; hotel staff must enter the actual room identifiers.

### Events
- Wedding, banquet, conference and other event enquiry capture
- Event enquiry queue for authorised staff
- Versioned quotation records and guest email delivery through Resend when configured
- Event booking and instalment schedule tables are present for the next event-payment workflow; instalment collection/guest acceptance UI still needs completion and hotel policy confirmation

### Staff and operations
- Supabase email/password staff login; public self-signup is not exposed
- Role-aware admin navigation and server-side role checks
- Roles: SUPER_ADMIN, GENERAL_MANAGER, RECEPTION, EVENT_MANAGER, HOUSEKEEPING, FINANCE and RESTAURANT_STAFF (future extension)
- Reservation, room inventory, events, finance, housekeeping, staff directory, integration status and notifications pages
- Database notifications for new reservations, event enquiries, contact enquiries and reservation status changes
- Room assignment endpoint validates category and overlapping stay dates

## Setup on Windows CMD

Requirements: Node.js 20.9+ and npm.

```cmd
cd the-aurelia
npm install
copy .env.example .env.local
```

Fill in the Supabase values in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never commit or expose)

Then start the app:

```cmd
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

1. Use the existing Supabase project selected for this hotel.
2. Open **SQL Editor** and execute `supabase/migrations/202611160001_initial_hotel_platform.sql` once.
3. Confirm the migration creates the room categories, booking/event tables, notifications, rate/tax configuration tables, RLS, Storage buckets and booking RPC functions.
4. In **Authentication → Users**, invite the first hotel administrator. Do not enable public sign-up.
5. Insert a matching `profiles` row for that Auth user with role `SUPER_ADMIN`, `active=true`, and the approved staff name/phone. Never allow staff to update their own role.
6. Add additional staff through Auth invitations and provision each profile with the correct role.
7. Add the hotel's actual physical room numbers under the `rooms` table, linked to the correct room category. The database does not invent room numbers.
8. Configure Storage policies/buckets through the migration; test public gallery image reads and private guest document access.

## Integrations and required credentials

| Integration | Implementation | Still required |
|---|---|---|
| Supabase | Browser/server clients, service client, Auth, SQL schema, RLS and Storage policies | Add the private service-role key locally and in Vercel; provision staff |
| Razorpay | Order creation, checkout loader, signed webhook and payment-state transition | Hotel merchant account, key ID/secret, webhook secret and live/test verification |
| Resend | Hotel alerts and guest request/quotation/payment emails | API key, verified sender domain, sender address and notification inbox |
| WhatsApp Cloud API | Server-side hotel alert adapter | Meta Business access, phone number ID, access token, alert recipient and approved templates/opt-in |
| Google Maps | Not activated | Verified property address and approved Maps configuration |
| Analytics/Search Console | SEO metadata, sitemap and robots are implemented | Hotel-owned GA/Search Console IDs and domain verification |
| Vercel | Next.js deployment-ready configuration | Connect repository, set production env vars and verified domain |

Never put the Supabase service-role key, Razorpay secret, Resend key or WhatsApp token in client-side code, screenshots, source control or public documents.

## Important business settings still awaiting hotel confirmation

- Room rates, seasonal pricing, taxes/GST and inclusions
- Cancellation, no-show and refund policy
- Official address, phone, email, logo and verified property photography
- Exact physical room numbers and floor mapping
- The ground-floor banquet area is listed as 76,000 sq. ft.; this needs verification before publication
- Event payment instalments, quotation acceptance and refund terms
- Guest document retention and privacy policy

The current hotel brief lists 42 rooms (40 Deluxe, 2 Executive), wedding capacity 500, poolside garden capacity 500, conference capacity 30, second-floor banquet capacity 200, restaurant capacity 300, gym and parking for 300 vehicles. These are client-provided values and must be confirmed by management before being treated as verified facts.

## Quality checks

```cmd
npm run lint
npm run typecheck
npm run build
npm run check
```

After the local app is running, run Lighthouse against `http://localhost:3000` and test the deployed site with PageSpeed Insights. Do not treat a source-code target as a measured score. A perfect 100 score across Lighthouse categories cannot be promised in advance; third-party scripts, image delivery, hosting conditions, consent tools and real-device performance affect results.

## Deployment

1. Confirm `npm run check` passes.
2. Apply the migration to the correct Supabase project.
3. Configure all required Vercel Preview and Production environment variables.
4. Connect the Git repository and deploy a Preview build first.
5. Test staff roles, guest requests, approval holds, payment test mode, webhook signature, notifications, event quotations and room assignment.
6. Add the verified production domain to `NEXT_PUBLIC_SITE_URL` and verify sitemap/robots.
7. Configure the protected `/api/cron/expire-holds` endpoint with `Authorization: Bearer $CRON_SECRET` using a schedule supported by the selected Vercel plan or an external scheduler.
8. Enable live payments only after hotel finance signs off on merchant settings, cancellation/refund policy and webhook tests.

## Security notes
- All public form writes go through validated server-side endpoints.
- The Supabase service-role key is used only in server modules.
- Privileged database RPC functions are revoked from public/anon/authenticated and granted to `service_role`.
- Staff role checks are performed server-side; navigation hiding is not treated as security.
- Payment confirmation is driven by a signed Razorpay webhook, not the browser checkout callback.
- Private guest documents use a private Storage bucket.

## Room category management

Super Admin and General Manager can edit room category names, nightly base rates (INR), category inventory, adult/child occupancy limits, and whether a category is active from **Admin → Rooms → Room names, prices & capacity**. Updates are saved to `room_types` and recorded in `audit_logs`. Public booking category choices are loaded from `/api/room-types`, so active category names and base rates update without editing source code. Existing reservations retain their saved approved total; changing a base rate is intended for future pricing only. The initial migration already includes `room_types.base_rate`; no additional schema migration is required for this editor.

The room category editor does not create physical room numbers. Those should be added only after management supplies the hotel's actual room-number list.
