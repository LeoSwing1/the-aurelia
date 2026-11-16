# The Aurelia — integrations and setup

This archive contains the current Next.js application source, Supabase migration, room category and physical-room management, reservation/event/contact APIs, staff authentication foundation, admin screens, Razorpay checkout/webhook handlers, Resend and WhatsApp Cloud API adapters, and Vercel hold-expiry cron endpoint.

## Important activation requirements

The source code does not connect provider accounts automatically. Configure credentials belonging to the hotel/operator before enabling production:

- Supabase: project URL, publishable key and server-only service role key.
- Razorpay: test key ID/secret and webhook secret; configure a webhook for `payment.captured` and `payment.failed`.
- Resend: API key and a verified sender domain; configure `EMAIL_FROM` and `HOTEL_NOTIFICATION_EMAIL`.
- Meta WhatsApp Cloud API: phone number ID, access token, recipient and approved templates where required by Meta policy.
- Vercel: configure `CRON_SECRET` and deploy `vercel.json` cron. Confirm the account plan supports the selected cron frequency.

## Local setup (Windows CMD)

1. Extract this archive to a new folder.
2. Copy `.env.example` to `.env.local` and fill in credentials locally. Never commit `.env.local`.
3. Run `npm ci` (or `npm install` if lockfile installation is unavailable).
4. Apply **all** SQL files in `supabase/migrations/` in ascending filename order in the Supabase SQL Editor. Do not skip migrations 002–005.
5. Create the first staff user in Supabase Auth, then follow `ADMIN-BOOTSTRAP.md` to provision the matching profile and Super Admin role. Do not enable public staff registration.
6. Run `npm run dev`.
7. Before deployment, run `npm run lint`, `npm run typecheck`, `npm run build` and the manual integration checklist.

## Known limitations requiring completion/verification

- Payment flow must be tested end-to-end in Razorpay test mode. The latest webhook reconciliation validates order amount and currency, avoids duplicate confirmation messages, and flags late/mismatched captures for manual reconciliation. Refund execution remains a manual/provider workflow and must be tested before production.
- Provider adapters report an unconfigured provider as not sent; configure and test credentials and delivery logs.
- WhatsApp business-initiated notifications may require approved templates; do not assume arbitrary text is permitted for every conversation.
- Confirm RLS policies against every table and role with Supabase's policy tester. Privileged service-role calls must remain server-only.
- Add rate limiting and bot protection to public reservation/contact/event endpoints before exposing them publicly.
- Confirm actual room numbers, prices, taxes, policies, address and hotel-owned content with management. Do not publish assumed details.
- Complete physical room assignment and check-in/out operational testing, quotation acceptance, event instalments, invoice PDF generation and refunds before production launch.
- Run Lighthouse against a deployed production build. No perfect audit score is promised without measurement.

## Security

Never put `SUPABASE_SERVICE_ROLE_KEY`, Razorpay secret, webhook secret, Resend API key or WhatsApp token in a `NEXT_PUBLIC_` variable. Do not share them in chat or screenshots. Rotate any credential accidentally exposed.

## Front-desk reservation pricing update (16 Nov 2026)

Apply `supabase/migrations/202611160002_front_desk_pricing.sql` after the initial hotel platform migration and continue in ascending migration order. This adds `pricing_breakdown` and `front_desk_notes` to reservations and installs the service-role-only `approve_reservation_detailed` RPC used by the expanded front-desk approval panel.

Reception/Finance enters the approved nightly rate per room, additional charges, discount and tax percentage. The interface calculates room subtotal = nightly rate × nights × room quantity; then adds additions, subtracts discount and calculates tax on the discounted subtotal. The resulting full amount is stored on the reservation, and the itemised values are retained in `pricing_breakdown`. The default room category rates are set by migration `202611160003_default_room_rates.sql` to ₹2,500 per night for Deluxe and ₹3,000 per night for Executive. Administrators can edit these rates in Room Management. Reception can still adjust the final quoted rate, additional charges, discount and tax percentage for an individual reservation using hotel-approved rules.

