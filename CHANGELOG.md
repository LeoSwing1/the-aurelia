# Changelog

## 2026-11-21 — Stabilisation, performance and marketing pass
**Fixes**
- The deployed commit still had the every-minute cron in `vercel.json`, so Vercel Hobby deploys failed and the cron routes returned 404. `vercel.json` now has daily crons only; reminders run through Supabase pg_cron (migrations 202611180002 and 202611180003).
- Removed the stale root `middleware.ts`. `src/middleware.ts` is the only middleware.
- **Mobile layout:** the homepage intro headline and the room, venue, facility and experience grids pushed phone pages to 419–502px wide. Phones zoomed the page out and the layout jumped (CLS 0.14). Every public page now fits the screen exactly. Desktop and tablet are unchanged.
- Payment links, canonical URLs, the sitemap and robots.txt no longer use `http://localhost:3000` when `NEXT_PUBLIC_SITE_URL` is unset or local on Vercel; they fall back to the Vercel production domain.
- The `G-XXXXXXXXXX` placeholder GA ID no longer loads Google Analytics.
- Admin Settings and Integrations now flag a free-mailbox `EMAIL_FROM` (Gmail etc.), a placeholder GA ID and a missing Google review link.
- Guest email addresses are masked in server logs.
- Security: overrode the nested PostCSS version (`npm audit`: 0 vulnerabilities). Added an HSTS header.

**Performance (no visual change)**
- Guestbook animations use framer-motion `LazyMotion` with `domAnimation`: homepage JS is 46.3 kB → 35.6 kB.
- Inlined the stylesheet (`experimental.inlineCss`), which removes the render-blocking CSS request. Added `optimizePackageImports` for framer-motion and date-fns.
- Below-the-fold homepage sections use `content-visibility:auto`.
- The consent banner is server-rendered, so it no longer paints late as the page's LCP element. Returning visitors are hidden before paint.
- The brand splash plays once per browser session instead of on every page load or refresh.
- Local mobile Lighthouse on the homepage: performance 87 → 91–95, CLS 0, SEO 92 → 100 on all public pages.

**SEO, accessibility, marketing**
- Guestbook profile cards render as text, not as crawlable-anchor failures (`<a>` without `href`), until their URLs are set. Links use `rel="noopener noreferrer"`.
- Consent banner is no longer an `<aside role="dialog">`. The logo link's accessible name now matches its visible text.
- New consent-gated **Meta Pixel** (`NEXT_PUBLIC_META_PIXEL_ID`):
  - PageView
  - Lead on stay and event enquiries
  - InitiateCheckout and AddPaymentInfo on payment
- GBP Level 1 post-stay Google review requests are included (migration 202611180003).

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
