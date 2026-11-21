# The Aurelia: Complete Deployment, Integrations and SEO Guide

Stack: Next.js 15.5 App Router (React 19), Supabase (Postgres, Auth, Storage, pg_cron), Vercel hosting. Production URL in `.env.example`: `https://theaurelia-nine.vercel.app`.
Last updated: 18 Nov 2026. This guide replaces the scattered notes in the other `*.md` files. Those files are still valid for deeper detail.

---

## 1. Summary of the 18 Nov 2026 changes

### 1.1 Cron 404: root cause and fix

**Symptom:** `/api/cron/scheduled-reminders` (and possibly other new routes) returns 404 in production.

**Root cause:** `vercel.json` contained `"* * * * *"` for `scheduled-reminders`. On the Vercel Hobby plan, any cron that runs more than once a day makes the deployment fail with *"Hobby accounts are limited to daily cron jobs."* Production keeps serving the last successful build, and that build does not contain the scheduler routes. Hence the 404.

**Evidence:**
- The code builds cleanly. Both cron routes appear in the build output.
- Locally the routes answer `401` without the token, and run when the bearer token is supplied.
- The project had already moved `expire-holds` to daily for Hobby compatibility (`INTEGRATIONS-AND-SETUP.md`).

**What the 404 is not:**
- A missing migration gives `500 Unable to fetch due reminders`.
- A wrong `CRON_SECRET` gives `401`.

**Fix:**
- `vercel.json` now has only daily crons:
  - `expire-holds` at 00:00 UTC (05:30 IST)
  - `scheduled-reminders` at 00:30 UTC (06:00 IST), as a daily safety net
- The every-minute reminder trigger now comes from Supabase `pg_cron` + `pg_net`, set up in `supabase/migrations/202611180002_scheduler_pg_cron_trigger.sql`. The secret is kept in Supabase Vault.
- **On Vercel Pro instead:** set the `scheduled-reminders` schedule back to `* * * * *` and unschedule the Supabase job. Never run both.

### 1.2 Middleware was never running (fixed)

`middleware.ts` sat in the project root, but the app uses `src/`. Next.js only loads `src/middleware.ts` in that layout, so the build had an empty middleware manifest and Supabase session cookies were never refreshed.

- **Fix:** the file moved to `src/middleware.ts`.
- **Excluded from the matcher:** `/api/cron`, the Razorpay webhook, and the generated SEO assets (icon, OG image, manifest, robots, sitemap).
- **Impact:** one extra Supabase `auth.getUser()` call per page request. This is the intended design, now actually active.

### 1.3 SEO metadata (added)

- `src/lib/seo.ts` adds a `pageMetadata()` helper. Every public page now has:
  - a canonical URL
  - its own `og:title`, `og:description`, `og:url` and `og:image`
  - Twitter card tags
  - keywords
  - robots directives
- **noindex:** `/pay`, `/staff-login`, `/reservation-status` (new `layout.tsx`) and the whole `/admin` area. `/pay` is also added to `robots.txt`.
- **Generated assets:**
  - `/opengraph-image` and `/twitter-image`: 1200×630 brand card
  - `/icon` (512) and `/apple-icon` (180)
  - `/manifest.webmanifest`
- **Root layout:**
  - authors, creator, publisher, referrer and formatDetection
  - Apple web-app tags and `colorScheme`
  - Google + Bing verification
  - JSON-LD `@graph` with `Hotel` (amenities, logo, image, sameAs, plus address/phone/email only from verified env vars) and `WebSite`
  - JSON-LD is escaped against `</script>` injection
- **Sitemap:** now includes `lastmod` and per-page priorities. Noindex pages are excluded.

### 1.4 GA4 conversion tracking (added)

`src/lib/analytics.ts` adds `trackEvent()`. It only fires after the visitor accepts analytics, and it never sends personal data.