The front-desk page also displays reservation counts, guest and stay details, payment hold deadlines, payment transaction references and physical-room assignment actions. Razorpay, Resend and Meta WhatsApp remain credential-dependent integrations; the UI does not imply that a provider is live until its required environment variables are present. Verify gateway webhooks and test-mode payments before production.


## Guest communications, consent, and Google measurement

- Reservation requests require a separate essential-contact consent so the hotel can discuss that enquiry, payment and stay. This is not marketing consent.
- Email, WhatsApp and SMS promotional permissions are independent optional checkboxes. Consent flags, timestamp and source are stored on the reservation by migration `202611160004_guest_consent_and_analytics.sql`.
- Guest reservation receipt email is transactional. Guest WhatsApp/SMS acknowledgement is attempted only when essential-contact permission is selected. Promotional campaigns must additionally filter the matching channel-specific marketing consent flag and support opt-out/suppression before sending.
- Email uses Resend (`RESEND_API_KEY`, `EMAIL_FROM`, `HOTEL_NOTIFICATION_EMAIL`). WhatsApp uses Meta Cloud API credentials already listed above. SMS uses Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`). Provider credentials are optional; delivery is not active until configured and tested.
- Google Analytics 4 loads when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured. Google Search Console ownership verification uses `GOOGLE_SITE_VERIFICATION`; after verification, submit `/sitemap.xml` in Search Console.
- Configure analytics consent/cookie preferences to meet the hotel's applicable privacy and cookie obligations before production launch.


## Guestbook, social profiles and Google marketing setup

The homepage includes a page-turning Guestbook section. It does not publish fabricated testimonials. Add hotel-owned profile URLs to these public environment variables to activate the links:

- `NEXT_PUBLIC_GOOGLE_BUSINESS_URL` — official Google Business Profile URL.
- `NEXT_PUBLIC_GOOGLE_REVIEWS_URL` — official Google review link.
- `NEXT_PUBLIC_INSTAGRAM_URL` — official Instagram profile URL.

For Google Search Console, add the domain property, complete DNS or HTML-tag ownership verification, set `GOOGLE_SITE_VERIFICATION` to the exact meta-tag token when using HTML-tag verification, deploy, and submit `https://YOUR-DOMAIN/sitemap.xml`. For Google Analytics 4, set `NEXT_PUBLIC_GA_MEASUREMENT_ID` to the web stream ID (`G-...`). The current site asks visitors for optional analytics consent before loading GA. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS production domain before deployment.

Google Business Profile, Search Console and Analytics cannot be verified or activated by source code alone; the hotel must own/verify the accounts and domain. Keep actual reviews, address, telephone, photography and business hours grounded in hotel-approved information.

## Live admin notifications
The admin toolbar polls the authenticated `/api/admin/notifications` endpoint every 15 seconds. The endpoint reads the Supabase `notifications` table with a server-only service-role client after verifying the signed-in staff profile and role. New reservation, event and contact records are written by database triggers in the initial migration; reservation status changes also create notifications. Staff can mark a notification as read. The Chrome/Edge permission prompt enables desktop notifications while the admin portal is open. It is not a background Web Push subscription: notifications while the browser is fully closed require VAPID keys, a push subscription table and a delivery worker, which are not claimed as configured here.

## Guestbook links
Set `NEXT_PUBLIC_GOOGLE_BUSINESS_URL`, `NEXT_PUBLIC_GOOGLE_REVIEWS_URL` and `NEXT_PUBLIC_INSTAGRAM_URL` to the hotel's verified official profile URLs. Until configured, the corresponding cards remain visibly unavailable. Guestbook copy intentionally contains no fabricated guest reviews, names, ratings or wedding quotations.


## Vercel Hobby cron schedule

The included `vercel.json` schedules expired reservation-hold cleanup once daily (`0 0 * * *`) to remain compatible with the Vercel Hobby plan. Configure `CRON_SECRET` as a server-only environment variable in Vercel for Production, Preview, and Development as appropriate. The cron endpoint must validate the `Authorization: Bearer <CRON_SECRET>` header. Daily scheduling means expired holds may remain visible until the next run; use a Vercel plan that supports more frequent cron execution if hourly cleanup is operationally required.
