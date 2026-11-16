import { NextRequest, NextResponse } from "next/server";
import { reservationSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendHotelEmail, sendHotelWhatsAppAlert, sendGuestEmail, sendWhatsAppText, sendGuestSMS, escapeHtml } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = reservationSchema.parse(await request.json());
    const db = createAdminClient();
    const { data, error } = await db.rpc("create_reservation_request", {
      p_guest_name: payload.name,
      p_guest_email: payload.email,
      p_guest_phone: payload.phone,
      p_room_type_code: payload.roomType,
      p_check_in: payload.checkIn,
      p_check_out: payload.checkOut,
      p_adults: payload.adults,
      p_children: payload.children,
      p_room_quantity: payload.rooms,
      p_special_requests: payload.message,
    });
    if (error) throw error;
    const { error: consentError } = await db.from("reservations").update({
      transactional_contact_consent: payload.transactionalConsent,
      email_marketing_consent: payload.emailMarketingConsent,
      whatsapp_marketing_consent: payload.whatsappMarketingConsent,
      sms_marketing_consent: payload.smsMarketingConsent,
      marketing_consent_recorded_at: new Date().toISOString(),
      marketing_consent_source: "WEBSITE_BOOKING_FORM",
    }).eq("id", data.id);
    if (consentError) throw consentError;
    try {
      await sendHotelEmail("New room reservation request", `<h2>New reservation request</h2><p>Reference: ${escapeHtml(data.booking_reference)}</p><p>${escapeHtml(payload.name)} · ${escapeHtml(payload.email)} · ${escapeHtml(payload.phone)}</p><p>${escapeHtml(payload.checkIn)} to ${escapeHtml(payload.checkOut)} · ${escapeHtml(payload.roomType)} · ${payload.rooms} room(s)</p>`);
      await sendGuestEmail(payload.email, "We received your Aurelia stay request", `<p>Dear ${escapeHtml(payload.name)},</p><p>Thank you for contacting The Aurelia Hotel & Resort. We have received your room request.</p><p>Your reference is <strong>${escapeHtml(data.booking_reference)}</strong>.</p><p>This is a request, not a confirmed reservation. Our team will review availability and contact you. If approved, full payment is due within 24 hours.</p>`);
    } catch (notificationError) {
      console.error("Reservation email notification failed", notificationError);
    }
    try { await sendHotelWhatsAppAlert(`New room request ${data.booking_reference}: ${payload.name}, ${payload.checkIn} to ${payload.checkOut}, ${payload.rooms} ${payload.roomType} room(s).`); }
    catch (notificationError) { console.error("Reservation WhatsApp notification failed", notificationError); }
    const guestUpdate = `The Aurelia: We received your stay request ${data.booking_reference} for ${payload.checkIn} to ${payload.checkOut}. This is not yet a confirmed booking. Our team will review it and contact you.`;
    if (payload.whatsappMarketingConsent || payload.transactionalConsent) {
      try { await sendWhatsAppText(payload.phone.replace(/[^0-9]/g, ""), guestUpdate); }
      catch (notificationError) { console.error("Guest WhatsApp update failed", notificationError); }
    }
    if (payload.transactionalConsent) {
      try { await sendGuestSMS(payload.phone, guestUpdate); }
      catch (notificationError) { console.error("Guest SMS update failed", notificationError); }
    }
    return NextResponse.json({ ok: true, id: data.id, reference: data.booking_reference, status: "PENDING_APPROVAL", message: "Your request has been received. The hotel will review availability and contact you." }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit reservation.";
    const status = message.includes("Supabase is not configured") ? 503 : 400;
    return NextResponse.json({ ok: false, error: status === 503 ? "Online reservations are not activated yet. Please contact the hotel." : message }, { status });
  }
}
