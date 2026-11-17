
import { NextRequest, NextResponse } from "next/server";
import { reservationSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { reservationReceivedEmail, hotelNoticeEmail } from "@/lib/email-templates";

import {
  sendHotelEmail,
  sendHotelWhatsAppAlert,
  sendGuestEmail,
  sendWhatsAppText,
  sendGuestSMS,
} from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate reservation request
    const payload = reservationSchema.parse(
      await request.json()
    );

    // 2. Create Supabase admin client
    const db = createAdminClient();

    // 3. Create reservation request
    const { data, error } = await db.rpc(
      "create_reservation_request",
      {
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
      }
    );

    if (error) {
      console.error(
        "AURELIA_RESERVATION_CREATION_FAILED",
        error
      );

      throw error;
    }

    if (!data?.id || !data?.booking_reference) {
      throw new Error(
        "Reservation was created without a valid booking reference."
      );
    }

    const bookingReference = data.booking_reference;

    // 4. Save consent preferences
    const { error: consentError } = await db
      .from("reservations")
      .update({
        transactional_contact_consent:
          payload.transactionalConsent,

        email_marketing_consent:
          payload.emailMarketingConsent,

        whatsapp_marketing_consent:
          payload.whatsappMarketingConsent,

        sms_marketing_consent:
          payload.smsMarketingConsent,

        marketing_consent_recorded_at:
          new Date().toISOString(),

        marketing_consent_source:
          "WEBSITE_BOOKING_FORM",
      })
      .eq("id", data.id);

    if (consentError) {
      console.error(
        "AURELIA_CONSENT_UPDATE_FAILED",
        bookingReference,
        consentError
      );

      throw consentError;
    }

    // 5. Prepare hotel notification email
    const hotelEmailHtml = hotelNoticeEmail({
      title: "New reservation request",
      intro: "A new room reservation request has been submitted and is awaiting review.",
      rows: [
        ["Reference", bookingReference],
        ["Guest", payload.name],
        ["Email", payload.email],
        ["Phone", payload.phone],
        ["Check-in", payload.checkIn],
        ["Check-out", payload.checkOut],
        ["Room category", payload.roomType],
        ["Rooms", String(payload.rooms)],
        ["Adults", String(payload.adults)],
        ["Children", String(payload.children)],
        ["Special requests", payload.message || "None"],
        ["Status", "Pending approval"],
      ],
    });

    // 6. Send hotel email independently
    try {
      const hotelResult = await sendHotelEmail(
        "New room reservation request",
        hotelEmailHtml
      );

      console.info("AURELIA_HOTEL_EMAIL_RESULT", {
        reference: bookingReference,
        recipient: "hotel notification address",
        result: hotelResult,
      });
    } catch (notificationError) {
      console.error(
        "AURELIA_HOTEL_EMAIL_FAILED",
        bookingReference,
        notificationError
      );
    }

    // 7. Prepare guest confirmation email
    const guestEmailHtml = reservationReceivedEmail({
      guestName: payload.name,
      reference: bookingReference,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      roomType: payload.roomType,
      rooms: payload.rooms,
      adults: payload.adults,
      children: payload.children,
    });

    // 8. Send guest email independently
    try {
      const guestResult = await sendGuestEmail(
        payload.email,
        "We received your Aurelia stay request",
        guestEmailHtml
      );

      console.info("AURELIA_GUEST_EMAIL_RESULT", {
        reference: bookingReference,
        recipient: payload.email,
        result: guestResult,
      });
    } catch (notificationError) {
      console.error(
        "AURELIA_GUEST_EMAIL_FAILED",
        bookingReference,
        notificationError
      );
    }

    // 9. Hotel WhatsApp notification
    try {
      const hotelWhatsAppResult =
        await sendHotelWhatsAppAlert(
          `New room request ${bookingReference}: ${payload.name}, ${payload.checkIn} to ${payload.checkOut}, ${payload.rooms} ${payload.roomType} room(s).`
        );

      console.info(
        "AURELIA_HOTEL_WHATSAPP_RESULT",
        bookingReference,
        hotelWhatsAppResult
      );
    } catch (notificationError) {
      console.error(
        "AURELIA_HOTEL_WHATSAPP_FAILED",
        bookingReference,
        notificationError
      );
    }

    // 10. Guest transactional update
    const guestUpdate =
      `The Aurelia: We received your stay request ${bookingReference} for ${payload.checkIn} to ${payload.checkOut}. This is not yet a confirmed booking. Our team will review it and contact you.`;

    // 11. Guest WhatsApp update
    if (
      payload.whatsappMarketingConsent ||
      payload.transactionalConsent
    ) {
      try {
        const whatsappResult = await sendWhatsAppText(
          payload.phone.replace(/[^0-9]/g, ""),
          guestUpdate
        );

        console.info(
          "AURELIA_GUEST_WHATSAPP_RESULT",
          bookingReference,
          whatsappResult
        );
      } catch (notificationError) {
        console.error(
          "AURELIA_GUEST_WHATSAPP_FAILED",
          bookingReference,
          notificationError
        );
      }
    }

    // 12. Guest SMS update
    if (payload.transactionalConsent) {
      try {
        const smsResult = await sendGuestSMS(
          payload.phone,
          guestUpdate
        );

        console.info(
          "AURELIA_GUEST_SMS_RESULT",
          bookingReference,
          smsResult
        );
      } catch (notificationError) {
        console.error(
          "AURELIA_GUEST_SMS_FAILED",
          bookingReference,
          notificationError
        );
      }
    }

    // 13. Return successful reservation response
    return NextResponse.json(
      {
        ok: true,
        id: data.id,
        reference: bookingReference,
        status: "PENDING_APPROVAL",
        message:
          "Your request has been received. The hotel will review availability and contact you.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "AURELIA_RESERVATION_API_ERROR",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to submit reservation.";

    const status = message.includes(
      "Supabase is not configured"
    )
      ? 503
      : 400;

    return NextResponse.json(
      {
        ok: false,
        error:
          status === 503
            ? "Online reservations are not activated yet. Please contact the hotel."
            : message,
      },
      { status }
    );
  }
}