| Event | Fired when | Parameters |
|---|---|---|
| `generate_lead` | Room reservation request accepted by the API | `lead_type=room_reservation`, `room_type`, `rooms` |
| `generate_lead` | Contact / wedding / banquet enquiry accepted | `lead_type=contact` or `event_enquiry`, `enquiry_kind` |
| `begin_checkout` | Razorpay checkout opens | `currency`, `value` |
| `add_payment_info` | Razorpay checkout handler returns | `currency`, `value`, `payment_type=razorpay` |

`purchase` is deliberately **not** sent from the browser, because payment is only confirmed by the signed webhook. See section 3.9 for server-side purchase tracking.

### 1.5 Small fixes

- The Guestbook flip-book now reads `NEXT_PUBLIC_GOOGLE_REVIEWS_URL`, the same name as the rest of the app. The old `..._REVIEW_URL` still works as a fallback.
- `ADMIN-BOOTSTRAP.md` no longer says the expiry cron is hourly.
- `.env.example` lists every variable the code reads.

**Validation run:** `npm ci`, `tsc --noEmit` (pass), `eslint` (0 errors, 2 old unused-variable warnings), `next build` (pass). A local `next start` check confirmed:
- canonical, OG, Twitter and robots tags on every page
- JSON-LD, `robots.txt`, `sitemap.xml` and the OG image (200, PNG)
- cron routes return `401` without the token

No live provider (Razorpay, Brevo, Meta, Twilio, Google) was contacted.

---

## 2. Environment variables: complete reference

Set these in **Vercel → Project → Settings → Environment Variables**. Keep Production and Preview values separate. Redeploy after any change.

| Variable | Scope | Required | Used by |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public | **Yes** | Canonical URLs, OG URLs, sitemap, robots, JSON-LD. Exact HTTPS production origin, no trailing slash |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | **Yes** | All Supabase clients |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | **Yes** | Browser/SSR client, middleware |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | **Yes** | Admin client (APIs, cron, webhook) |
| `CRON_SECRET` | **Server only** | **Yes** | `/api/cron/*` bearer auth. Must equal the Vault secret `aurelia_cron_secret` |
| `BREVO_API_KEY` | **Server only** | Yes (email) | Primary email provider |
| `EMAIL_FROM` | Server | Yes (email) | Verified sender address |
| `EMAIL_FROM_NAME` | Server | No | Defaults to `The Aurelia Hotel & Resort` |
| `HOTEL_NOTIFICATION_EMAIL` | Server | Yes | Hotel inbox. Defaults to `leovsmgrowth@gmail.com`; set it explicitly |
| `RESEND_API_KEY` | **Server only** | No | Fallback email when Brevo is unset |
| `RAZORPAY_KEY_ID` | Server | Yes (payments) | Order creation; returned to checkout |
| `RAZORPAY_KEY_SECRET` | **Server only** | Yes (payments) | Order creation |
| `RAZORPAY_WEBHOOK_SECRET` | **Server only** | Yes (payments) | Webhook HMAC check |
| `WHATSAPP_PHONE_NUMBER_ID` | Server | No | Meta Cloud API sender |
| `WHATSAPP_ACCESS_TOKEN` | **Server only** | No | Meta Cloud API |
| `WHATSAPP_ALERT_TO` | Server | No | Hotel WhatsApp alert recipient |
| `WHATSAPP_API_VERSION` | Server | No | Default `v22.0` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | **Server only** | No | Guest SMS acknowledgement |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Public | No | GA4 `G-XXXXXXX`, consent-gated. The `G-XXXXXXXXXX` placeholder is ignored |
| `NEXT_PUBLIC_META_PIXEL_ID` | Public | No | Meta Pixel (numeric) for Facebook/Instagram ads, consent-gated. Sends Lead, InitiateCheckout and AddPaymentInfo |
| `GOOGLE_SITE_VERIFICATION` | Server | No | Search Console HTML-tag token |
| `BING_SITE_VERIFICATION` | Server | No | Bing Webmaster `msvalidate.01` token |
| `NEXT_PUBLIC_GOOGLE_BUSINESS_URL` | Public | No | Guestbook + JSON-LD `sameAs` |
| `NEXT_PUBLIC_GOOGLE_REVIEWS_URL` | Public | Recommended | Guestbook review link **and** post-stay review emails (nothing is sent without it) |
| `NEXT_PUBLIC_INSTAGRAM_URL` / `NEXT_PUBLIC_FACEBOOK_URL` | Public | No | Guestbook / `sameAs` |
| `NEXT_PUBLIC_HOTEL_STREET_ADDRESS`, `_CITY`, `_STATE`, `_POSTAL_CODE`, `_PHONE`, `_PUBLIC_EMAIL` | Public | Recommended | JSON-LD Hotel name/address/phone. **Only after management verifies them** |

