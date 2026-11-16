# Production readiness checklist

## Business verification
- [ ] Hotel confirms legal/business identity, official address, contact details and brand assets.
- [ ] Hotel confirms room rates, occupancy, tax/GST, cancellation, no-show and refund policy.
- [ ] Hotel confirms the stated 76,000 sq. ft. ground-floor banquet area.
- [ ] Hotel confirms capacities, parking, amenities and room inclusions.
- [ ] Actual room numbers and floor mapping entered by reception/management.

## Supabase and security
- [ ] Migration applied to the correct hotel-owned Supabase project.
- [ ] RLS and Storage policies reviewed in Supabase dashboard.
- [ ] First SUPER_ADMIN invited and provisioned in `profiles`.
- [ ] Public sign-up disabled; staff invited individually.
- [ ] Role-based access tested with one account per staff role.
- [ ] Service-role key stored only in server environment variables.
- [ ] Backups, retention, privacy notice and incident process approved.

## Reservations and payments
- [ ] Availability checked for same-category concurrent requests and overlapping dates.
- [ ] Manager approval rechecks inventory and creates a 24-hour payment hold.
- [ ] Expired unpaid holds are released from availability and expiry job is configured.
- [ ] Razorpay test orders and signed webhook tested; duplicate webhook handling tested.
- [ ] Late/failed payment reconciliation and refund procedure tested.
- [ ] Guest email receipt and hotel notifications verified.
- [ ] Reception physical room assignment and room overlap constraints tested.

## Events and operations
- [ ] Event enquiry appears in admin queue and guest receipt is delivered.
- [ ] Quotation versioning and email delivery tested.
- [ ] Event quotation acceptance and instalment schedule UI completed after policy confirmation.
- [ ] Finance, housekeeping and maintenance workflows tested.

## Launch and quality
- [ ] Resend sender domain verified.
- [ ] WhatsApp opt-in, approved templates and test delivery completed.
- [ ] Google Maps configured only after address verification.
- [ ] Vercel Preview and Production variables separated.
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` pass.
- [ ] Lighthouse and real-device tests completed on production; scores recorded.
- [ ] Search Console domain verified; sitemap submitted.
- [ ] Live payments enabled only after finance sign-off.
