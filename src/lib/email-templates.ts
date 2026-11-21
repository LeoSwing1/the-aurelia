import { escapeHtml } from "@/lib/notifications";

const money = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);

const DEFAULT_FOOTER = "We look forward to welcoming you.<br>\n          Please keep your reservation reference for future communication.";

function shell(title: string, preheader: string, content: string, footer: string = DEFAULT_FOOTER) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f0e9;color:#26352e;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f0e9;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fffdf8;border:1px solid #e8dfcf;">
        <tr><td align="center" style="background:#172820;padding:32px 22px;">
          <div style="font-family:Georgia,serif;font-size:25px;letter-spacing:4px;color:#f7f0e3;">THE AURELIA</div>
          <div style="font-size:10px;letter-spacing:3px;color:#d8bf8c;margin-top:8px;">HOTEL &amp; RESORT</div>
          <div style="height:1px;width:48px;background:#b99b64;margin:20px auto 0;"></div>
        </td></tr>
        <tr><td style="padding:30px 32px 12px;">
          <h1 style="font-family:Georgia,serif;font-size:29px;font-weight:normal;line-height:1.25;margin:0 0 14px;color:#26352e;">${title}</h1>
          ${content}
        </td></tr>
        <tr><td align="center" style="background:#172820;padding:22px 24px;color:#d8d8ce;font-size:11px;line-height:1.7;">
          <span style="font-family:Georgia,serif;font-size:17px;color:#e4d2ad;">The Aurelia</span><br>
          ${footer}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function details(rows: Array<[string, string]>) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e8dfcf;padding:14px 18px;margin:22px 0;font-size:13px;line-height:1.8;">
    ${rows.map(([label, value]) => `<tr><td style="padding:5px 0;color:#7a817b;">${escapeHtml(label)}</td><td align="right" style="padding:5px 0;color:#26352e;font-weight:600;">${escapeHtml(value)}</td></tr>`).join("")}
  </table>`;
}

export function reservationReceivedEmail(input: {
  guestName: string; reference: string; checkIn: string; checkOut: string;
  roomType: string; rooms: number; adults: number; children: number;
}) {
  const content = `
    <p style="font-size:15px;line-height:1.8;">Dear ${escapeHtml(input.guestName)},</p>
    <p style="font-size:14px;line-height:1.8;color:#626b63;">Thank you for choosing The Aurelia Hotel &amp; Resort. We have received your reservation request and our team will review availability before approving your stay.</p>
    <div style="background:#f7f3eb;border-left:3px solid #b3935e;padding:15px 18px;margin:22px 0;">
      <div style="font-size:10px;letter-spacing:2px;color:#9a7945;">BOOKING REFERENCE</div>
      <div style="font-family:Georgia,serif;font-size:22px;margin-top:7px;">${escapeHtml(input.reference)}</div>
    </div>
    ${details([
      ["Check-in", input.checkIn], ["Check-out", input.checkOut],
      ["Room category", input.roomType], ["Rooms", String(input.rooms)],
      ["Guests", `${input.adults} adults, ${input.children} children`],
    ])}
    <p style="font-size:13px;line-height:1.8;color:#626b63;">This email confirms receipt of your request only; it is not a confirmed reservation. If approved, you will receive a separate email with the final amount and a secure payment link. Full payment will be required within the stated payment window.</p>
    <p style="font-size:14px;line-height:1.8;">Warm regards,<br><strong>The Aurelia Hotel &amp; Resort</strong></p>`;
  return shell("We received your stay request.", "Your Aurelia reservation request has been received.", content);
}

export function paymentConfirmedEmail(input: {
  guestName: string; reference: string; amount: number; currency: string;
  paymentId?: string;
}) {
  const content = `
    <p style="font-size:15px;line-height:1.8;">Dear ${escapeHtml(input.guestName)},</p>
    <p style="font-size:14px;line-height:1.8;color:#626b63;">Your payment has been verified successfully. Your reservation is now confirmed in The Aurelia system. We look forward to welcoming you.</p>
    <div style="background:#f7f3eb;border-left:3px solid #b3935e;padding:16px 18px;margin:22px 0;">
      <div style="font-size:10px;letter-spacing:2px;color:#9a7945;">RESERVATION CONFIRMED</div>
      <div style="font-family:Georgia,serif;font-size:22px;margin-top:7px;">${escapeHtml(input.reference)}</div>
      <div style="font-size:23px;color:#9a7945;margin-top:12px;">${escapeHtml(money(input.amount, input.currency))}</div>
    </div>
    ${input.paymentId ? `<p style="font-size:12px;color:#737b73;">Payment reference: ${escapeHtml(input.paymentId)}</p>` : ""}
    <p style="font-size:13px;line-height:1.8;color:#626b63;">Please retain this email and your reservation reference for check-in. If you need assistance, contact the hotel using its published contact details.</p>
    <p style="font-size:14px;line-height:1.8;">Warm regards,<br><strong>The Aurelia Hotel &amp; Resort</strong></p>`;
  return shell("Your stay is confirmed.", "Your payment has been verified and your Aurelia reservation is confirmed.", content);
}

export function hotelNoticeEmail(input: {
  title: string; intro: string; rows: Array<[string, string]>;
}) {
  const content = `<p style="font-size:14px;line-height:1.8;color:#626b63;">${escapeHtml(input.intro)}</p>${details(input.rows)}`;
  return shell(escapeHtml(input.title), input.intro, content);
}

/**
 * Post-stay Google review request. Same message for every checked-out guest (no review gating,
 * no incentives), as Google's review policy requires.
 */
export function googleReviewRequestEmail(input: {
  guestName: string; reference: string; checkIn: string; checkOut: string; reviewUrl: string;
}) {
  const reviewUrl = escapeHtml(input.reviewUrl);
  const content = `
    <p style="font-size:15px;line-height:1.8;">Dear ${escapeHtml(input.guestName)},</p>
    <p style="font-size:14px;line-height:1.8;color:#626b63;">Thank you for staying with us at The Aurelia Hotel &amp; Resort. We hope your time with us was comfortable and that you are travelling home with good memories.</p>
    <p style="font-size:14px;line-height:1.8;color:#626b63;">Would you take a minute to share your experience on Google? Your honest review helps future guests plan their stay, and it helps our team keep improving.</p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px auto;">
      <tr><td align="center" style="background:#172820;">
        <a href="${reviewUrl}" target="_blank" rel="noopener" style="display:inline-block;padding:15px 30px;font-size:12px;letter-spacing:2px;color:#f7f0e3;text-decoration:none;font-weight:bold;">WRITE A GOOGLE REVIEW</a>
      </td></tr>
    </table>
    ${details([["Stay", `${input.checkIn} to ${input.checkOut}`], ["Reference", input.reference]])}
    <p style="font-size:13px;line-height:1.8;color:#626b63;">If anything during your stay did not meet your expectations, you can also reply to this email and our management team will personally look into it.</p>
    <p style="font-size:12px;line-height:1.7;color:#8a918b;">Button not working? Copy this link into your browser:<br><a href="${reviewUrl}" style="color:#9a7945;word-break:break-all;">${reviewUrl}</a></p>
    <p style="font-size:14px;line-height:1.8;">With gratitude,<br><strong>The Aurelia Hotel &amp; Resort</strong></p>`;
  return shell(
    "Thank you for staying with us.",
    "How was your stay at The Aurelia? Share your experience on Google.",
    content,
    "Thank you for choosing The Aurelia.<br>\n          We hope to welcome you back soon.",
  );
}