**Rule:** never put the service-role key, Razorpay secret, webhook secret, Brevo/Resend key, WhatsApp token or Twilio token in a `NEXT_PUBLIC_` variable. Rotate any key that was ever pasted into chat or a screenshot.

---

## 3. Integrations: setup, verification and analysis

Each integration lists what it does in this codebase, how to set it up, how to verify it, and an assessment of its status and risks.

### 3.1 Vercel (hosting + cron)

**What it does:**
- Builds and serves the Next.js app.
- Runs the daily crons in `vercel.json`.
- Security headers come from `next.config.ts`: nosniff, Referrer-Policy, X-Frame-Options and Permissions-Policy.

**Setup:**
1. Import the Git repo. Framework preset: Next.js. Root Directory: the folder that contains `package.json`. If the repo has a `the-aurelia/` subfolder, set it as the Root Directory.
2. Add every variable from section 2 for Production (and Preview with test keys).
3. Settings → Domains: add the custom domain. Set `NEXT_PUBLIC_SITE_URL` to that domain, then redeploy.
4. Deploy, then open **Deployments** and confirm the status is **Ready**, not Error.

**Verify:**
- Settings → Cron Jobs lists 3 jobs.
- This returns `{"ok":true,...}`:
  ```
  curl -i -H "Authorization: Bearer $CRON_SECRET" https://DOMAIN/api/cron/expire-holds
  ```

**Analysis:**
- Hobby is the binding constraint. Any cron more frequent than daily breaks deploys. The Hobby timing window is ±59 min.
- Hobby is for non-commercial use under Vercel's terms. A live hotel taking payments should plan for **Pro**, which also restores native per-minute crons.
- Function logs are short-lived on Hobby. Consider a log drain before launch.

### 3.2 Supabase (database, auth, storage, scheduler)

**What it does:**
- Postgres schema, RPCs and RLS for reservations, payments, events, rooms, notifications and the scheduler.
- Auth is used for staff only. Roles: `SUPER_ADMIN`, `GENERAL_MANAGER`, `RECEPTION`, `EVENT_MANAGER`, `HOUSEKEEPING`, `FINANCE`, `RESTAURANT_STAFF`.
- Storage buckets: public marketing images and private guest documents.
- `pg_cron` + `pg_net` provide the every-minute reminder trigger.

**Setup:**
1. Apply **all** migrations in order in the SQL Editor (or with `supabase db push`):
   1. `202611160001_initial_hotel_platform.sql`
   2. `202611160002_front_desk_pricing.sql`
   3. `202611160003_default_room_rates.sql`
   4. `202611160004_guest_consent_and_analytics.sql`
   5. `202611160005_razorpay_reconciliation.sql`
   6. `202611180001_hotel_operations_scheduler.sql`
   7. `202611180002_scheduler_pg_cron_trigger.sql` (after the Vault secrets below)
   8. `202611180003_google_review_requests.sql` (post-stay review requests; reuses the same Vault secrets)
