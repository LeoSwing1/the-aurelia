import { NextRequest, NextResponse } from "next/server";
import { eventSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendHotelEmail, sendHotelWhatsAppAlert, sendGuestEmail, escapeHtml } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = eventSchema.parse(await request.json());
    const db = createAdminClient();
    const { data, error } = await db.from("event_enquiries").insert({
      guest_name: payload.name, guest_email: payload.email, guest_phone: payload.phone,
      event_type: payload.eventType, event_date: payload.eventDate, guest_count: payload.guests,
      preferred_venue: payload.venue, message: payload.message, status: "NEW",
    }).select("id").single();
    if (error) throw error;
    try {
      await sendHotelEmail("New event enquiry", `<h2>New ${escapeHtml(payload.eventType)} enquiry</h2><p>${escapeHtml(payload.name)} · ${escapeHtml(payload.email)} · ${escapeHtml(payload.phone)}</p><p>Date: ${escapeHtml(payload.eventDate)} · Guests: ${payload.guests} · Venue: ${escapeHtml(payload.venue)}</p><p>${escapeHtml(payload.message)}</p>`);
      await sendGuestEmail(payload.email, "We received your Aurelia event enquiry", `<p>Dear ${escapeHtml(payload.name)},</p><p>Thank you for considering The Aurelia for your event. Our team has received your enquiry and will check venue availability before preparing a quotation.</p><p>This enquiry is not a confirmed booking.</p>`);
    } catch (notificationError) { console.error("Event email notification failed", notificationError); }
    try { await sendHotelWhatsAppAlert(`New ${payload.eventType} enquiry: ${payload.name}, ${payload.eventDate}, ${payload.guests} guests.`); }
    catch (notificationError) { console.error("Event WhatsApp notification failed", notificationError); }
    return NextResponse.json({ ok: true, enquiryId: data.id, message: "Your event enquiry has been received. The events team will contact you." }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit event enquiry.";
    const status = message.includes("Supabase is not configured") ? 503 : 400;
    return NextResponse.json({ ok: false, error: status === 503 ? "Online enquiries are not activated yet. Please contact the hotel." : message }, { status });
  }
}
