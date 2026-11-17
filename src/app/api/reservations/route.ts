
import { NextRequest, NextResponse } from "next/server";
import { reservationSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  sendHotelEmail,
  sendHotelWhatsAppAlert,
  sendGuestEmail,
  sendWhatsAppText,
  sendGuestSMS,
  escapeHtml,
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
    const hotelEmailHtml = `
      <h2>New reservation request</h2>

      <p><strong>Reference:</strong>
        ${escapeHtml(bookingReference)}
      </p>

      <p><strong>Guest:</strong>
        ${escapeHtml(payload.name)}
      </p>

      <p><strong>Email:</strong>
        ${escapeHtml(payload.email)}
      </p>

      <p><strong>Phone:</strong>
        ${escapeHtml(payload.phone)}
      </p>

      <p><strong>Stay:</strong>
        ${escapeHtml(payload.checkIn)}
        to
        ${escapeHtml(payload.checkOut)}
      </p>

      <p><strong>Room category:</strong>
        ${escapeHtml(payload.roomType)}
      </p>

      <p><strong>Rooms:</strong>
        ${payload.rooms}
      </p>

      <p><strong>Adults:</strong>
        ${payload.adults}
      </p>

      <p><strong>Children:</strong>
        ${payload.children}
      </p>

      <p><strong>Special requests:</strong>
        ${escapeHtml(payload.message || "None")}
      </p>

      <p><strong>Status:</strong>
        Pending approval
      </p>
    `;

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
    const guestEmailHtml = `
      <h2>We received your stay request</h2>

      <p>Dear ${escapeHtml(payload.name)},</p>

      <p>
        Thank you for contacting
        The Aurelia Hotel &amp; Resort.
      </p>

      <p>
        We have successfully received your room request.
      </p>

      <p>
        <strong>Your booking reference:</strong>
        ${escapeHtml(bookingReference)}
      </p>

      <p><strong>Check-in:</strong>
        ${escapeHtml(payload.checkIn)}
      </p>

      <p><strong>Check-out:</strong>
        ${escapeHtml(payload.checkOut)}
      </p>

      <p><strong>Room category:</strong>
        ${escapeHtml(payload.roomType)}
      </p>

      <p><strong>Rooms:</strong>
        ${payload.rooms}
      </p>

      <p>
        This is a request, not a confirmed reservation.
      </p>

      <p>
        Our team will review availability and contact you.
      </p>

      <p>
        If approved, full payment is due within 24 hours.
      </p>

      <p>
        Thank you,<br />
        The Aurelia Hotel &amp; Resort
      </p>
    `;

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