2. Create the Vault secrets once, then run `002`:
   ```sql
   select vault.create_secret('https://YOUR-PRODUCTION-DOMAIN', 'aurelia_site_url');
   select vault.create_secret('SAME_AS_VERCEL_CRON_SECRET', 'aurelia_cron_secret');
   ```
3. Auth → Providers: email only. **Disable public sign-ups.** Then provision staff as described in `ADMIN-BOOTSTRAP.md`.
4. Auth → URL Configuration: Site URL = production domain. Add the Vercel preview domain to the redirect allow-list.
5. Copy the URL, publishable key and service-role key into Vercel.

**Verify:**
```sql
select to_regclass('public.hotel_schedule_reminders');            -- not null
select jobname, schedule from cron.job;                           -- aurelia-scheduled-reminders, * * * * *
select status, return_message from cron.job_run_details order by start_time desc limit 5;
select status_code, content from net._http_response order by created desc limit 5;   -- 200
```

**Analysis:**
- The architecture is sound: all writes go through server APIs using the service role, and the scheduler tables revoke `anon` and `authenticated`.
- **Risk 1:** a reminder stuck in `PROCESSING` (for example after a function timeout) is never retried. A future fix is a sweep that resets `PROCESSING` rows older than 10 minutes.
- **Risk 2:** if the Vault URL points at a protected Preview deployment, the calls get 401. Always use the production domain.
- `net._http_response` keeps only about 6 hours of history. That is fine for monitoring.
- Free-tier projects pause after a week of inactivity. Use a paid plan for production.

### 3.3 Brevo (primary transactional email)

**What it does:** `src/lib/notifications.ts` sends HTML and plain-text email through `api.brevo.com/v3/smtp/email` whenever `BREVO_API_KEY` is set.

**Triggers:**
- contact form
- reservation request
- event enquiry
- Razorpay captured payment
- payment needing manual review
- scheduler reminders

**Setup:**
1. Brevo → Senders & Domains: add the hotel domain and publish the SPF, DKIM and DMARC records it gives you.
2. Verify the sender address.
3. SMTP & API → create an **API key** (not the SMTP key) and put it in Vercel.
4. Set `EMAIL_FROM`, `EMAIL_FROM_NAME` and `HOTEL_NOTIFICATION_EMAIL`, then redeploy.

**Verify:**
- Submit the contact form with your own address.
- Check Brevo → Transactional → Logs.
- Create a schedule 3 minutes ahead and confirm the reminder arrives.

**Analysis:**
- Good: plain-text fallback, HTML escaping and error logging.
- Deliverability depends entirely on domain authentication. A Gmail `EMAIL_FROM` will be rejected or land in spam.
- The free tier allows about 300 emails/day. That is enough at the start; watch it during wedding season.

### 3.4 Resend (fallback email)

Used only if `BREVO_API_KEY` is empty. If you keep it, verify the domain in Resend as well. Otherwise leave `RESEND_API_KEY` blank.

**Analysis:** having two providers adds config surface but no automatic failover. It is either/or at runtime.

### 3.5 Razorpay (payments)

**What it does:**
- `POST /api/payments/create-order` creates an order for an approved reservation that is inside its 24-hour hold.
- `payment-form.tsx` loads `checkout.razorpay.com/v1/checkout.js`.
- `POST /api/payments/razorpay-webhook` verifies `x-razorpay-signature` with HMAC-SHA256 and a timing-safe compare.
  - `payment.captured` calls `mark_reservation_paid_v2`, which reconciles amount and currency, deduplicates, and flags late or mismatched payments for manual review.
  - `payment.failed` marks the transaction `FAILED`.

