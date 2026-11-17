# Brevo transactional email setup — The Aurelia

## What is connected in the application

The existing central email service (`src/lib/notifications.ts`) sends through Brevo when `BREVO_API_KEY` is present. The existing reservation, event, contact and Razorpay payment workflows continue calling the same `sendHotelEmail` / `sendGuestEmail` functions. No database migration is required.

Brevo is the primary provider. The existing Resend adapter remains as a fallback only when Brevo is not configured.

## Required environment variables

Set these in Vercel Project → Settings → Environment Variables (Production, and Preview if you want preview testing):

- `BREVO_API_KEY` — Brevo API key; keep server-side, never prefix with `NEXT_PUBLIC_`.
- `EMAIL_FROM` — verified sender address in Brevo, e.g. `reservations@your-verified-domain`.
- `EMAIL_FROM_NAME` — `The Aurelia Hotel & Resort`.
- `HOTEL_NOTIFICATION_EMAIL` — hotel's inbox that receives new enquiries and operational alerts.

Do not paste API keys into chat, source files, GitHub, screenshots or browser code.

## Brevo account setup

1. In Brevo, open Settings → Senders, Domains & Dedicated IPs (wording may vary).
2. Add the hotel's sending domain and follow Brevo's DNS instructions.
3. Add the sender name `The Aurelia Hotel & Resort` and the sender address you control.
4. Verify the sender and complete domain authentication. Add the SPF/DKIM records Brevo provides at the domain's DNS host. Do not guess or replace existing DNS records; coordinate with whoever manages the domain.
5. Open SMTP & API → API Keys and generate a key named `The Aurelia Production`.
6. Copy it directly into Vercel as `BREVO_API_KEY`. Never use the SMTP key in this API integration.
7. Add `EMAIL_FROM`, `EMAIL_FROM_NAME`, and `HOTEL_NOTIFICATION_EMAIL`.
8. Save the variables and redeploy the Vercel project so the server runtime receives them.

## Test safely

1. First test the contact form with an address you control.
2. Confirm the guest acknowledgement arrives.
3. Confirm `HOTEL_NOTIFICATION_EMAIL` receives the hotel alert.
4. Submit a test event enquiry and a room request only after confirming the first test.
5. Check Brevo → Transactional → Email → Logs for accepted, delivered, bounced or blocked status.
6. Check Vercel Function Logs if the application reports an email provider error.

A successful API response means Brevo accepted the message; it does not by itself guarantee inbox delivery. Check Brevo delivery logs and spam folders.

## Current email triggers

- Contact form: hotel notification + guest acknowledgement.
- Room reservation request: hotel notification + guest acknowledgement.
- Event enquiry: hotel notification + guest acknowledgement.
- Razorpay captured payment: guest confirmation + hotel alert.
- Payment needing manual review: hotel alert.

The transactional email adapter does not add guests to marketing lists or send newsletters. Promotional campaigns must use a separate opt-in process and respect the recorded marketing consent.

## Important

No Brevo API key or sender address is included in this ZIP. The integration is code-ready but cannot send live email until the Vercel environment variables are supplied and the sender is verified in Brevo.
