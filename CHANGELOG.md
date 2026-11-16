# Changelog

## 2026-11-16 — Integrated development pass
- Combined the latest public-site design with the hotel platform modules and Supabase migration.
- Added staff authentication gate, role-based admin navigation and server-side page/API role checks.
- Added booking request, availability, manager approval, 24-hour payment hold, Razorpay order and signed webhook flow.
- Added event enquiry and versioned quotation workflow.
- Added email and WhatsApp server adapters with environment-based activation.
- Added in-app notifications for new reservations, event/contact enquiries and reservation status changes.
- Added room assignment RPC/API with room-category validation and overlapping-stay protection.
- Added room rate and tax configuration tables without inventing prices or tax rates.
- Added Storage buckets and policies for public marketing images and private guest documents.
- Added guest-facing thank-you dialogs and request receipt emails when Resend is configured.
- Improved image delivery with Next Image, SEO metadata and production documentation.
- Removed local environment secrets and browser audit artefacts from the deliverable archive.

## Continued development — physical room inventory and operations

- Added Super Admin / General Manager API endpoints to create and update physical room records.
- Added Admin → Rooms physical inventory editor for room number, floor, category, operational status and active state.
- Added a guard against reducing category inventory below the number of active physical room records.
- Added a guard against changing the category or disabling/marking a physically assigned room as maintenance while it has an unreleased assignment.
- Added `vercel.json` hourly schedule for the 24-hour reservation-hold expiry endpoint.
- Added `ADMIN-BOOTSTRAP.md` with safe first-admin provisioning and staff setup instructions.

Validation note: dependency installation could not complete in the build environment; run `npm ci`, `npm run lint`, `npm run typecheck`, and `npm run build` locally before deployment. No live payment, email, WhatsApp, Supabase or Lighthouse test is claimed by this source update.


## 16 Nov 2026 — guestbook, SEO and payment reconciliation
- Restored the homepage Guestbook with animated page-turn navigation and configurable Google Business, Google Reviews and Instagram links. No fictional guest reviews are displayed.
- Added public profile environment variables and setup instructions for Google Business Profile, Search Console and Analytics.
- Added exact-order Razorpay reconciliation with amount/currency validation, duplicate webhook protection and manual-review states for late or mismatched captures.

## Live admin notifications and guestbook polish
- Added an admin-wide live notification control backed by the Supabase `notifications` table, refreshing every 15 seconds with unread counts and mark-as-read actions.
- Added a Chrome/Edge notification permission control. Desktop alerts are delivered while an authenticated admin portal tab is open; background push while the browser is closed still requires a configured Web Push/VAPID subscription service.
- Reworked the Guestbook into a layered editorial book with animated page turns, page navigation, official Google Business/reviews and Instagram cards, and a wedding enquiry panel. It does not fabricate customer testimonials or ratings.
- Booking, event and contact operational records continue to be written to Supabase through server-side APIs; local storage is used only for the analytics-consent preference, not reservations or guest records.