**Setup:**
1. Dashboard → **Test mode** → API Keys. Put the key ID and secret in Vercel Preview.
2. Webhooks → add `https://DOMAIN/api/payments/razorpay-webhook`. Events: `payment.captured`, `payment.failed`. Set a secret and use the same value for `RAZORPAY_WEBHOOK_SECRET`.
3. Run the end-to-end test: request → approve → pay with a test card or UPI → webhook → confirmation email.
4. After KYC and finance sign-off, repeat with **Live** keys and a live webhook in Production.

**Verify:**
- Webhook delivery log shows 200.
- `payment_transactions.status = 'CAPTURED'`.
- The reservation is confirmed and the guest receives the email.

**Analysis:**
- The integration is strong: it is server-authoritative and idempotent.
- **Gaps:** refunds are manual. There is no client-side signature verification, which is fine because the webhook is the source of truth.
- If the webhook URL changes (for example a domain switch), payments stay `PENDING`. Re-point the webhook whenever the domain changes.

### 3.6 Meta WhatsApp Cloud API

**What it does:**
- `sendHotelWhatsAppAlert` alerts the hotel on new reservations, event enquiries and approvals.
- `sendWhatsAppText` sends a guest acknowledgement, only when essential-contact consent is ticked.

**Setup:**
1. In Meta Business Manager, create a WhatsApp Business account and add the phone number.
2. Create a System User with a **permanent** access token.
3. Set the phone number ID, token and alert recipient in Vercel.

**Analysis:**
- Free-form text only works inside the 24-hour customer-service window. Business-initiated messages to guests need **approved templates**. The current adapter sends plain text, so guest acknowledgements will fail outside that window.
- Next step: add template support before relying on it.
- Hotel alerts to your own number work once that number has messaged the business number.

### 3.7 Twilio SMS

**What it does:** `sendGuestSMS` sends a guest acknowledgement after a reservation request, only with consent.

**Setup:**
1. Buy a number, or use a sender ID approved for India.
2. Set the account SID, auth token and from-number in Vercel.

**Analysis:** India requires **DLT registration** (entity plus template) for commercial SMS. Without it, delivery to Indian numbers will fail. Either complete DLT or leave Twilio unset and rely on email.

### 3.8 Google Search Console + Bing Webmaster Tools

**What it does:** verification meta tags come from env vars. `sitemap.xml` and `robots.txt` are generated.

**Setup:**
1. In Search Console, add a URL-prefix property for the production domain (or a Domain property via DNS).
2. Choose the HTML tag method and copy only the `content` value into `GOOGLE_SITE_VERIFICATION`. Redeploy, then click Verify.
3. Submit `https://DOMAIN/sitemap.xml`.
4. In Bing Webmaster, import from Search Console, or use the meta tag with `BING_SITE_VERIFICATION`.

**Verify:**
- URL Inspection on `/`, `/rooms` and `/weddings` shows them indexable with the correct canonical.
- Use the Rich Results Test on `/` to confirm the `Hotel` structured data.

**Analysis:** indexing will be weak until the **verified address, phone and real photography** are live. The JSON-LD and the Google Business Profile need matching name, address and phone (NAP) for local ranking.

### 3.9 Google Analytics 4

**What it does:**
- Loaded by `analytics-consent.tsx` only after the visitor clicks **Accept analytics**, with `anonymize_ip`.
- Conversion events are listed in section 1.4.

