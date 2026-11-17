import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { sendGuestEmail, sendHotelEmail, escapeHtml } from "@/lib/notifications";
import { paymentConfirmedEmail, hotelNoticeEmail } from "@/lib/email-templates";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!env.razorpayWebhookSecret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";
  const expected = createHmac("sha256", env.razorpayWebhookSecret).update(raw).digest("hex");
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  const event = JSON.parse(raw);
  if (event.event === "payment.captured") {
    const payment = event.payload?.payment?.entity;
    if (payment?.order_id && payment?.id) {
      const db = createAdminClient();
      const { data: tx, error } = await db.from("payment_transactions")
        .select("id,reservation_id,amount,currency,status,provider_payment_id")
        .eq("provider_order_id", payment.order_id).maybeSingle();
      if (error || !tx) return NextResponse.json({ error: "Payment order not recognised." }, { status: 404 });

      const amount = Number(payment.amount) / 100;
      const currency = String(payment.currency || "").toUpperCase();
      if (!Number.isFinite(amount) || amount <= 0 || !currency) {
        return NextResponse.json({ error: "Captured payment amount or currency is invalid." }, { status: 400 });
      }

      const { data: reconciliation, error: paidError } = await db.rpc("mark_reservation_paid_v2", {
        p_provider_order_id: payment.order_id,
        p_provider_payment_id: payment.id,
        p_amount: amount,
        p_currency: currency,
        p_raw_event: event,
      });
      if (paidError) throw paidError;

      // Duplicate webhook deliveries are acknowledged but never resend customer messages.
      if (reconciliation?.result === "DUPLICATE") return NextResponse.json({ received: true, duplicate: true });

      const { data: reservation } = await db.from("reservations")
        .select("booking_reference,guests(full_name,email)").eq("id", tx.reservation_id).single();
      if (reconciliation?.result !== "CONFIRMED") {
        try {
          await sendHotelEmail(
            "Aurelia payment requires manual review",
            `<p>Payment for reservation ${escapeHtml(reservation?.booking_reference || tx.reservation_id)} was captured but was not auto-confirmed.</p><p>Review result: ${escapeHtml(String(reconciliation?.result || "UNKNOWN"))}</p><p>Razorpay order: ${escapeHtml(payment.order_id)} · payment: ${escapeHtml(payment.id)}</p>`
          );
        } catch (mailError) { console.error("Payment review alert failed", mailError); }
        return NextResponse.json({ received: true, reviewRequired: true });
      }

      const guest = Array.isArray(reservation?.guests) ? reservation?.guests[0] : reservation?.guests;
      if (guest?.email) {
        try {
          await sendGuestEmail(
            guest.email,
            "Your Aurelia reservation is confirmed",
            paymentConfirmedEmail({
              guestName: guest.full_name || "Guest",
              reference: reservation?.booking_reference || tx.reservation_id,
              amount,
              currency,
              paymentId: payment.id,
            })
          );
        } catch (mailError) { console.error("Guest payment confirmation email failed", mailError); }
      }
      try {
        await sendHotelEmail(
          "Aurelia reservation payment captured",
          hotelNoticeEmail({
            title: "Payment successfully verified",
            intro: "A reservation payment was captured and the signed webhook confirmed the booking.",
            rows: [
              ["Reservation", reservation?.booking_reference || tx.reservation_id],
              ["Amount", `${currency} ${amount.toLocaleString("en-IN")}`],
              ["Payment ID", payment.id],
              ["Status", "Confirmed"],
            ],
          })
        );
      } catch (mailError) { console.error("Hotel payment alert email failed", mailError); }
    }
  } else if (event.event === "payment.failed") {
    const payment = event.payload?.payment?.entity;
    if (payment?.order_id) {
      const db=createAdminClient();
      await db.from("payment_transactions").update({status:"FAILED",provider_payment_id:payment.id||null,raw_event:event}).eq("provider_order_id",payment.order_id).neq("status","CAPTURED");
    }
  }
  return NextResponse.json({ received: true });
}
