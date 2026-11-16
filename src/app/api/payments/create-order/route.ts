import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { z } from "zod";

const schema = z.object({ bookingReference: z.string().min(6).max(40), email: z.email().max(254) });
export async function POST(request: NextRequest) {
  try {
    if (!env.razorpayKeyId || !env.razorpayKeySecret) return NextResponse.json({ error: "Payment gateway is not configured." }, { status: 503 });
    const { bookingReference, email } = schema.parse(await request.json());
    const db = createAdminClient();
    const { data: reservation, error } = await db.from("reservations")
      .select("id,booking_reference,total_amount,payment_status,status,currency,payment_expires_at,guests!inner(email)")
      .eq("booking_reference", bookingReference.trim().toUpperCase()).ilike("guests.email", email.trim()).single();
    if (error || !reservation) return NextResponse.json({ error: "Reservation reference or email was not recognised." }, { status: 404 });
    if (!["AWAITING_PAYMENT"].includes(reservation.status) || reservation.payment_status === "PAID" || !reservation.payment_expires_at || new Date(reservation.payment_expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "This reservation is not currently eligible for payment. It may still be awaiting approval or its payment window may have expired." }, { status: 409 });
    const amount = Math.round(Number(reservation.total_amount) * 100);
    if (!Number.isFinite(amount) || amount < 100) return NextResponse.json({ error: "Reservation amount is not configured correctly." }, { status: 400 });
    const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount, currency: reservation.currency || "INR", receipt: reservation.booking_reference, notes: { reservation_id: reservation.id } }) });
    const order = await response.json();
    if (!response.ok) return NextResponse.json({ error: "Payment order could not be created." }, { status: 502 });
    const { error: insertError } = await db.from("payment_transactions").insert({ reservation_id: reservation.id, provider: "razorpay", provider_order_id: order.id, amount: amount / 100, currency: order.currency, status: "CREATED" });
    if (insertError) throw insertError;
    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: env.razorpayKeyId, reservationReference: reservation.booking_reference, reservationId: reservation.id });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Payment setup failed." }, { status: 400 }); }
}