**Setup:**
1. GA4 → Admin → Data streams → Web → copy the Measurement ID into `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
2. Admin → Events: mark `generate_lead` and `begin_checkout` as **Key events**.
3. Create custom dimensions `lead_type`, `enquiry_kind` and `room_type` (event scope) to break down leads.
4. Link Search Console to GA4 (Admin → Product links).

**Verify:** use DebugView or Realtime, accept the banner, submit a test enquiry, and confirm `generate_lead` appears.

**Analysis:**
- Consent-first loading means GA will under-count visitors who reject or ignore the banner. That is expected and correct.
- For true revenue attribution, send a server-side `purchase` from the Razorpay webhook through the GA4 Measurement Protocol (needs an API secret). This is recommended as the next enhancement.

### 3.10 Google Business Profile, Reviews, Instagram, Facebook

**What it does:** the homepage Guestbook links and JSON-LD `sameAs` are populated from env vars. Without them the cards show as "unavailable". No fake reviews are ever shown.

**Setup:** claim or verify the Google Business Profile, copy the profile URL and the "Ask for reviews" link, then set the env vars.

**Analysis:** this is the strongest local-SEO lever for a hotel. Use the same NAP everywhere, upload real photos, and keep a review request flow (the review link in the post-stay email).

### 3.11 Images (Unsplash via next/image)

**What it does:** `next.config.ts` allows `images.unsplash.com` and serves AVIF/WebP with a 30-day cache.

**Analysis:** these are **temporary placeholders** and the pages say so. Replace them with real hotel photos (Supabase `hotel-gallery` bucket, or `/public`) before launch. Real photos are critical for trust, conversion and image search.

### 3.12 Google Business Profile, Level 1: post-stay review requests (added 18 Nov 2026)

**What it does:**
- When the front desk marks a stay **CHECKED_OUT**, a database trigger queues one review request for that guest, 3 hours after check-out.
- This only happens if the guest gave essential-contact consent on the booking form.
- `/api/cron/review-requests` sends a branded email with a **Write a Google review** button pointing to `NEXT_PUBLIC_GOOGLE_REVIEWS_URL`.
- Supabase `pg_cron` runs it every 15 minutes, and Vercel runs it once a day as a safety net.
- Admin → Reservations shows the review status on each checked-out row (queued / sent / failed). Reception and managers can **Send now** or **Resend**.
- Guest replies go to `HOTEL_NOTIFICATION_EMAIL` (reply-to), so feedback reaches the hotel instead of a no-reply sender.
- GA4 records guestbook profile clicks as `select_content` (`item_id`: `google_review`, `google_business_profile`, `instagram`).

**Setup:**
1. In Google Business Profile → **Ask for reviews**, copy the review link (`https://g.page/r/.../review`) into `NEXT_PUBLIC_GOOGLE_REVIEWS_URL`, then redeploy.
2. Run `supabase/migrations/202611180003_google_review_requests.sql`, after 202611180002, because it reuses the same Vault secrets.
3. Confirm the job with `select jobname, schedule from cron.job;`. You should see `aurelia-review-requests`, `*/15 * * * *`.

**Verify:**
1. Check out a test stay that uses your own email.
2. Click **Send review request now**. The email should arrive, and the row should show *Sent*.
3. Run `select status, sent_at, last_error from guest_review_requests order by created_at desc limit 5;`.

**Policy and analysis:**
- Google forbids *review gating*, which means asking only happy guests. This flow sends the same request to every checked-out guest, with no incentive. Keep it that way.
- Without the review link, nothing is sent and the queue waits. With it, expect a steady stream of genuine reviews. Review count and recency are among the strongest local ranking signals for hotels.
- **Next levels:**
  - Level 2: Business Profile API, with reviews inside the admin panel and staff replies. Needs Google API access approval.
  - Level 3: Hotel Center free booking links. Needs a live rate and availability feed.

---

## 4. SEO metadata: what every page now emits

| Page | Indexed | Title | Canonical | OG/Twitter image |
|---|---|---|---|---|
| `/` | Yes | The Aurelia \| Hotel & Resort | `/` | Brand card |
| `/rooms` | Yes | Rooms & Accommodation \| The Aurelia Hotel & Resort | `/rooms` | Brand card |
| `/book` | Yes | Reserve a Stay \| … | `/book` | Brand card |
| `/weddings` | Yes | Weddings & Celebrations \| … | `/weddings` | Brand card |
| `/venues` | Yes | Banquets, Meetings & Event Venues \| … | `/venues` | Brand card |
| `/facilities` | Yes | Facilities & Guest Experiences \| … | `/facilities` | Brand card |
| `/contact` | Yes | Contact The Aurelia \| … | `/contact` | Brand card |
| `/pay`, `/reservation-status`, `/staff-login`, `/admin/*` | **No** (noindex, nofollow) | — | — | — |

