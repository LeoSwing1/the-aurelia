
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { env } from "@/lib/env";
import {
  sendGuestEmail,
  sendHotelWhatsAppAlert,
  escapeHtml,
} from "@/lib/notifications";

export const runtime = "nodejs";

const schema = z.object({
  totalAmount: z.number().positive(),
  pricingBreakdown: z.record(z.string(), z.unknown()).optional(),
  frontDeskNotes: z.string().max(2000).optional(),
});

type Guest = {
  full_name: string | null;
  email: string | null;
  phone?: string | null;
};

type RoomType = {
  name: string;
};

type Reservation = {
  id: string;
  booking_reference: string;
  check_in: string;
  check_out: string;
  room_quantity: number;
  adults: number;
  children: number;
  total_amount: number | string;
  currency: string | null;
  payment_expires_at: string | null;
  pricing_breakdown: Record<string, unknown> | null;
  guests: Guest | Guest[] | null;
  room_types: RoomType | RoomType[] | null;
};

const money = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);

function approvalEmail(input: {
  guestName: string;
  reference: string;
  checkIn: string;
  checkOut: string;
  roomName: string;
  rooms: number;
  adults: number;
  children: number;
  amount: number;
  currency: string;
  deadline: string;
  paymentUrl: string;
}) {
  const e = escapeHtml;
  const amount = money(input.amount, input.currency);

  const date = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta charset="UTF-8">
</head>
<body style="margin:0;padding:0;background:#f3f0e9;font-family:Georgia,'Times New Roman',serif;color:#26352e;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
    style="background:#f3f0e9;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="max-width:620px;background:#fffdf8;border:1px solid #e8dfcf;">

          <tr>
            <td align="center"
              style="background:#172820;padding:38px 24px 34px;">
              <div style="font-size:12px;letter-spacing:4px;color:#d8bf8c;">
                THE AURELIA
              </div>
              <div style="font-size:12px;letter-spacing:2px;color:#e8e1d4;margin-top:9px;">
                HOTEL &amp; RESORT
              </div>
              <div style="height:1px;width:54px;background:#b99b64;margin:23px auto;"></div>
              <h1 style="font-size:34px;font-weight:normal;line-height:1.2;color:#fff8e9;margin:0;">
                Your stay awaits.
              </h1>
              <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#e2dfd5;margin:15px 0 0;">
                Your reservation request has been approved.
                Complete payment to secure your stay.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:34px 32px 12px;">
              <p style="font-size:17px;margin:0 0 12px;">
                Dear ${e(input.guestName)},
              </p>
              <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#626b63;margin:0;">
                We are delighted to let you know that our team has
                approved your reservation request. Your stay is now
                awaiting payment confirmation.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px;">
              <div style="border:1px solid #e8dfcf;padding:23px;">
                <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#a18758;">
                  YOUR RESERVATION
                </div>
                <div style="font-size:21px;margin-top:9px;color:#26352e;">
                  ${e(input.reference)}
                </div>

                <div style="height:1px;background:#e8dfcf;margin:20px 0;"></div>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                  style="font-family:Arial,sans-serif;font-size:13px;line-height:1.8;">
                  <tr>
                    <td style="color:#7a817b;padding:5px 0;">Check-in</td>
                    <td align="right">${e(date(input.checkIn))}</td>
                  </tr>
                  <tr>
                    <td style="color:#7a817b;padding:5px 0;">Check-out</td>
                    <td align="right">${e(date(input.checkOut))}</td>
                  </tr>
                  <tr>
                    <td style="color:#7a817b;padding:5px 0;">Room category</td>
                    <td align="right">${e(input.roomName)}</td>
                  </tr>
                  <tr>
                    <td style="color:#7a817b;padding:5px 0;">Rooms</td>
                    <td align="right">${input.rooms}</td>
                  </tr>
                  <tr>
                    <td style="color:#7a817b;padding:5px 0;">Guests</td>
                    <td align="right">${input.adults} adults, ${input.children} children</td>
                  </tr>
                </table>

                <div style="height:1px;background:#e8dfcf;margin:19px 0;"></div>

                <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;color:#8a8e85;">
                  TOTAL AMOUNT PAYABLE
                </div>
                <div style="font-size:32px;color:#9a7945;margin-top:7px;">
                  ${e(amount)}
                </div>
                <p style="font-family:Arial,sans-serif;font-size:12px;color:#7a817b;margin:7px 0 0;">
                  Full payment required to confirm your reservation.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:10px 32px 25px;">
              <p style="font-family:Arial,sans-serif;font-size:13px;color:#626b63;line-height:1.7;">
                Your payment window closes:
              </p>
              <p style="font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#26352e;">
                ${e(input.deadline)}
              </p>

              <a href="${e(input.paymentUrl)}"
                style="display:inline-block;background:#b3935e;color:#ffffff;text-decoration:none;padding:17px 30px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:1.4px;font-weight:bold;">
                PROCEED TO SECURE PAYMENT
              </a>

              <p style="font-family:Arial,sans-serif;font-size:11px;color:#858a82;line-height:1.7;margin-top:18px;">
                If the button does not work, copy and paste this link into your browser:
                <br>
                <a href="${e(input.paymentUrl)}" style="color:#8e7448;word-break:break-all;">
                  ${e(input.paymentUrl)}
                </a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#172820;padding:25px 28px;text-align:center;">
              <div style="font-size:18px;color:#e4d2ad;">The Aurelia</div>
              <p style="font-family:Arial,sans-serif;font-size:11px;line-height:1.7;color:#d2d4cc;margin:10px 0 0;">
                We look forward to welcoming you.
                <br>
                This reservation is confirmed only after successful payment verification.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify staff authentication.
    const session = await createClient();
    const {
      data: { user },
    } = await session.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { data: profile } = await session
      .from("profiles")
      .select("role,active")
      .eq("id", user.id)
      .single();

    if (
      !profile?.active ||
      !["SUPER_ADMIN", "GENERAL_MANAGER", "RECEPTION", "FINANCE"].includes(
        profile.role
      )
    ) {
      return NextResponse.json(
        { error: "Not authorised." },
        { status: 403 }
      );
    }

    // 2. Validate the approved pricing.
    const input = schema.parse(await request.json());
    const { id } = await params;
    const db = createAdminClient();

    // 3. Approve the reservation and establish the payment hold.
    const { data, error } = await db.rpc(
      "approve_reservation_detailed",
      {
        p_reservation_id: id,
        p_total_amount: input.totalAmount,
        p_actor: user.id,
        p_pricing_breakdown: input.pricingBreakdown || {},
        p_front_desk_notes: input.frontDeskNotes || null,
      }
    );

    if (error) throw error;

    // 4. Fetch the saved reservation after approval.
    const { data: reservation, error: reservationError } = await db
      .from("reservations")
      .select(`
        id,
        booking_reference,
        check_in,
        check_out,
        room_quantity,
        adults,
        children,
        total_amount,
        currency,
        payment_expires_at,
        pricing_breakdown,
        guests(full_name,email,phone),
        room_types(name)
      `)
      .eq("id", id)
      .single();

    if (reservationError || !reservation) {
      console.error("AURELIA_APPROVAL_RESERVATION_FETCH_FAILED", {
        id,
        error: reservationError,
      });

      return NextResponse.json({
        ok: true,
        ...data,
        notification: "Reservation approved, but email details could not be loaded.",
      });
    }

    const row = reservation as unknown as Reservation;
    const guest = Array.isArray(row.guests)
      ? row.guests[0]
      : row.guests;
    const room = Array.isArray(row.room_types)
      ? row.room_types[0]
      : row.room_types;

    // 5. Send the premium payment email.
    let emailSent = false;

    if (guest?.email && row.payment_expires_at) {
      const paymentUrl = new URL("/pay", env.siteUrl);
      paymentUrl.searchParams.set("reference", row.booking_reference);
      paymentUrl.searchParams.set("email", guest.email);

      const deadline = new Date(row.payment_expires_at).toLocaleString(
        "en-IN",
        {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Kolkata",
        }
      );

      try {
        const emailResult = await sendGuestEmail(
          guest.email,
          "Your Aurelia stay is approved — complete your payment",
          approvalEmail({
            guestName: guest.full_name || "Guest",
            reference: row.booking_reference,
            checkIn: row.check_in,
            checkOut: row.check_out,
            roomName: room?.name || "Selected room category",
            rooms: row.room_quantity,
            adults: row.adults,
            children: row.children,
            amount: Number(row.total_amount),
            currency: row.currency || "INR",
            deadline,
            paymentUrl: paymentUrl.toString(),
          })
        );

        emailSent = emailResult.sent;

        console.info("AURELIA_APPROVAL_EMAIL_RESULT", {
          reference: row.booking_reference,
          recipient: guest.email,
          result: emailResult,
        });
      } catch (mailError) {
        console.error("AURELIA_APPROVAL_EMAIL_FAILED", {
          reference: row.booking_reference,
          error: mailError,
        });
      }
    }

    // 6. Notify the hotel independently.
    try {
      await sendHotelWhatsAppAlert(
        `Reservation ${row.booking_reference} approved. Guest must complete payment of ${money(Number(row.total_amount), row.currency || "INR")} within 24 hours.`
      );
    } catch (alertError) {
      console.error("AURELIA_APPROVAL_WHATSAPP_FAILED", alertError);
    }

    // 7. Return approval status without treating email delivery as payment.
    return NextResponse.json({
      ok: true,
      ...data,
      emailSent,
      paymentExpiresAt: row.payment_expires_at,
    });
  } catch (error) {
    console.error("AURELIA_RESERVATION_APPROVAL_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Approval failed.",
      },
      { status: 400 }
    );
  }
}