**Tags emitted:**
- `<title>`, `description` and `keywords`
- `canonical` and `robots` / `googlebot` (max-image-preview: large)
- `og:type`, `og:locale` (en_IN), `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image` (+ width, height, alt, type)
- `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`, `twitter:image`
- `theme-color`, `color-scheme`, `apple-mobile-web-app-*`, `icon`, `apple-touch-icon` and `manifest`
- Google/Bing verification
- JSON-LD `Hotel` and `WebSite`

**Next SEO steps, by impact:**
1. Publish the verified address, phone and map, and fill in the `NEXT_PUBLIC_HOTEL_*` vars.
2. Replace the placeholder images with real photography that has descriptive alt text.
3. Add the city or locality to titles and descriptions once confirmed (e.g. "Wedding venue in [City]").
4. Add a per-page `BreadcrumbList` and an `FAQPage` on weddings/venues.
5. Once there are real photos, create page-specific OG images for rooms, weddings and venues.

---

## 5. Production deployment checklist (do in this order)

1. **Supabase:** apply migrations 001–005 and 20261118-0001. Disable public sign-up. Bootstrap the Super Admin.
2. **Vercel:** set all required env vars (section 2). The `NEXT_PUBLIC_SITE_URL` must be the final domain.
3. **Domain:** add it in Vercel and set DNS. Set the Supabase Auth Site URL to the same domain.
4. **Deploy** and confirm Deployments shows **Ready**. If it shows Error, read the build log first.
5. **Vault + pg_cron:** create the two secrets, run `202611180002` and then `202611180003`. Confirm `net._http_response` shows 200.
6. **Cron smoke test:** `curl` both `/api/cron/*` endpoints with the bearer token and expect `{"ok":true}`.
7. **Email:** verify the Brevo domain, then test the contact form, a reservation request and a 3-minute scheduler reminder.
8. **Razorpay (test mode):** request → approve → pay → webhook 200 → confirmation email. Then switch to live after sign-off.
9. **WhatsApp/SMS:** only after template approval (Meta) and DLT registration (India SMS). Otherwise leave them unset.
10. **SEO:** verify Search Console and Bing, submit the sitemap, run the Rich Results Test on `/`, and inspect `/rooms`.
11. **GA4:** set the ID, mark key events and test in DebugView.
12. **Quality:** run `npm run check` locally and Lighthouse on production. Test on a real mobile device.
13. **Security review:** check RLS with the policy tester, confirm no secrets in `NEXT_PUBLIC_*`, and add rate limiting / bot protection (e.g. Vercel Firewall or Cloudflare Turnstile) on `/api/reservations`, `/api/contact` and `/api/events`.

---

## 6. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| `/api/cron/*` returns 404 | Latest deploy failed; old build is live | Vercel → Deployments → error message |
| Cron returns 401 | `CRON_SECRET` mismatch (Vercel vs Vault), or Preview protection | Compare secrets; use the production domain |
| Cron returns 500 "Unable to fetch due reminders" | Scheduler migration not applied | `select to_regclass('public.hotel_schedule_reminders')` |
| Reminder never sent, row stays `PENDING` | pg_cron job missing, or Vault URL wrong | `cron.job`, `net._http_response` |
| Reminder row `FAILED` | Brevo rejected the email (sender unverified) | `last_error` column, Brevo logs |
| Reservation not confirmed after payment | Webhook URL or secret wrong | Razorpay webhook delivery log |
| Staff logged out randomly | (Fixed) middleware not running | Build output shows `ƒ Middleware` |
| Page not in Google | noindex page, or not yet crawled | URL Inspection in Search Console |
